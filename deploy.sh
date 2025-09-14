#!/bin/bash

# Cloud Run deployment script for Translagent
# Exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Translagent deployment process...${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please create a .env file with the required configuration variables. You can use sample.env as a starting point."
    exit 1
fi

# Source the .env file
source .env

# Validate required configuration variables
if [ -z "$PROJECT_ID" ] || [ -z "$IMAGE_NAME" ] || [ -z "$SERVICE_NAME" ] || [ -z "$REGION" ]; then
    echo -e "${RED}❌ Error: Required configuration variables are not set in .env${NC}"
    echo "Please ensure your .env file contains:"
    echo "  - PROJECT_ID"
    echo "  - IMAGE_NAME"
    echo "  - SERVICE_NAME"
    echo "  - REGION"
    echo "  - ARTIFACT_REGISTRY_LOCATION (optional, defaults to REGION)"
    exit 1
fi

# Set default Artifact Registry location if not provided
ARTIFACT_REGISTRY_LOCATION=${ARTIFACT_REGISTRY_LOCATION:-$REGION}

# Use Artifact Registry instead of GCR
DOCKER_IMAGE="$ARTIFACT_REGISTRY_LOCATION-docker.pkg.dev/$PROJECT_ID/$IMAGE_NAME/$IMAGE_NAME"

echo -e "${GREEN}📋 Configuration:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Image Name: $IMAGE_NAME"
echo "  Service Name: $SERVICE_NAME"
echo "  Region: $REGION"
echo "  Registry Location: $ARTIFACT_REGISTRY_LOCATION"
echo "  Docker Image: $DOCKER_IMAGE"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Error: gcloud CLI is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Error: Docker is not installed${NC}"
    echo "Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi

# Configure Docker for Artifact Registry
echo -e "${GREEN}🔧 Configuring Docker for Artifact Registry...${NC}"
gcloud auth configure-docker $ARTIFACT_REGISTRY_LOCATION-docker.pkg.dev

# Check if Artifact Registry repository exists
echo -e "${GREEN}🔍 Checking Artifact Registry repository...${NC}"
if ! gcloud artifacts repositories describe $IMAGE_NAME --location=$ARTIFACT_REGISTRY_LOCATION --project=$PROJECT_ID &>/dev/null; then
    echo -e "${YELLOW}⚠️  Artifact Registry repository '$IMAGE_NAME' not found. Creating it...${NC}"
    gcloud artifacts repositories create $IMAGE_NAME \
        --repository-format=docker \
        --location=$ARTIFACT_REGISTRY_LOCATION \
        --project=$PROJECT_ID \
        --description="Docker repository for $SERVICE_NAME"
    echo -e "${GREEN}✅ Repository created successfully${NC}"
fi

# Build Docker image
echo -e "${GREEN}📦 Building Docker image...${NC}"
# Try to build with buildx and push directly. Some buildx setups don't create a local image tag, so we attempt to load locally as a fallback.
if docker buildx build --platform linux/amd64 --no-cache -t $DOCKER_IMAGE --push .; then
    echo -e "${GREEN}⬆️  Image built and pushed using buildx${NC}"
else
    echo -e "${YELLOW}⚠️  buildx push failed; attempting buildx --load to produce a local image...${NC}"
    if docker buildx build --platform linux/amd64 --no-cache -t $DOCKER_IMAGE --load .; then
        echo -e "${GREEN}✅ buildx --load succeeded, image available locally${NC}"
        echo -e "${GREEN}⬆️  Pushing image to Artifact Registry...${NC}"
        docker push $DOCKER_IMAGE
    else
        echo -e "${YELLOW}⚠️  buildx --load failed; falling back to regular docker build...${NC}"
        if docker build -t $DOCKER_IMAGE .; then
            echo -e "${GREEN}✅ docker build succeeded${NC}"
            echo -e "${GREEN}⬆️  Pushing image to Artifact Registry...${NC}"
            docker push $DOCKER_IMAGE
        else
            echo -e "${RED}❌ Error: Docker build failed${NC}"
            exit 1
        fi
    fi
fi

# Read environment variables from .env file and format them for gcloud
echo -e "${GREEN}🔧 Processing environment variables...${NC}"
ENV_VARS=""
while IFS='=' read -r key value; do
    # Skip empty lines, comments, deployment configuration variables, and reserved Cloud Run variables
    [[ -z $key || $key =~ ^#.*$ || $key == "PROJECT_ID" || $key == "IMAGE_NAME" || $key == "SERVICE_NAME" || $key == "REGION" || $key == "ARTIFACT_REGISTRY_LOCATION" || $key == "PORT" ]] && continue
    # Remove quotes from value if present
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//')
    ENV_VARS="$ENV_VARS,$key=$value"
done < .env

# Remove leading comma
ENV_VARS=${ENV_VARS#","}

# Deploy to Cloud Run
echo -e "${GREEN}🚀 Deploying to Cloud Run...${NC}"
# Note: PORT is automatically set by Cloud Run, we just specify which port the container listens on
CONTAINER_PORT=${PORT:-3000}
echo -e "${GREEN}📋 Container will listen on port: $CONTAINER_PORT${NC}"

gcloud run deploy "$SERVICE_NAME" \
    --image "$DOCKER_IMAGE" \
    --project $PROJECT_ID \
    --platform managed \
    --region "$REGION" \
    --port $CONTAINER_PORT \
    --set-env-vars "$ENV_VARS" \
    --allow-unauthenticated

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format="value(status.url)")

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Service URL: $SERVICE_URL${NC}"
echo ""
echo -e "${GREEN}🎯 Your Translagent service is now live and ready to use!${NC}"
#!/bin/bash

# Load environment variables from .env file
set -a
source ./.env
set +a

# Build the Docker image
docker buildx build --platform linux/amd64 -t gcr.io/${GCP_ID}/${APP_NAME} .

# Push to Google Container Registry
docker push gcr.io/${GCP_ID}/${APP_NAME}

# Deploy to Cloud Run with environment variables from .env
gcloud run deploy ${APP_NAME} \
  --image gcr.io/${GCP_ID}/${APP_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${GCP_ID} \
  --set-env-vars="OPENAI_API_KEY=${OPENAI_API_KEY}" \
  --set-env-vars="ORG_ID=${ORG_ID}"
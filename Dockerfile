# Stage 1: Build stage
FROM oven/bun:1.0-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
RUN bun install --no-frozen-lockfile

# Copy source code and config
COPY tsconfig.json ./
COPY src ./src/

# Stage 2: Production stage
FROM oven/bun:1.0-alpine

WORKDIR /app

# Copy only what's needed from the builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/src ./src
COPY public ./public

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose the port
EXPOSE 3001

# Set the command to run the application
CMD ["bun", "src/app.ts"]
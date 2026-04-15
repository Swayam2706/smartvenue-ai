# Multi-stage build for optimized production image
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Accept build arguments
ARG VITE_API_URL
ARG VITE_WS_URL

# Create .env file with build args
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env && \
    echo "VITE_WS_URL=${VITE_WS_URL}" >> .env

# Copy source code
COPY . .

# Build the app (will use .env file)
RUN npm run build

# Production stage - use nginx to serve static files
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8080 (Cloud Run requirement)
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

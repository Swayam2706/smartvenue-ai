#!/bin/bash
# ============================================================
# SmartVenue AI — Full Stack Google Cloud Deployment Script
# Run: bash deploy.sh
# ============================================================

set -e  # Exit on any error

# ---- CONFIGURE THESE ----
PROJECT_ID="your-gcp-project-id"       # e.g. smartvenue-ai-12345
REGION="us-central1"
BACKEND_SERVICE="smartvenue-backend"
FRONTEND_SERVICE="smartvenue-frontend"

# ---- ENV VARS (set these before running) ----
JWT_SECRET="${JWT_SECRET:-change_this_secret_$(openssl rand -hex 16)}"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"
FIREBASE_API_KEY="${FIREBASE_API_KEY:-}"
FIREBASE_AUTH_DOMAIN="${FIREBASE_AUTH_DOMAIN:-}"
FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-$PROJECT_ID}"
FIREBASE_STORAGE_BUCKET="${FIREBASE_STORAGE_BUCKET:-}"
FIREBASE_MESSAGING_SENDER_ID="${FIREBASE_MESSAGING_SENDER_ID:-}"
FIREBASE_APP_ID="${FIREBASE_APP_ID:-}"

echo "🚀 Deploying SmartVenue AI Full Stack to Google Cloud..."
echo "   Project: $PROJECT_ID"
echo "   Region:  $REGION"
echo ""

# Step 1: Set project
gcloud config set project $PROJECT_ID

# Step 2: Enable required APIs
echo "📡 Enabling Cloud APIs..."
gcloud services enable \
  run.googleapis.com \
  containerregistry.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com

# ============================================================
# BACKEND DEPLOYMENT
# ============================================================
echo ""
echo "🔧 [1/2] Deploying Backend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Build and push backend image
echo "🐳 Building backend Docker image..."
gcloud builds submit \
  --tag gcr.io/$PROJECT_ID/$BACKEND_SERVICE:latest \
  ./backend

# Deploy backend to Cloud Run
echo "☁️  Deploying backend to Cloud Run..."
gcloud run deploy $BACKEND_SERVICE \
  --image=gcr.io/$PROJECT_ID/$BACKEND_SERVICE:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --min-instances=0 \
  --max-instances=2 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=3600 \
  --set-env-vars="NODE_ENV=production,JWT_SECRET=$JWT_SECRET,GEMINI_API_KEY=$GEMINI_API_KEY"

# Get backend URL
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE \
  --region=$REGION \
  --format='value(status.url)')

echo "✅ Backend deployed: $BACKEND_URL"

# ============================================================
# FRONTEND DEPLOYMENT
# ============================================================
echo ""
echo "🎨 [2/2] Deploying Frontend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Prepare API URLs
API_URL="$BACKEND_URL/api"
WS_URL="${BACKEND_URL/https/wss}/ws"

# Build and push frontend image with environment variables
echo "🐳 Building frontend Docker image..."
gcloud builds submit \
  --tag gcr.io/$PROJECT_ID/$FRONTEND_SERVICE:latest \
  --build-arg VITE_API_URL=$API_URL \
  --build-arg VITE_WS_URL=$WS_URL \
  --build-arg VITE_FIREBASE_API_KEY=$FIREBASE_API_KEY \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=$FIREBASE_AUTH_DOMAIN \
  --build-arg VITE_FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET=$FIREBASE_STORAGE_BUCKET \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=$FIREBASE_MESSAGING_SENDER_ID \
  --build-arg VITE_FIREBASE_APP_ID=$FIREBASE_APP_ID \
  ./frontend

# Deploy frontend to Cloud Run
echo "☁️  Deploying frontend to Cloud Run..."
gcloud run deploy $FRONTEND_SERVICE \
  --image=gcr.io/$PROJECT_ID/$FRONTEND_SERVICE:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --min-instances=0 \
  --max-instances=3 \
  --memory=256Mi \
  --cpu=1

# Get frontend URL
FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE \
  --region=$REGION \
  --format='value(status.url)')

# Update backend with frontend URL
echo "🔄 Updating backend with frontend URL..."
gcloud run services update $BACKEND_SERVICE \
  --region=$REGION \
  --update-env-vars="FRONTEND_URL=$FRONTEND_URL"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: $FRONTEND_URL"
echo "   Backend:  $BACKEND_URL"
echo ""
echo "📋 API Endpoints:"
echo "   REST API: $API_URL"
echo "   WebSocket: $WS_URL"
echo ""
echo "🔐 Demo Login:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📊 Monitor your services:"
echo "   gcloud run services list --region=$REGION"
echo ""

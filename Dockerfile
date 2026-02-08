# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./

# VITE_ env vars must be available at build time
# Railway: set these as env vars, they're passed via ARG
ARG VITE_FIREBASE_API_KEY=""
ARG VITE_FIREBASE_AUTH_DOMAIN=""
ARG VITE_FIREBASE_PROJECT_ID=""
ARG VITE_API_BASE_URL=""
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# Verify frontend built successfully
RUN test -f dist/index.html || (echo "ERROR: Frontend build failed - dist/index.html not found" && exit 1)

# Stage 2: Build backend
FROM node:22-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate && npm run build

# Verify backend built successfully
RUN test -f dist/index.js || (echo "ERROR: Backend build failed - dist/index.js not found" && exit 1)

# Stage 3: Production — use full Node image for native module compatibility (sodium-native, prisma)
FROM node:22-bookworm-slim
WORKDIR /app

# Disable Prisma update checker (hangs db push in containers)
ENV CHECKPOINT_DISABLE=1

# Install build tools for native modules (sodium-native) + OpenSSL for Prisma
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends openssl ca-certificates python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Copy backend package files and install production deps (compiles native modules for glibc)
COPY backend/package*.json ./
COPY backend/prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

# Remove build tools to keep image smaller
RUN apt-get purge -y python3 make g++ && apt-get autoremove -y

# Copy backend build output
COPY --from=backend-build /app/backend/dist ./dist

# Copy frontend build output into backend's static directory
COPY --from=frontend-build /app/frontend/dist ./dist/frontend

# Verify production image has all required files
RUN test -f dist/index.js && test -f dist/frontend/index.html || (echo "ERROR: Missing required files in production image" && exit 1)

EXPOSE 3000

CMD ["node", "dist/start.js"]

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
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

RUN npm run build && echo "--- Frontend build output ---" && ls -la dist/ && echo "--- index.html check ---" && cat dist/index.html | head -5

# Stage 2: Build backend
FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate && npm run build

# Stage 3: Production
FROM node:20-alpine
WORKDIR /app

# Copy backend package files and install production deps
COPY backend/package*.json ./
COPY backend/prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

# Copy backend build output
COPY --from=backend-build /app/backend/dist ./dist

# Copy frontend build output into backend's static directory
COPY --from=frontend-build /app/frontend/dist ./dist/frontend

# Verify frontend files are present
RUN echo "--- Production dist contents ---" && ls -la dist/ && echo "--- Frontend dir ---" && ls -la dist/frontend/ && echo "--- Verify index.html ---" && test -f dist/frontend/index.html && echo "OK: index.html exists" || (echo "FAIL: index.html missing" && exit 1)

EXPOSE 3000

CMD ["node", "dist/index.js"]

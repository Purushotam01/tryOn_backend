# TryFit Backend - Docker Deployment Guide

This guide provides end-to-end instructions for deploying the **TryFit Cloud Backend** using Docker, Docker Compose, and modern cloud container platforms.

---

## 🏗️ Architecture & Component Overview

The TryFit Backend is a **Node.js (Express)** microservice designed for high throughput, stateless scaling, and multi-tenant mobile clients:

1. **Application Layer (`tryfit-backend`):**
   - **Framework:** Node.js 20 LTS (Alpine Linux) with Express 5.
   - **Port:** `3000` (configurable via `PORT`).
   - **Init & Signals:** Wrapped with `tini` for PID 1 signal forwarding (`SIGTERM` / `SIGINT`).
   - **Security:** Hardened with `helmet`, CORS, unprivileged user `node`, and rate limiting.
   - **Health Endpoint:** `GET /api/v1/health` verified by Docker `HEALTHCHECK`.

2. **Persistence Strategy:**
   - **Primary Cloud Store:** Firebase Admin SDK (Firestore & Firebase Storage) with an in-memory fallback for offline/local development.
   - **Relational DB:** MySQL 8.0 for phone/OTP authentication, user profiles, and JWT issuance.

---

## 📁 Docker Files Created

| File | Location | Purpose |
|---|---|---|
| `Dockerfile` | `tryon-backend/Dockerfile` | Production multi-stage Alpine build with non-root user `node` and health check. |
| `.dockerignore` | `tryon-backend/.dockerignore` | Excludes secrets, node_modules, git, and tests from build context. |
| `docker-compose.yml` | `tryon-backend/docker-compose.yml` | Full-stack orchestration (Backend + MySQL 8.0 + persistent volume + healthcheck dependency). |
| `docker-compose.yml` | `tryON/docker-compose.yml` | Git root compose file mapping directly to `./tryon-backend`. |
| `.env.docker.example` | `tryon-backend/.env.docker.example` | Template for container environment variables. |

---

## 🚀 Quick Start with Docker Compose

### 1. Configure Environment
Copy the example Docker environment file:
```bash
cd tryon-backend
cp .env.docker.example .env
```
*(Update your credentials if using real Firebase or external APIs).*

### 2. Start Full Stack (Backend + MySQL)
```bash
docker compose up -d --build
```

### 3. Verify Containers & Health Status
```bash
docker compose ps
```
Both `tryfit-backend` and `tryfit-mysql` will show status `healthy`.

### 4. Test the API
```bash
curl http://localhost:3000/api/v1/health
```
Response:
```json
{
  "success": true,
  "data": {
    "status": "ONLINE",
    "version": "1.0.0",
    "service": "TryFit Backend Service",
    "timestamp": "2026-10-19T..."
  },
  "message": null,
  "error": null
}
```

### 5. View Logs & Stop
```bash
# View backend logs in real-time
docker compose logs -f backend

# Stop services cleanly
docker compose down
```

---

## 🐳 Standalone Docker Container Deployment

If you are using managed databases (e.g. AWS RDS MySQL, Google Cloud SQL, or PlanetScale) and managed Firebase:

### 1. Build the Production Image
```bash
cd tryon-backend
docker build -t tryfit-backend:latest .
```

### 2. Run the Container
```bash
docker run -d \
  --name tryfit-backend \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e MYSQL_HOST=your-rds-host.amazonaws.com \
  -e MYSQL_USER=admin \
  -e MYSQL_PASSWORD=your_password \
  -e MYSQL_DATABASE=tryfit_db \
  -e JWT_SECRET=your_jwt_secret \
  -e FIREBASE_PROJECT_ID=your-project-id \
  -e FIREBASE_CLIENT_EMAIL=your-service-account-email \
  -e FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..." \
  -e FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com \
  -e TRYONCLOUD_API_KEY=your_key \
  tryfit-backend:latest
```

---

## ☁️ Cloud Deployment Strategies

### Google Cloud Run / AWS App Runner / Azure Container Apps
Because the backend is stateless and handles file uploads in memory before streaming to Firebase Storage, it is an ideal fit for serverless containers:
- **Port:** Listen on environment variable `PORT` (automatically supported).
- **Health Check Path:** `/api/v1/health`.
- **Concurrency:** 80-100 requests per container instance.
- **CPU / Memory:** 1 vCPU, 512MB - 1GB RAM.

### Kubernetes Manifest Snippet
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tryfit-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tryfit-backend
  template:
    metadata:
      labels:
        app: tryfit-backend
    spec:
      containers:
      - name: tryfit-backend
        image: your-registry/tryfit-backend:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 3000
          initialDelaySeconds: 15
          periodSeconds: 20
        readinessProbe:
          httpGet:
            path: /api/v1/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
        envFrom:
        - secretRef:
            name: tryfit-secrets
        resources:
          limits:
            cpu: "1000m"
            memory: "1024Mi"
          requests:
            cpu: "250m"
            memory: "256Mi"
```

# ==============================================================================
# TryFit Cloud Backend Service - Production Dockerfile
# Multi-stage, security-hardened Alpine build with non-root user & health check
# ==============================================================================

ARG NODE_VERSION=20-alpine

# ------------------------------------------------------------------------------
# Stage 1: Build & Dependencies Resolution
# ------------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS dependencies

WORKDIR /app

# Install build dependencies if native bindings are required
RUN apk add --no-cache libc6-compat

# Copy package manifests first to maximize Docker layer caching
COPY package.json package-lock.json ./

# Install only production dependencies cleanly
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime
# ------------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner

# Install tini for signal forwarding (SIGTERM / SIGINT) and zombie process reaping,
# along with tzdata for standard timezone localization
RUN apk add --no-cache tini tzdata

WORKDIR /app

# Set default production environment
ENV NODE_ENV=production \
    PORT=3000

# Copy production node_modules from dependencies stage with correct node user ownership
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules

# Copy essential runtime files and source tree
COPY --chown=node:node package.json server.js index.js seed.js ./
COPY --chown=node:node src/ ./src/

# Switch to the non-privileged 'node' user for security compliance
USER node

# Expose HTTP port
EXPOSE 3000

# Built-in lightweight health check using Node.js standard HTTP library
# Validates that the TryFit backend is actively responding at /api/v1/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/v1/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Use tini as the PID 1 init process to forward process signals correctly
ENTRYPOINT ["/sbin/tini", "--"]

# Launch the TryFit Express server
CMD ["node", "server.js"]

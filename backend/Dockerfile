# =================
# Build stage
# =================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for potential build scripts)
RUN npm ci

# Copy source code
COPY src ./src
COPY scripts ./scripts

# =================
# Runtime stage
# =================
FROM node:20-alpine

WORKDIR /app

# Set environment
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy only necessary files from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Create .env file placeholder (will be overridden at runtime)
RUN echo "PORT=3001" > .env && \
    echo "NODE_ENV=production" >> .env && \
    chown nodejs:nodejs .env

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "src/index.js"]

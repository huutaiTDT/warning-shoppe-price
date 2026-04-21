# =================
# Build stage
# =================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy environment files for build
COPY .env .env.example ./

# Copy source code and config files
COPY src ./src
COPY public ./public
COPY index.html ./
COPY tsconfig.json tsconfig.node.json vite.config.ts postcss.config.mjs ./

# Build the application
RUN pnpm build

# =================
# Runtime stage
# =================
FROM nginx:alpine

WORKDIR /app

# Copy nginx default configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user for security
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 && \
    chown -R nginx:nginx /usr/share/nginx/html

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

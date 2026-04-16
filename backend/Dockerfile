# Backend Dockerfile

FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production && npm install -g ts-node typescript

# Copy application code
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production

# Start application
CMD ["npm", "start"]

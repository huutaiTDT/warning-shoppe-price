FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies for smaller image size.
COPY package*.json ./
RUN npm ci --omit=dev

# Copy runtime source
COPY src ./src

EXPOSE 3001

CMD ["node", "src/index.js"]

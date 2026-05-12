FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies for smaller image size.
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy environment file into the image so dotenv can load it at runtime.
COPY .env .env

# Copy runtime source
COPY src ./src

EXPOSE 3001

CMD ["node", "src/index.js"]

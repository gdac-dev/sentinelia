FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Copy migrations
COPY migrations/ ./migrations/

# Create uploads dir
RUN mkdir -p uploads

EXPOSE 3001

CMD ["node", "dist/index.js"]

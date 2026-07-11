FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

# Create a placeholder .env file to satisfy any build tools if needed
RUN touch .env

# Build both backend and frontend
RUN npm run build

# ---
# Stage 2: Production Runtime
FROM node:18-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled backend and frontend from builder stage
COPY --from=builder /app/dist ./dist

# Create necessary directories for persistence
RUN mkdir -p data && chown -R node:node data

# We can run as non-root user for security
USER node

# Expose the unified port (3001 by default in the app)
EXPOSE 3001

# Start the application
# Use NODE_ENV=production so Express knows to serve static files from dist/web
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

CMD ["node", "dist/server.js"]

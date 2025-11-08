# ---------- Stage 1: Build the NestJS App ----------
FROM node:18-alpine AS builder

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build NestJS app
RUN npm run build


# ---------- Stage 2: Run the App ----------
FROM node:18-alpine

WORKDIR /app

# Copy built app and dependencies from builder
COPY --from=builder /app ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=10000

# Expose the app port (Render uses this)
EXPOSE 10000

# Start command
CMD ["node", "dist/main.js"]

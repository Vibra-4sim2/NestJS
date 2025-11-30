# ---------- Stage 1: Build the NestJS App ----------
FROM node:20-bullseye AS builder

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
FROM node:20-bullseye


WORKDIR /app

# Copy built app and dependencies from builder
COPY --from=builder /app ./

# Install Python3 and pip in runtime image (Debian-based for ML wheels)
RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 python3-pip \
	&& rm -rf /var/lib/apt/lists/*

COPY src/ai/requirements.txt ./src/ai/requirements.txt
RUN python3 -m pip install --no-cache-dir -r ./src/ai/requirements.txt

# Set environment variables
ENV NODE_ENV=production
ENV PORT=10000
ENV RECOMMENDER_PYTHON=/usr/bin/python3

# Expose the app port (Render uses this)
EXPOSE 10000

# Start command
CMD ["node", "dist/main.js"]

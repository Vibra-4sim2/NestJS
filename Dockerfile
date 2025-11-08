# Use Node 20 (lightweight)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy the rest of the files
COPY . .

# Build the project
RUN npm run build

# Expose the port Nest runs on
EXPOSE 3000

# Start the app
CMD ["node", "dist/main.js"]

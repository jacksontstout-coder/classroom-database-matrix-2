# Use the standard fully bundled Node framework image
FROM node:20

# Set up the internal workspace directory structure
WORKDIR /usr/src/app

# Copy package configurations and install the backend dependencies
COPY package*.json ./
RUN npm install

# Copy all remaining repository frontend layout files straight into the workspace
COPY . .

# Expose the standard cloud networking port allocation
EXPOSE 3000

# Execute the master initialization boot trigger script
CMD ["node", "index.js"]

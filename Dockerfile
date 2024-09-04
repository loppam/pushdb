# Use the official Node.js 22.7 image
FROM node:22.7

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install production dependencies
RUN npm install --only=production

# Copy local code to the container image
COPY . ./

# Make port 8080 available to the world outside this container
EXPOSE 8080

# Run the web service on container startup
CMD [ "npm", "start" ]
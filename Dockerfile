FROM node:22-alpine

WORKDIR /app

# Install dependencies first so Docker can cache this layer
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the app (server.js and public/)
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]

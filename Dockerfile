FROM node:20-alpine

WORKDIR /app

# Install git for plugin cloning
RUN apk add --no-cache git

COPY package*.json ./
RUN npm ci --only=production

COPY server.js ./
COPY public ./public
COPY .claude-plugin ./.claude-plugin

# Create plugins directory
RUN mkdir -p plugins

EXPOSE 4874

CMD ["node", "server.js"]

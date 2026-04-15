FROM node:20-slim

WORKDIR /app

COPY package.json .
RUN npm install

COPY mcp-server.mjs .

# X402_PRIVATE_KEY is only required for tool calls (payments).
# Server starts and responds to initialize + tools/list without it.
ENV X402_PRIVATE_KEY=""

CMD ["node", "mcp-server.mjs"]

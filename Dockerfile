FROM alpine:latest

ENV LANG C.UTF-8

# Install Node.js
RUN apk add --no-cache nodejs npm

# Install dependencies
COPY package.json /
RUN cd / && npm install

# Compile TypeScript to JavaScript
COPY tsconfig.json /
COPY src /src
RUN npm run build

# Run the compiled JavaScript
CMD [ "npm", "run", "start" ]

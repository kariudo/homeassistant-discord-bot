FROM alpine:latest

ENV LANG C.UTF-8

RUN apk add --no-cache bash

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN apk add --no-cache \
    nodejs-current \
    npm

COPY package.json /
RUN cd / && npm install
COPY server.js /

COPY run.sh /
RUN chmod +x /run.sh

CMD [ "node", "/server.js" ]

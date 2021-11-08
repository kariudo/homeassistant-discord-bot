ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG C.UTF-8
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN apk update && apk upgrade
RUN apk add --no-cache --update \
    nodejs-current \
    npm

COPY package.json /
RUN cd / && npm install
COPY server.js /

COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]

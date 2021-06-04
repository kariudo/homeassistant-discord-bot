#!/usr/bin/with-contenv bashio
set +u

CONFIG_PATH=/data/options.json

BOT_TOKEN=$(bashio::config 'bot_token')
URL=$(bashio::config 'mqtt_url')
PORT=$(bashio::config 'mqtt_port')
USERNAME=$(bashio::config 'mqtt_username')
PASSWORD=$(bashio::config 'mqtt_password')
ONLINE=$(bashio::config 'topic_online')
VOICE=$(bashio::config 'topic_voice')
COMMAND=$(bashio::config 'topic_command')
GUILD=$(bashio::config 'guild_id')
YOUR=$(bashio::config 'your_id')

bashio::log.info "Starting..."

node ./server.js $BOT_TOKEN $URL $PORT $USERNAME $PASSWORD $ONLINE $COMMAND $VOICE $GUILD $YOUR
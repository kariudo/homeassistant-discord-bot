#!/usr/bin/with-contenv bashio
set +u

CONFIG_PATH=/data/options.json

BOT_TOKEN=$(bashio::config 'bot_token')
URL=$(bashio::config 'url')
PORT=$(bashio::config 'port')
USERNAME=$(bashio::config 'username')
PASSWORD=$(bashio::config 'password')
ONLINE_FRIENDS=$(bashio::config 'online_friends')
COMMANDS=$(bashio::config 'commands')
VOICE=$(bashio::config 'voice_connected')
GUILD_ID=$(bashio::config 'guild_id')
YOUR_ID=$(bashio::config 'your_id')

bashio::log.info "Starting..."

node ./server.js $BOT_TOKEN $URL $PORT $USERNAME $PASSWORD $ONLINE_FRIENDS $COMMANDS $VOICE $GUILD_ID $YOUR_ID
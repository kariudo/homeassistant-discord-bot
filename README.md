# Home Assistant Discord Bot

[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-blu.svg)](https://GitHub.com/Naereen/StrapDown.js/graphs/commit-activity)
[![TypeScript](https://badgen.net/badge/icon/typescript?icon=typescript&label)](https://typescriptlang.org)
[![Buymeacoffee](https://badgen.net/badge/icon/buymeacoffee?icon=buymeacoffee&label)](<[https://https://www.buymeacoffee.com/](https://www.buymeacoffee.com/kariudo)>)

This Discord Bot integrates with Home Assistant to provide voice channel connection status, online presence of friends,
their current activities, and supports various commands such as mute, unmute, deaf, undeaf, moving users between voice
channels, setting bot activities, and disconnecting from the voice channel.

## Supported Commands

- `mute`
- `unmute`
- `deaf`
- `undeaf`
- `move {channel_name}`
- `bot_activity {activity}`
- `disconnect`

## Configuration

### Bot Token

1. Visit [Discord Developer Portal](https://discord.com/developers/applications) and create an new Application!
2. Create a Discord Bot within the Application and copy the **Bot Token** from the `Bot` sub-page to `<BOT_TOKEN>`.

### Add the bot to the server

1. You can use the generated invite link that is printed to the console at startup to add the bot to the serer with
the required permissions.

### MQTT

### MQTT Connection Setup


1. Ensure that the [Mosquitto broker](https://github.com/home-assistant/addons/tree/master/mosquitto) is installed and
running on your Home Assistant instance.
1. Specify the MQTT broker URL and credentials in the `.env` file:
   - `MQTT_BROKER_URL` should be set to your MQTT broker's URL.
   - `MQTT_BROKER_USERNAME` and `MQTT_BROKER_PASSWORD` should be set with your login credentials.
2. Define unique MQTT topics in the `.env` file for the bot to publish and subscribe to:
   - `MQTT_TOPIC_COMMAND` is used for sending string commands (see _Commands_).
   - `MQTT_TOPIC_ONLINE` is used to receive information about online server members and their activities in JSON format.
   - `MQTT_TOPIC_VOICE` indicates whether you are connected to a voice channel and if you are muted or deafened,
returning a boolean value.

### Configure the ID Values

> Note: you will need to enable developer mode in your discord app settings to see the ID copy features in the context menus.

1. After you or an admin added your bot to a server you can right-click on the server name to copy the `<GUILD_ID>`.
2. `<YOUR_ID>` can be found by right-clicking on your name in the users tab of the server.
2. `<BOT_ID>` can be found by right-clicking on the bot's name in the users tab of the server, it will need to be added to the server first for this..

## Home Assistant Usage

MQTT discovery should present a device in home assistant for you to configure with all the available sensors, selects, switches.

## Docker Support

For the easiest use, just run the bot from docker with the published container image.

You just need to setup the `.env` file with your configuration and provide it:

```sh
docker run -it -v /<path_to_your_dotenv>/.env:/.env ghcr.io/kariudo/hass-bot:latest
```
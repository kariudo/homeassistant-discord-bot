// Configure the dotenv
require("dotenv-defaults").config({
  path: "./.env",
  encoding: "utf8",
  defaults: "./.env.defaults",
});

// Variables
const bot_token = process.env.BOT_TOKEN;
const mqtt_url = process.env.MQTT_URL;
const mqtt_port = process.env.MQTT_PORT;
const mqtt_username = process.env.MQTT_USERNAME;
const mqtt_password = process.env.MQTT_PASSWORD;
const mqtt_client_id = process.env.MQTT_CLIENT_ID;
const topic_online = process.env.TOPIC_ONLINE;
const topic_command = process.env.TOPIC_COMMAND;
const topic_voice = process.env.TOPIC_VOICE;
const guild_id = process.env.GUILD_ID;
const your_id = process.env.YOUR_ID;

// Discord
import { Client, Intents, Options } from "discord.js";
const d_client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
  makeCache: Options.cacheWithLimits({
    ...Options.defaultMakeCacheSettings,
    GuildMemberManager: 200,
  }),
});

d_client.on("ready", () => {
  console.info(`BOT logged in as ${d_client.user.username}!`);
  d_client.user.setPresence({
    activities: [
      {
        name: "mit deiner Mom",
        type: "PLAYING",
      },
    ],
    status: "online",
  });
});

// Mqtt
import { connect } from "mqtt";
const options = {
  port: mqtt_port,
  host: mqtt_url,
  clientId: "discord_bot_" + mqtt_client_id,
  username: mqtt_username,
  password: mqtt_password,
  clean: true,
  resubscribe: false,
};
const m_client = connect(mqtt_url, options);

m_client.on("connect", () => {
  console.info("MQTT connected");
  m_client.subscribe(topic_command);
});

// Error
m_client.on("error", (error) => {
  console.error(`MQTT ${error}`);
});
m_client.on("close", () => {
  console.error("MQTT disconnected");
});

// Commands
m_client.on("message", (topic, message) => {
  if (topic === topic_command) {
    const you = d_client.guilds.cache.get(guild_id).members.cache.get(your_id);
    switch (message.toString()) {
      case "mute":
        you.voice.setMute(true);
        break;
      case "deaf":
        you.voice.setDeaf(true);
        you.voice.setMute(true);
        break;
      case "kick":
        you.voice.disconnect();
        break;
      case "undeaf":
        you.voice.setDeaf(false);
        you.voice.setMute(false);
        break;
      case "unmute":
        you.voice.setMute(false);
        break;
      default:
        d_client.user.setPresence({
          activities: [
            {
              name: message.toString(),
              type: "PLAYING",
            },
          ],
          status: "online",
        });
      // console.error(`The Command '${message.toString()}' is not supported`);
    }
  }
});

// In Voicechannel?
d_client.on("voiceStateUpdate", (oldState, newState) => {
  if (newState.channelId === null) {
    if (oldState.member.id === your_id) {
      m_client.publish(
        topic_voice,
        '{"voice_connection":"false", "mute": "unavailable", "deaf": "unavailable"}'
      );
    }
  } else {
    console.log(newState.member.id);
    if (newState.member.id === your_id) {
      let deaf = newState.member.voice.deaf;
      let mute = newState.member.voice.mute;
      m_client.publish(
        topic_voice,
        `{"voice_connection": true, "mute": "${mute}", "deaf": "${deaf}"}`
      );
    }
  }
});

// Online
d_client.on("presenceUpdate", () => {
  let onlinePresences = d_client.guilds.cache
    .get(guild_id)
    .presences.cache.filter((presence) => presence.status !== "offline");
  let online = [];
  onlinePresences.forEach((presence) => {
    if (presence.member.user.bot) return;
    online.push({
      username: presence.member.user.username,
      activity: presence.activities,
    });
  });
  m_client.publish(topic_online, JSON.stringify(online));
});

d_client.login(bot_token);

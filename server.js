// Variables
const args = process.argv.slice(2);
const bot_token = args[0];
const mqtt_url = args[1];
const mqtt_port = args[2];
const mqtt_username = args[3];
const mqtt_password = args[4];
const topic_online = args[5];
const topic_command = args[6];
const topic_voice = args[7];
const guild_id = args[8];
const your_id = args[9];

// Discord
const { Client, Intents, Options } = require("discord.js");
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
const mqtt = require("mqtt");
const options = {
  port: mqtt_port,
  host: mqtt_url,
  clientId: "Node.js_" + Math.random().toString(16).substr(2, 8),
  username: mqtt_username,
  password: mqtt_password,
  clean: true,
  resubscribe: false,
};
const m_client = mqtt.connect(mqtt_url, options);

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

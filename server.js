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
const topic_connected = process.env.TOPIC_CONNECTED;
const topic_online = process.env.TOPIC_ONLINE;
const topic_command = process.env.TOPIC_COMMAND;
const topic_voice = process.env.TOPIC_VOICE;
const guild_id = process.env.GUILD_ID;
const your_id = process.env.YOUR_ID;
const bot_id = process.env.BOT_ID;
const bot_nickname = process.env.BOT_NICKNAME;

// Output a startup message with all the configuration values.
console.log(`Starting up:
  BOT_TOKEN: ${bot_token}
  MQTT_URL: ${mqtt_url}
  MQTT_PORT: ${mqtt_port}
  MQTT_USERNAME: ${mqtt_username}
  MQTT_PASSWORD: ${mqtt_password}
  MQTT_CLIENT_ID: ${mqtt_client_id}
  TOPIC_ONLINE: ${topic_online}
  TOPIC_COMMAND: ${topic_command}
  TOPIC_VOICE: ${topic_voice}
  GUILD_ID: ${guild_id}
  YOUR_ID: ${your_id}
  BOT_ID: ${bot_id}
  BOT_NICKNAME: ${bot_nickname}`);

// Discord
const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  Options,
  ActivityType,
} = require("discord.js");
const d_client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
  makeCache: Options.cacheWithLimits({
    ...Options.defaultMakeCacheSettings,
    GuildMemberManager: 200,
  }),
});

// Discord connect
d_client.on("ready", () => {
  console.info(`BOT logged in as ${d_client.user.username}!`);
  d_client.user.setPresence({
    activities: [
      {
        name: "The House",
        type: ActivityType.Watching,
      },
    ],
    status: "online",
  });
  setBotNickname(bot_nickname);
});

// MQTT Configuration
const mqtt = require("mqtt");
const options = {
  port: mqtt_port,
  host: mqtt_url,
  clientId: "discord_bot_" + mqtt_client_id,
  username: mqtt_username,
  password: mqtt_password,
  clean: true,
  resubscribe: false,
  will: {
    topic: topic_connected,
    payload: "false",
    qos: 1,
    retain: true,
  },
};

// Connect to the MQTT Broker with a will
const m_client = mqtt.connect(mqtt_url, options);

// MQTT Connect
m_client.on("connect", () => {
  console.info("MQTT connected");
  m_client.subscribe(topic_command);
  m_client.publish(topic_connected, "true");
});

//  MQTT Error
m_client.on("error", (error) => {
  console.error(`MQTT ${error}`);
});

// MQTT close
m_client.on("close", () => {
  console.error("MQTT disconnected");
});

// Commands
m_client.on("message", handleMqttMessage());

// Voice Channel Updates, self status in the voice channel(s)
d_client.on("voiceStateUpdate", handleVoiceStatuUpdate());

// Precense Update: online status of users
d_client.on("presenceUpdate", handlePresenceUpdate);

// Login with the bot when everything is ready.
d_client.login(bot_token);


/**
 * Handles MQTT messages and executes corresponding actions.
 *
 * @param {string} topic - the topic of the MQTT message
 * @param {string} message - the message payload of the MQTT message
 * @return {void} 
 */
function handleMqttMessage() {
  return (topic, message) => {
    if (topic === topic_command) {
      processCommand(message);
    }
  };
}


/**
 * Process a command message to perform various actions such as muting, deafening, 
 * unmuting, disconnecting from a voice channel, moving to a different channel, 
 * setting bot activity, and setting bot nickname.
 *
 * @param {string} message - The command message to be processed.
 */
function processCommand(message) {
  const you = d_client.guilds.cache.get(guild_id).members.cache.get(your_id);
  // Split message into command name and arguments
  const args = message.toString().split(" ");
  const command = args.shift();
  switch (command) {
    case "mute":
      you.voice.setMute(true);
      break;
    case "deaf":
      you.voice.setDeaf(true);
      you.voice.setMute(true);
      break;
    case "undeaf":
      you.voice.setDeaf(false);
      you.voice.setMute(false);
      break;
    case "unmute":
      you.voice.setMute(false);
      break;
    case "disconnect":
      you.voice.disconnect();
      console.log("Disconnecting from voice channel.");
      break;
    case "move":
      const channelName = args.join(" ").trim().toLowerCase();
      const channel = d_client.guilds.cache
        .get(guild_id)
        .channels.cache.find((c) => c.name.toLowerCase() === channelName);
      if (channel) {
        console.log("Moving to channel: " + channel.name);
        if (you.voice.channel) {
          you.voice.setChannel(channel);
        } else {
          console.warn("You are not in a voice channel.");
        }
      } else {
        console.error("Uknown channel name: " + channelName);
      }
      break;
    case "bot_activity":
      const botActivity = args.join(" ").trim();
      console.log("Setting bot activity: " + botActivity);
      d_client.user.setPresence({
        activities: [
          {
            name: botActivity,
            // state: "STATE",
            type: ActivityType.Custom,
            // url: "URL",
          },
        ],
        status: "online",
      });
      break;
    case "bot_nick":
      const botNick = args.join(" ").trim();
      setBotNickname(botNick);
    default:
      console.error(`The command '${message.toString()}' is not supported.`);
  }
}

/**
 * Handles the voice status update.
 *
 * @param {object} oldState - the old state object
 * @param {object} newState - the new state object
 * @return {void} 
 */
function handleVoiceStatuUpdate() {
  return (oldState, newState) => {
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
        let connected = newState.member.voice.channel !== null;
        let deaf = newState.member.voice.deaf;
        let mute = newState.member.voice.mute;
        let channelName = newState.member.voice.channel?.name ?? "unavailable";
        m_client.publish(
          topic_voice,
          `{"voice_connection": "${connected}", "mute": "${mute}", "deaf": "${deaf}", "channel": "${channelName}"}`
        );
      }
    }
  };
}

/**
 * Handles the update of online presences and publishes the online user data to a specified topic.
 *
 */
function handlePresenceUpdate() {
  let onlinePresences = getGuild()
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
}

/**
 * Retrieves the bot member from the guild cache.
 *
 * @return {Object} The bot member from the guild cache.
 */
function getBotMember() {
  return getGuild().me;
}


/**
 * Retrieves the guild using the client's cache.
 *
 * @return {type} the retrieved guild
 */
function getGuild() {
  return d_client.guilds.cache.get(guild_id);
}

/**
 * Sets the nickname of the bot.
 *
 * @param {string} botNick - the new nickname for the bot
 * @return {void} 
 */
function setBotNickname(botNick) {
  const bot = getBotMember();
  // Check if we have permission to change the nickname
  if (!getBotMember().permissions.has(PermissionFlagsBits.ChangeNickname)) {
    console.log("Setting bot nick: " + botNick);
    bot.setNickname(botNick);
  } else {
    console.error("The bot does not have permission to change nicknames. Requires MANAGE_NICKNAMES.");
  }

}


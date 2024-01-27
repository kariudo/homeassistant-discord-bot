import dotenv from "dotenv-defaults";
import {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  Options,
  ActivityType,
  GuildMember,
  Presence,
  Guild,
  Activity,
  GuildVoiceChannelResolvable,
  VoiceState,
  GuildChannel,
  GuildBasedChannel,
  OAuth2Scopes,
} from "discord.js";
import mqtt, { MqttClient, IClientOptions, OnMessageCallback } from "mqtt";

dotenv.config({
  path: "./.env",
  encoding: "utf8",
  defaults: "./.env.defaults",
});

// interface MqttOptions extends IClientOptions {
//   port: number;
//   host: string;
//   clientId: string;
//   username: string;
//   password: string;
//   clean: boolean;
//   resubscribe: boolean;
//   will: {
//     topic: string;
//     payload: Buffer;
//     qos: number;
//     retain: boolean;
//   };
// }

interface BotConfig {
  bot: {
    token: string;
    nickname: string;
    id: string;
  };
  mqtt: {
    url: string;
    port: string;
    username: string;
    password: string;
    clientId: string;
    topics: {
      connected: string;
      online: string;
      command: string;
      voice: string;
    };
  };
  guild: {
    id: string;
  };
  you: {
    id: string;
  };
}

interface UserPresence {
  username: string;
  activity: Activity[];
}

/**
 * Loads the configuration for the bot, MQTT, guild, and user,
 * retrieving the necessary values from the environment variables
 * or throwing an error if any of them are missing.
 *
 * @return {BotConfig} the loaded configuration object
 */
function loadConfig(): BotConfig {
  return {
    bot: {
      token: process.env.BOT_TOKEN ?? throwError("BOT_TOKEN"),
      nickname: process.env.BOT_NICKNAME ?? throwError("BOT_NICKNAME"),
      id: process.env.BOT_ID ?? throwError("BOT_ID"),
    },
    mqtt: {
      url: process.env.MQTT_URL ?? throwError("MQTT_URL"),
      port: process.env.MQTT_PORT ?? throwError("MQTT_PORT"),
      username: process.env.MQTT_USERNAME ?? throwError("MQTT_USERNAME"),
      password: process.env.MQTT_PASSWORD ?? throwError("MQTT_PASSWORD"),
      clientId: process.env.MQTT_CLIENT_ID ?? throwError("MQTT_CLIENT_ID"),
      topics: {
        connected: process.env.TOPIC_CONNECTED ?? throwError("TOPIC_CONNECTED"),
        online: process.env.TOPIC_ONLINE ?? throwError("TOPIC_ONLINE"),
        command: process.env.TOPIC_COMMAND ?? throwError("TOPIC_COMMAND"),
        voice: process.env.TOPIC_VOICE ?? throwError("TOPIC_VOICE"),
      },
    },
    guild: {
      id: process.env.GUILD_ID ?? throwError("GUILD_ID"),
    },
    you: {
      id: process.env.YOUR_ID ?? throwError("YOUR_ID"),
    },
  };
}

let config: BotConfig;

try {
  config = loadConfig();
} catch (error) {
  console.error("An error occurred while initializing configuration:", error);
  process.exit(1);
}
function throwError(envVarName: string): never {
  throw new Error(`Environment variable ${envVarName} is required.`);
}

// Print a fancy header banner when starting up.
console.log("======================================");
console.log("         HASS BOT FOR DISCORD         ");
console.log("======================================");
// Print the configuration object
console.log("Configuration:");
console.log(config);

const d_client: Client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
  makeCache: Options.cacheWithLimits({
    ...Options.DefaultMakeCacheSettings,
    GuildMemberManager: 200,
  }),
});

d_client.on("ready", () => {
  if (!d_client.user) {
    throw new Error("User is null - bot client is not properly initialized.");
  }

  // Generate an invite link and print to the console. (Must be logged in with the bot token)
  printInviteLink();

  console.info(`Logged in as "${d_client.user.username}".`);
  d_client.user.setPresence({
    activities: [
      {
        name: "🏠 Watching the house",
        type: ActivityType.Custom,
      },
    ],
    status: "online",
  });
  // If permissions allow, set the nickname to the custom one.
  setBotNickname(config.bot.nickname);
});

const options: IClientOptions = {
  port: Number(config.mqtt.port) || 1883,
  host: config.mqtt.url,
  clientId: "discord_bot_" + config.mqtt.clientId,
  username: config.mqtt.username,
  password: config.mqtt.password,
  clean: true,
  resubscribe: false,
  will: {
    topic: config.mqtt.topics.connected,
    payload: Buffer.from("false"),
    qos: 1,
    retain: true,
  },
};

const m_client: MqttClient = mqtt.connect(config.mqtt.url, options);

m_client.on("connect", () => {
  console.info("MQTT connected");
  m_client.subscribe(config.mqtt.topics.command);
  m_client.publish(config.mqtt.topics.connected, "true");
});

m_client.on("error", (error) => {
  console.error(`MQTT ${error}`);
});

m_client.on("close", () => {
  console.error("MQTT disconnected");
});

m_client.on("message", handleMqttMessage);
d_client.on("voiceStateUpdate", handleVoiceStatusUpdate);
d_client.on("presenceUpdate", handlePresenceUpdate);
d_client.login(config.bot.token);

/**
 * Prints the invite link generated by the d_client with specific permissions and scopes.
 */
function printInviteLink(): void {
  const inviteLink = d_client.generateInvite({
    permissions: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.MuteMembers,
      PermissionFlagsBits.DeafenMembers,
      PermissionFlagsBits.MoveMembers,
      PermissionFlagsBits.ChangeNickname,
    ],
    scopes: [
      OAuth2Scopes.Bot,
      OAuth2Scopes.ApplicationsCommands,
      OAuth2Scopes.Guilds,
      OAuth2Scopes.GuildsMembersRead,
    ],
  });
  console.log(`Invite link: ${inviteLink}`);
}

/**
 * Handles the MQTT message by processing a command if the topic is the command
 * topic.
 *
 * @param {string} topic - The MQTT topic of the message
 * @param {Buffer} message - The message payload
 * @return {void}
 */
function handleMqttMessage(topic: string, message: Buffer): void {
  if (topic === config.mqtt.topics.command) {
    processCommand(message.toString());
  }
}

/**
 * Process a command message and execute corresponding actions.
 *
 * @param {string} message - the command message to be processed
 * @return {void}
 */
function processCommand(message: string): void {
  const you: GuildMember = getSelf();
  const args: string[] = message.toString().split(" ");
  if (args.length === 0) {
    console.error("Empty command, ignoring.");
    return;
  }
  // Get the first word as the command, leave the rest as arguments.
  const command: string = args.shift()!.toLowerCase();
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
      const channelName: string = args.join(" ").trim().toLowerCase();
      moveToChannelByName(channelName, you);
      break;
    case "bot_activity":
      const botActivity: string = args.join(" ").trim();
      setBotActivity(botActivity);
      break;
    case "bot_nick":
      const botNick: string = args.join(" ").trim();
      setBotNickname(botNick);
      break;
    default:
      console.error(`The command '${command}' is not supported.`);
  }
}

/**
 * Sets the activity of the bot to the specified value.
 *
 * @param {string} botActivity - the activity to set for the bot
 * @return {void}
 */
function setBotActivity(botActivity: string): void {
  console.log("Setting bot activity: " + botActivity);
  if (!d_client.user) {
    throw new Error("User is null - bot client is not properly initialized.");
  }
  d_client.user.setPresence({
    activities: [
      {
        name: botActivity,
        type: ActivityType.Custom,
      },
    ],
    status: "online",
  });
}

/**
 * Moves the user to the specified channel by name.
 *
 * @param {string} channelName - the name of the channel to move to
 * @param {GuildMember} you - the user to move
 */
function moveToChannelByName(channelName: string, you: GuildMember): void {
  const channel = getChannelByName(channelName);
  if (channel) {
    console.log("Moving to channel: " + channel.name);
    if (you.voice.channel) {
      you.voice.setChannel(channel as GuildVoiceChannelResolvable);
    } else {
      console.warn("You are not in a voice channel.");
    }
  } else {
    console.error("Unknown channel name: " + channelName);
  }
}

/**
 * Retrieves a channel by its name.
 *
 * @param {string} channelName - the name of the channel to retrieve
 * @return {void} the channel with the specified name
 */
function getChannelByName(channelName: string): GuildBasedChannel {
  const channel = getGuild().channels.cache.find(
    (c) => c.name.toLowerCase() === channelName.toLowerCase()
  );
  if (!channel) throw new Error(`Channel "${channelName}" not found.`);
  return channel;
}

/**
 * Retrieves the your guild member object.
 *
 * @return {GuildMember} The guild member object of the current user.
 */
function getSelf(): GuildMember {
  const member = getGuild().members.cache.get(config.you.id);
  if (!member) {
    throw new Error(`Your member ID ${config.you.id} was not found in guild.`);
  }
  return member;
}

/**
 * Handles the voice status update for a member.
 *
 * @param {VoiceState} oldState - the old voice state
 * @param {VoiceState} newState - the new voice state
 */
function handleVoiceStatusUpdate(
  oldState: VoiceState,
  newState: VoiceState
): void {
  const memberId = oldState.member?.id ?? newState.member?.id;
  if (!memberId || memberId !== config.you.id) return;

  let voiceUpdateInfo = {
    voice_connection: newState.channelId !== null,
    mute: "unavailable",
    deaf: "unavailable",
    channel: "unavailable",
  };

  if (newState.channelId === null) {
    m_client.publish(config.mqtt.topics.voice, JSON.stringify(voiceUpdateInfo));
  } else {
    voiceUpdateInfo.mute =
      newState.member?.voice.mute?.toString() ?? "unavailable";
    voiceUpdateInfo.deaf =
      newState.member?.voice.deaf?.toString() ?? "unavailable";
    voiceUpdateInfo.channel =
      newState.member?.voice.channel?.name ?? "unavailable";
    m_client.publish(config.mqtt.topics.voice, JSON.stringify(voiceUpdateInfo));
  }
}

/**
 * Handles the update of presence information.
 *
 * @param {Presence | undefined} _oldPresence - the old presence information
 * @param {Presence | undefined} _newPresence - the new presence information
 * @return {void}
 */
function handlePresenceUpdate(
  _oldPresence: Presence | null,
  _newPresence: Presence | null
): void {
  // Get the online presences from the guild.
  let onlinePresences = getGuild().presences.cache.filter(
    (presence: Presence) => presence.status !== "offline"
  );
  let online: UserPresence[] = [];
  onlinePresences.forEach((presence: Presence) => {
    // Do not include the bot in the online list.
    if (presence.member?.user.bot) return;
    // If the presence member is null, skip it with a warning.
    if (!presence.member) {
      console.warn("Presence member is null.");
      return;
    }
    // Add a presence to the list of online.
    const userPresence: UserPresence = {
      username: presence.member.user.username,
      activity: presence.activities,
    };
    online.push(userPresence);
  });
  // Publish the online list to the MQTT topic.
  m_client.publish(config.mqtt.topics.online, JSON.stringify(online));
}

/**
 * Retrieve the bot member from the guild.
 *
 * @return {GuildMember} The bot member from the guild.
 */
function getBotMember(): GuildMember {
  const botMember: GuildMember | null = getGuild().members.me;
  if (!botMember) throw new Error("Bot member not found.");
  return botMember;
}

/**
 * Retrieves the guild from the cache using the configured guild id.
 *
 * @return {Guild} The retrieved guild.
 */
function getGuild(): Guild {
  const guild: Guild | undefined = d_client.guilds.cache.get(config.guild.id);
  if (!guild) throw new Error("Guild not found.");
  return guild;
}

/**
 * Sets the nickname of the bot.
 *
 * @param {string} botNick - the new nickname for the bot
 * @return {void}
 */
function setBotNickname(botNick: string): void {
  const bot = getBotMember();
  console.log("Checking bot permissions to update nickname...");
  if (bot.permissions.has(PermissionFlagsBits.ChangeNickname)) {
    console.log("Setting bot nick: " + botNick);
    bot.setNickname(botNick);
  } else {
    console.error(
      "The bot does not have permission to change nicknames. Requires CHANGE_NICKNAME."
    );
  }
}

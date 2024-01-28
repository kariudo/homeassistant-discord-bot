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
  GuildBasedChannel,
  OAuth2Scopes,
  ChannelType,
  VoiceChannel,
  Collection,
} from "discord.js";
import mqtt, { MqttClient, IClientOptions } from "mqtt";

// Load environment variables
dotenv.config({
  path: "./.env",
  encoding: "utf8",
  defaults: "./.env.defaults",
});

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
      discovery: string;
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

interface DiscoveryComponentConfig {
  value_template?: string;
  state_topic?: string;
  unique_id: string;
  name: string;
  json_attributes_topic?: string;
  device: Device;
  icon?: string;
  availability_topic?: string;
  payload_available?: string;
  payload_not_available?: string;
}

interface DiscoveryComponent {
  topic: string;
  payload: DiscoveryComponentConfig;
}

interface Device {
  identifiers: string[];
  name: string;
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
        discovery: process.env.TOPIC_DISCOVERY ?? throwError("TOPIC_DISCOVERY"),
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
console.debug(config);

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

d_client.on("ready", async () => {
  if (!d_client.user) {
    throw new Error("User is null - bot client is not properly initialized.");
  }

  // Generate an invite link and print to the console. (Must be logged in with the bot token)
  printInviteLink();

  console.info(`Discord: Logged in as "${d_client.user.username}".`);
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
  // Set initial state of the user.
  const self = await getSelf();
  handleVoiceStatusUpdate(undefined, self.voice);
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
  console.info("MQTT connected.");
  // Bot command messages are sent on the command topic.
  m_client.subscribe(config.mqtt.topics.command);
  // Home Assistant status messages are sent on the status topic.
  m_client.subscribe("homeassistant/status");
  // Send a connected message for the bot.
  m_client.publish(config.mqtt.topics.connected, "true", {
    qos: 1,
    retain: true,
  });
  // Publish discovery messages.
  publishDiscoveryMessages();
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
  // Publish discovery components when the home assistant server's MQTT component is online.
  if (topic === "homeassistant/status" && message.toString() === "online") {
    publishDiscoveryMessages();
  }
}

/**
 * Process a command message and execute corresponding actions.
 *
 * @param {string} message - the command message to be processed
 * @return {void}
 */
async function processCommand(message: string): Promise<void> {
  const you: GuildMember = await getSelf();
  const args: string[] = message.toString().split(" ");
  if (args.length === 0) {
    console.error("Empty command, ignoring.");
    return;
  }
  // Get the first word as the command, leave the rest as arguments.
  const command: string = args.shift()!.toLowerCase();
  switch (command) {
    case "mute":
      // Confirm the user is connected to a voice channel.
      if (!you.voice.channel) {
        console.error("User is not connected to a voice channel.");
        return;
      }
      // Mute the user
      you.voice.setMute(true);
      break;
    case "deaf":
      // Confirm the user is connected to a voice channel.
      if (!you.voice.channel) {
        console.error("User is not connected to a voice channel.");
        return;
      }
      // Deafen and mute the user.
      you.voice.setDeaf(true);
      you.voice.setMute(true);
      break;
    case "undeaf":
      // Confirm the user is connected to a voice channel.
      if (!you.voice.channel) {
        console.error("User is not connected to a voice channel.");
        return;
      }
      // Undeafen and unmute the user.
      you.voice.setDeaf(false);
      you.voice.setMute(false);
      break;
    case "unmute":
      // Confirm the user is connected to a voice channel.
      if (!you.voice.channel) {
        console.error("User is not connected to a voice channel.");
        return;
      }
      // Unmute the user.
      you.voice.setMute(false);
      break;
    case "disconnect":
      // Confirm the user is connected to a voice channel.
      if (!you.voice.channel) {
        console.error("User is not connected to a voice channel.");
        return;
      }
      // Disconnect the user.
      you.voice.disconnect();
      console.log("Disconnecting from voice channel.");
      break;
    case "move":
      // Confirm the user is connected to a voice channel.
      if (!you.voice.channel) {
        console.error("User is not connected to a voice channel.");
        return;
      }
      // Move the user.
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
  console.info("Setting bot activity: " + botActivity);
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
async function moveToChannelByName(
  channelName: string,
  you: GuildMember
): Promise<void> {
  const channel = await getChannelByName(channelName);
  if (channel) {
    console.info("Moving to channel: " + channel.name);
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
async function getChannelByName(
  channelName: string
): Promise<GuildBasedChannel> {
  const guild = await getGuild();
  const channels = (await guild.channels.fetch()) as Collection<
    string,
    GuildBasedChannel
  >;
  const channel = channels.find(
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
async function getSelf(): Promise<GuildMember> {
  const guild = await getGuild();
  const member = guild.members.fetch(config.you.id);
  if (!member) {
    throw new Error(`Your member ID ${config.you.id} was not found in guild.`);
  }
  return member;
}

/**
 * Handles the voice status update for a member.
 *
 * @param {VoiceState} [oldState] - the old voice state
 * @param {VoiceState} newState - the new voice state
 */
function handleVoiceStatusUpdate(
  oldState: VoiceState | undefined,
  newState: VoiceState
): void {
  const memberId = oldState?.member?.id ?? newState.member?.id;
  if (!memberId || memberId !== config.you.id) return;

  let voiceUpdateInfo = {
    // Binary Sensor in Home Assistant like "ON" or "OFF".
    voice_connection: newState.channelId !== null ? "ON" : "OFF",
    mute: "unavailable",
    deaf: "unavailable",
    channel: "unavailable",
  };
  console.debug("Voice status update:", voiceUpdateInfo);
  if (newState.channelId === null) {
    m_client.publish(config.mqtt.topics.voice, JSON.stringify(voiceUpdateInfo));
  } else {
    voiceUpdateInfo.mute =
      newState.member?.voice.mute?.toString() ?? "unavailable";
    voiceUpdateInfo.deaf =
      newState.member?.voice.deaf?.toString() ?? "unavailable";
    voiceUpdateInfo.channel =
      newState.member?.voice.channel?.name ?? "unavailable";
    m_client.publish(
      config.mqtt.topics.voice,
      JSON.stringify(voiceUpdateInfo),
      {
        qos: 1,
        retain: true,
      }
    );
  }
  
}

/**
 * Handles the update of presence information.
 *
 * @param {Presence | undefined} _oldPresence - the old presence information
 * @param {Presence | undefined} _newPresence - the new presence information
 * @return {void}
 */
async function handlePresenceUpdate(
  _oldPresence: Presence | null,
  _newPresence: Presence | null
): Promise<void> {
  const guild = await getGuild();
  // Get the online presences from the guild.
  let onlinePresences = guild.presences.cache.filter(
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
 * @return {Promise<GuildMember>} The bot member from the guild.
 */
async function getBotMember(): Promise<GuildMember> {
  const guild = await getGuild();
  const botMember: GuildMember | null = guild.members.me;
  if (!botMember) throw new Error("Bot member not found.");
  return botMember;
}

/**
 * Retrieves the guild from the cache using the configured guild id.
 *
 * @return {Guild} The retrieved guild.
 */
async function getGuild() {
  const guild = (await d_client.guilds.fetch(config.guild.id)) as Guild;
  if (!guild) throw new Error("Guild not found.");
  return guild;
}

/**
 * Sets the nickname of the bot.
 *
 * @param {string} botNick - the new nickname for the bot
 * @return {void}
 */
async function setBotNickname(botNick: string): Promise<void> {
  const bot = await getBotMember();
  console.debug("Checking bot permissions to update nickname...");
  if (bot.permissions.has(PermissionFlagsBits.ChangeNickname)) {
    console.info("Setting bot nick: " + botNick);
    bot.setNickname(botNick);
  } else {
    console.error(
      "The bot does not have permission to change nicknames. Requires CHANGE_NICKNAME."
    );
  }
}

async function publishDiscoveryMessages() {
  console.debug("Home Assistant MQTT Online: Publishing discovery messages...");
  const deviceId = `discordUser_${config.you.id}`;
  // A list of discovery components to publish.
  const discoveryComponents = [];
  // A common device for the components.
  const device = {
    identifiers: [deviceId],
    name: "Discord User",
  };

  // Voice connection sensor.
  discoveryComponents.push({
    topic: `${config.mqtt.topics.discovery}/binary_sensor/${deviceId}/voice/config`,
    payload: {
      name: "Discord User Voice Connection",
      value_template: "{{ value_json.voice_connection }}",
      state_topic: config.mqtt.topics.voice,
      unique_id: `${deviceId}_voice`,
      json_attributes_topic: config.mqtt.topics.voice,
      device: device,
      device_class: "connectivity",
    },
  });

  // Mute switch.
  discoveryComponents.push({
    topic: `${config.mqtt.topics.discovery}/switch/${deviceId}/mute/config`,
    payload: {
      name: "Discord User Mute",
      device_class: "switch",
      command_topic: config.mqtt.topics.command,
      state_topic: config.mqtt.topics.voice,
      state_on: "true",
      state_off: "false",
      value_template: "{{ value_json.mute }}",
      unique_id: `${deviceId}_mute`,
      device: device,
      payload_on: "mute",
      payload_off: "unmute",
      icon: "mdi:microphone-off",
      // Only available whened connected.
      availability_topic: config.mqtt.topics.voice,
      availability_template: "{{ value_json.voice_connection }}",
      payload_available: "ON",
      payload_not_available: "OFF",
    },
  });

  // Deaf switch.
  discoveryComponents.push({
    topic: `${config.mqtt.topics.discovery}/switch/${deviceId}/deaf/config`,
    payload: {
      name: "Discord User Deafen",
      device_class: "switch",
      command_topic: config.mqtt.topics.command,
      state_topic: config.mqtt.topics.voice,
      state_on: "true",
      state_off: "false",
      value_template: "{{ value_json.deaf }}",
      unique_id: `${deviceId}_deaf`,
      device: device,
      payload_on: "deaf",
      payload_off: "undeaf",
      icon: "mdi:headphones-off",
      // Only available when connected.
      availability_topic: config.mqtt.topics.voice,
      availability_template: "{{ value_json.voice_connection }}",
      payload_available: "ON",
      payload_not_available: "OFF",
    },
  });

  // TODO: this doesnt show up at all in the UI
  // Create a channel selector.
  discoveryComponents.push({
    topic: `${config.mqtt.topics.discovery}/select/${deviceId}/channel/config`,
    payload: {
      name: "Discord User Channel Selector",
      options: await getVoiceChannelNames(),
      command_topic: config.mqtt.topics.command,
      state_topic: config.mqtt.topics.voice,
      command_template: "move {{ value }}",
      value_template: "{{ value_json.channel }}",
      unique_id: `${deviceId}_channel`,
      device: device,
      icon: "mdi:account-voice",
      // Only available when already connected to a voice channel.
      availability_topic: config.mqtt.topics.voice,
      availability_template: "{{ value_json.voice_connection }}",
      payload_available: "ON",
      payload_not_available: "OFF",
    },
  });

  // Disconnect button.
  discoveryComponents.push({
    topic: `${config.mqtt.topics.discovery}/button/${deviceId}/disconnect/config`,
    payload: {
      name: "Discord User Disconnect",
      command_topic: config.mqtt.topics.command,
      state_topic: config.mqtt.topics.voice,
      command_template: "disconnect",
      unique_id: `${deviceId}_disconnect`,
      device: device,
      icon: "mdi:account-off",
      // Only available when already connected to a voice channel.
      availability_topic: config.mqtt.topics.voice,
      availability_template: "{{ value_json.voice_connection }}",
      payload_available: "ON",
      payload_not_available: "OFF",
    },
  })

  // Publish all the discovery components.
  discoveryComponents.forEach((component) => {
    m_client.publish(component.topic, JSON.stringify(component.payload), {
      qos: 1,
      retain: false, // No need to retain, as we publish when Home Assistant is online.
    });
  });
}

/**
 * Retrieve the voice channels from the cache of the current guild.
 *
 * @return {Collection<VoiceChannel>} The voice channels in the guild cache.
 */

async function getVoiceChannels() {
  const guild = await getGuild();
  // wait for the voice channels to be cached
  var channels = await guild.channels.fetch();
  return channels.filter(
    (c) => c?.type === ChannelType.GuildVoice
  ) as Collection<string, VoiceChannel>;
}

/**
 * Retrieve the names of the voice channels from the cache of the current guild.
 *
 * @return {string[]} The names of the voice channels in the guild cache.
 */
async function getVoiceChannelNames(): Promise<string[]> {
  const channels = await getVoiceChannels();
  return channels.map((channel) => channel.name);
}

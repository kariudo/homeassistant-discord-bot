import dotenv from "dotenv-defaults";
import {
  Client,
  GatewayIntentBits,
  Options,
  GuildMember,
} from "discord.js";
import mqtt, { MqttClient, IClientOptions } from "mqtt";

import { BotConfig } from "./models/BotConfig";
import { loadConfig } from "./loadConfig";
import { processCommand } from "./processCommand";
import { handleVoiceStatusUpdate } from "./handleVoiceStatusUpdate";
import { handlePresenceUpdate } from "./handlePresenceUpdate";
import { getGuild } from "./discordUtility";
import { publishDiscoveryMessages } from './publishDiscoveryMessages';
import { handleDiscordReady } from './handleDiscordReady';
import { handleMqttConnect } from './handleMqttConnect';
import { handleMqttError } from './handleMqttError';
import { handleMqttDisconnect } from './handleMqttDisconnect';

// Load environment variables
dotenv.config({
  path: "./.env",
  encoding: "utf8",
  defaults: "./.env.defaults",
});

export let config: BotConfig;

try {
  config = loadConfig();
} catch (error) {
  console.error("An error occurred while initializing configuration:", error);
  process.exit(1);
}

// Print a fancy header banner when starting up.
console.log("======================================");
console.log("         HASS BOT FOR DISCORD         ");
console.log("======================================");
// Print the configuration object
console.log("Configuration:");
console.debug(config);

// Configure and create a discord bot client.
const discordClientOptions = {
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
};
export const d_client: Client = new Client(discordClientOptions);

d_client.on("ready", handleDiscordReady);

// Configure and create an MQTT client.
const mqttClientOptions: IClientOptions = {
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
export const m_client: MqttClient = mqtt.connect(config.mqtt.url, mqttClientOptions);

m_client.on("connect", handleMqttConnect);
m_client.on("error", handleMqttError);
m_client.on("close", handleMqttDisconnect);
m_client.on("message", handleMqttMessage);
d_client.on("voiceStateUpdate", handleVoiceStatusUpdate);
d_client.on("presenceUpdate", handlePresenceUpdate);
d_client.login(config.bot.token);

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
 * Retrieve the bot member from the guild.
 *
 * @return {Promise<GuildMember>} The bot member from the guild.
 */
export async function getBotMember(): Promise<GuildMember> {
  const guild = await getGuild();
  const botMember: GuildMember | null = guild.members.me;
  if (!botMember) throw new Error("Bot member not found.");
  return botMember;
}

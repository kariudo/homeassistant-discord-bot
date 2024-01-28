import { ActivityType } from "discord.js";
import mqtt, { MqttClient, IClientOptions } from "mqtt";
import { getSelf } from "./discordUtility";
import { printInviteLink } from "./discordUtility";
import { handleVoiceStatusUpdate } from "./handleVoiceStatusUpdate";
import { setBotNickname } from "./discordUtility";
import { publishDiscoveryMessages } from './publishDiscoveryMessages';
import { d_client, config } from '.';

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

export const m_client: MqttClient = mqtt.connect(config.mqtt.url, options);
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

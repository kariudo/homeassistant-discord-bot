import type { Client } from "discord.js";
import type { MqttClient } from "mqtt";
import type { BotConfig } from "./models/BotConfig";
import { processCommand } from "./processCommand";
import { publishDiscoveryMessages } from "./publishDiscoveryMessages";

/**
 * Create an MQTT message handler.
 *
 * @param {MqttClient} mqttClient - the MQTT client
 * @param {Client} discordClient - the Discord client
 * @param {BotConfig} config - the bot configuration
 * @returns {(topic: string, message: Buffer) => void} the MQTT message handler
 */
export const createHandleMqttMessage = (
  mqttClient: MqttClient,
  discordClient: Client,
  config: BotConfig,
) => {
  /**
   * Handles MQTT messages by processing commands and publishing discovery messages.
   *
   * @param {string} topic - The topic of the MQTT message
   * @param {Buffer} message - The message received from MQTT
   * @return {void}
   */
  const handleMqttMessage = (topic: string, message: Buffer): void => {
    if (topic === config.mqtt.topics.command)
      processCommand(message.toString(), discordClient, mqttClient, config);
    if (topic === "homeassistant/status" && message.toString() === "online") {
      console.debug("Message: Home Assistant MQTT Online...");
      publishDiscoveryMessages(mqttClient, discordClient, config);
    }
  };

  return handleMqttMessage;
};

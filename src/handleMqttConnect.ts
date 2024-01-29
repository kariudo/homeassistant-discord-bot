import { MqttClient } from "mqtt/*";
import { publishDiscoveryMessages } from "./publishDiscoveryMessages";
import { BotConfig } from "./models/BotConfig";
import { Client } from 'discord.js';

/**
 * Handles MQTT connection and subscribes to necessary topics. Publishes connected message and discovery messages.
 *
 * @param {MqttClient} mqttClient - the MQTT client
 * @param {Client} discordClient - the Discord client
 * @param {BotConfig} config - the bot configuration
 * @return {()=>void} the handleMqttConnect function
 */
export const CreateHandleMqttReady = (
  mqttClient: MqttClient,
  discordClient: Client,
  config: BotConfig
) => {
  /**
   * Handles MQTT connection and subscribes to necessary topics. Publishes connected message and discovery messages.
   */
  const handleMqttConnect = () => {
    console.info("MQTT connected.");
    // Bot command messages are sent on the command topic.
    mqttClient.subscribe(config.mqtt.topics.command);
    // Home Assistant status messages are sent on the status topic.
    mqttClient.subscribe("homeassistant/status");
    // Send a connected message for the bot.
    mqttClient.publish(config.mqtt.topics.connected, "true", {
      qos: 1,
      retain: true,
    });
    // Publish discovery messages.
    publishDiscoveryMessages(mqttClient, discordClient, config);
  };

  return handleMqttConnect;
};

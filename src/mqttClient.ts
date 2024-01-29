import { MqttClient, IClientOptions, connect } from "mqtt";
import { publishDiscoveryMessages } from "./publishDiscoveryMessages";
import { BotConfig } from "./models/BotConfig";
import { Client } from 'discord.js';

/**
 * Creates an MQTT client using the provided configuration.
 *
 * @param {BotConfig} config - the configuration for the MQTT client
 * @return {MqttClient} the created MQTT client
 */
export const createMqttClient = (config: BotConfig, discordClient: Client) => {
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

  const mqttClient: MqttClient = connect(config.mqtt.url, options);
  mqttClient.on("connect", () => {
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
  });

  return mqttClient;
};

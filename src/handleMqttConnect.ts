import { publishDiscoveryMessages } from './publishDiscoveryMessages';
import { m_client, config } from '.';

/**
 * Handles MQTT connection and subscribes to necessary topics. Publishes connected message and discovery messages.
 */
export const handleMqttConnect = () => {
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
};

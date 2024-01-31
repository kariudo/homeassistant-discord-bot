import { MqttClient } from "mqtt";
import { type BotConfig } from "./models/BotConfig";

/**
 * Handles MQTT connection and subscribes to necessary topics. Publishes connected message and discovery messages.
 * @param {MqttClient} mqttClient - the MQTT client
 * @param {BotConfig} config - the bot configuration
 * @return {() => void} the handleMqttConnect function
 */
export const CreateHandleMqttReady = (
	mqttClient: MqttClient,
	config: BotConfig,
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
	};

	return handleMqttConnect;
};

import { type IClientOptions, MqttClient, connect } from "mqtt";
import type { BotConfig } from "./models/BotConfig";

/**
 * Creates an MQTT client using the provided configuration.
 *
 * @param {BotConfig} config - the configuration for the MQTT client
 * @return {MqttClient} the created MQTT client
 */
export const createMqttClient = (config: BotConfig) => {
	const options: IClientOptions = {
		port: Number(config.mqtt.port) || 1883,
		host: config.mqtt.url,
		clientId: `discord_bot_${config.mqtt.clientId}`,
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

	return mqttClient;
};

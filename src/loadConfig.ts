import { type BotConfig } from "./models/BotConfig";
import { throwEnvironmentError } from "./throwError";

/**
 * Loads the configuration for the bot, MQTT, guild, and user,
 * retrieving the necessary values from the environment variables
 * or throwing an error if any of them are missing.
 *
 * @return {BotConfig} the loaded configuration object
 */
export function loadConfig(): BotConfig {
	const botTopic =
		process.env["TOPIC_BOT"] ?? throwEnvironmentError("TOPIC_BOT");
	return {
		bot: {
			token: process.env["BOT_TOKEN"] ?? throwEnvironmentError("BOT_TOKEN"),
			nickname:
				process.env["BOT_NICKNAME"] ?? throwEnvironmentError("BOT_NICKNAME"),
			id: process.env["BOT_ID"] ?? throwEnvironmentError("BOT_ID"),
		},
		mqtt: {
			url: process.env["MQTT_URL"] ?? throwEnvironmentError("MQTT_URL"),
			port: process.env["MQTT_PORT"] ?? '1883',
			username:
				process.env["MQTT_USERNAME"] ?? throwEnvironmentError("MQTT_USERNAME"),
			password:
				process.env["MQTT_PASSWORD"] ?? throwEnvironmentError("MQTT_PASSWORD"),
			clientId:
				process.env["MQTT_CLIENT_ID"] ??
				throwEnvironmentError("MQTT_CLIENT_ID"),
			topics: {
				discovery: process.env['TOPIC_DISCOVERY'] ?? 'homeassistant',
				bot: botTopic,
				activity: `${botTopic}/activity`,
				connected: `${botTopic}/connected`,
				online: `${botTopic}/online`,
				command: `${botTopic}/command`,
				voice: `${botTopic}/voice`,
			},
		},
		guild: {
			id: process.env["GUILD_ID"] ?? throwEnvironmentError("GUILD_ID"),
		},
		you: {
			id: process.env["YOUR_ID"] ?? throwEnvironmentError("YOUR_ID"),
		},
	};
}

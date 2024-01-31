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
	return {
		bot: {
			token: process.env['BOT_TOKEN'] ?? throwEnvironmentError("BOT_TOKEN"),
			nickname:
				process.env['BOT_NICKNAME'] ?? throwEnvironmentError("BOT_NICKNAME"),
			id: process.env['BOT_ID'] ?? throwEnvironmentError("BOT_ID"),
		},
		mqtt: {
			url: process.env['MQTT_URL'] ?? throwEnvironmentError("MQTT_URL"),
			port: process.env['MQTT_PORT'] ?? throwEnvironmentError("MQTT_PORT"),
			username:
				process.env['MQTT_USERNAME'] ?? throwEnvironmentError("MQTT_USERNAME"),
			password:
				process.env['MQTT_PASSWORD'] ?? throwEnvironmentError("MQTT_PASSWORD"),
			clientId:
				process.env['MQTT_CLIENT_ID'] ?? throwEnvironmentError("MQTT_CLIENT_ID"),
			topics: {
				connected:
					process.env['TOPIC_CONNECTED'] ??
					throwEnvironmentError("TOPIC_CONNECTED"),
				discovery:
					process.env['TOPIC_DISCOVERY'] ??
					throwEnvironmentError("TOPIC_DISCOVERY"),
				online:
					process.env['TOPIC_ONLINE'] ?? throwEnvironmentError("TOPIC_ONLINE"),
				command:
					process.env['TOPIC_COMMAND'] ?? throwEnvironmentError("TOPIC_COMMAND"),
				voice: process.env['TOPIC_VOICE'] ?? throwEnvironmentError("TOPIC_VOICE"),
			},
		},
		guild: {
			id: process.env['GUILD_ID'] ?? throwEnvironmentError("GUILD_ID"),
		},
		you: {
			id: process.env['YOUR_ID'] ?? throwEnvironmentError("YOUR_ID"),
		},
	};
}

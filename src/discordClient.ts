import { Client, GatewayIntentBits, Options } from "discord.js";

/**
 * Configure and create a discord bot client.
 *
 * @return {Client} The created discord bot client
 */
export const createDiscordClient = () => {
	// Configure and create a discord bot client.
	const options = {
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

	const discordClient: Client = new Client(options);

	return discordClient;
};

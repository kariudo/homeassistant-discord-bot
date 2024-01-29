import { ActivityType, Client } from "discord.js";
import { getSelf } from "./discordUtility";
import { printInviteLink } from "./discordUtility";
import { setBotNickname } from "./discordUtility";
import { BotConfig } from './models/BotConfig';
import { createHandleVoiceStatusUpdate } from './handleVoiceStatusUpdate';
import { MqttClient } from 'mqtt/*';

/**
 * Creates a handle for when the Discord client is ready. 
 *
 * @param {Client} discordClient - the Discord client
 * @param {MqttClient} mqttClient - the MQTT client
 * @return {() => Promise<void>} a function that returns a promise of void
 */
export const createHandleDiscordReady = (discordClient: Client, mqttClient: MqttClient, config: BotConfig): () => Promise<void> => {
  const handler = async (): Promise<void> => {
    if (!discordClient.user) {
      throw new Error("User is null - bot client is not properly initialized.");
    }

    // Generate an invite link and print to the console. (Must be logged in with the bot token)
    printInviteLink(discordClient);

    console.info(`Discord: Logged in as "${discordClient.user.username}".`);
    discordClient.user.setPresence({
      activities: [
        {
          name: "🏠 Watching the house",
          type: ActivityType.Custom,
        },
      ],
      status: "online",
    });
    // If permissions allow, set the nickname to the custom one.
    setBotNickname(config.bot.nickname, discordClient, config);
    // Set initial state of the user.
    const self = await getSelf(discordClient, config);
    createHandleVoiceStatusUpdate(mqttClient, config)(undefined, self.voice);
  };

  return handler;
};

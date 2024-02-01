import { ActivityType, Client } from "discord.js";
import { MqttClient } from "mqtt";
import { getSelf } from "./discordUtility";
import { printInviteLink } from "./discordUtility";
import { setBotNickname } from "./discordUtility";
import { createHandleVoiceStatusUpdate } from "./handleVoiceStatusUpdate";
import { type BotConfig } from "./models/BotConfig";

/**
 * Creates a handle for when the Discord client is ready.
 *
 * @param {Client} discordClient - the Discord client
 * @param {MqttClient} mqttClient - the MQTT client
 * @return {() => Promise<void>} a function that returns a promise of void
 */
export const createHandleDiscordReady = (
  discordClient: Client,
  mqttClient: MqttClient,
  config: BotConfig,
): (() => Promise<void>) => {
  /**
   * A function that handles the initialization of the bot client and sets up various configurations and activities.
   *
   * @return {Promise<void>} A promise that resolves when the initialization is complete.
   */
  const handler = async (): Promise<void> => {
    if (!discordClient.user) {
      throw new Error("User is null - bot client is not properly initialized.");
    }

    // Generate an invite link and print to the console. (Must be logged in with the bot token)
    printInviteLink(discordClient);

    console.info(`Discord: Logged in as "${discordClient.user.username}".`);
    const initialActivity = "🏠 Watching the house";
    discordClient.user.setPresence({
      activities: [
        {
          name: initialActivity,
          type: ActivityType.Custom,
        },
      ],
      status: "online",
    });
    mqttClient.publish(config.mqtt.topics.activity, initialActivity);
    // If permissions allow, set the nickname to the custom one.
    setBotNickname(config.bot.nickname, discordClient, config);
    // Set initial state of the user.
    const self = await getSelf(discordClient, config);
    createHandleVoiceStatusUpdate(mqttClient, config)(undefined, self.voice);
  };

  return handler;
};

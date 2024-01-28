import { ActivityType } from "discord.js";
import { getSelf } from "./discordUtility";
import { printInviteLink } from "./discordUtility";
import { handleVoiceStatusUpdate } from "./handleVoiceStatusUpdate";
import { setBotNickname } from "./discordUtility";
import { d_client, config } from '.';

/**
 * Asynchronous function to handle the Discord ready event.
 *
 * @return {Promise<void>} Promise that resolves when the function completes.
 */
export const handleDiscordReady = async () => {
  if (!d_client.user) {
    throw new Error("User is null - bot client is not properly initialized.");
  }

  // Generate an invite link and print to the console. (Must be logged in with the bot token)
  printInviteLink();

  console.info(`Discord: Logged in as "${d_client.user.username}".`);
  d_client.user.setPresence({
    activities: [
      {
        name: "🏠 Watching the house",
        type: ActivityType.Custom,
      },
    ],
    status: "online",
  });
  // If permissions allow, set the nickname to the custom one.
  setBotNickname(config.bot.nickname);
  // Set initial state of the user.
  const self = await getSelf();
  handleVoiceStatusUpdate(undefined, self.voice);
};

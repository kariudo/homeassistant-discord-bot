import { GuildMember } from "discord.js";
import { setBotNickname } from './discordUtility';
import { setBotActivity } from './discordUtility';
import { moveToChannelByName } from './discordUtility';
import { getSelf } from './discordUtility';

/**
 * Process a command message and execute corresponding actions.
 *
 * @param {string} message - the command message to be processed
 * @return {void}
 */
export async function processCommand(message: string): Promise<void> {
  const you: GuildMember = await getSelf();
  const args: string[] = message.toString().split(" ");
  if (args.length === 0) {
    console.error("Empty command, ignoring.");
    return;
  }
  // Get the first word as the command, leave the rest as arguments.
  const command: string = args.shift()!.toLowerCase();
  switch (command) {
    case "mute":
      // Confirm the user is connected to a voice channel.
      if (!you.voice.channel) {
        console.error("User is not connected to a voice channel.");
        return;
      }
      // Mute the user
      you.voice.setMute(true);
      break;
    case "deaf":
      // Confirm the user is connected to a voice channel.
      if (!you.voice.channel) {
        console.error("User is not connected to a voice channel.");
        return;
      }
      // Deafen and mute the user.
      you.voice.setDeaf(true);
      you.voice.setMute(true);
      break;
    case "undeaf":
      // Confirm the user is connected to a voice channel.
      if (!you.voice.channel) {
        console.error("User is not connected to a voice channel.");
        return;
      }
      // Undeafen and unmute the user.
      you.voice.setDeaf(false);
      you.voice.setMute(false);
      break;
    case "unmute":
      // Confirm the user is connected to a voice channel.
      if (!you.voice.channel) {
        console.error("User is not connected to a voice channel.");
        return;
      }
      // Unmute the user.
      you.voice.setMute(false);
      break;
    case "disconnect":
      // Confirm the user is connected to a voice channel.
      if (!you.voice.channel) {
        console.error("User is not connected to a voice channel.");
        return;
      }
      // Disconnect the user.
      you.voice.disconnect();
      console.log("Disconnecting from voice channel.");
      break;
    case "move":
      // Confirm the user is connected to a voice channel.
      if (!you.voice.channel) {
        console.error("User is not connected to a voice channel.");
        return;
      }
      // Move the user.
      const channelName: string = args.join(" ").trim().toLowerCase();
      moveToChannelByName(channelName, you);
      break;
    case "bot_activity":
      const botActivity: string = args.join(" ").trim();
      setBotActivity(botActivity);
      break;
    case "bot_nick":
      const botNick: string = args.join(" ").trim();
      setBotNickname(botNick);
      break;
    default:
      console.error(`The command '${command}' is not supported.`);
  }
}

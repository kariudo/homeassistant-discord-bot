import { Client, GuildMember } from "discord.js";
import type { MqttClient } from "mqtt";
import { setBotNickname, setBotActivity, moveToChannelByName, getSelf } from "./discordUtility";
import { type BotConfig } from "./models/BotConfig";

/**
 * Process a command message and execute corresponding actions.
 *
 * @param {string} message - the command message to be processed
 * @param {Client} discordClient - the discord client
 * @param {BotConfig} config - the bot configuration
 * @return {Promise<void>}
 */
export async function processCommand(
  message: string,
  discordClient: Client,
  mqttClient: MqttClient,
  config: BotConfig,
): Promise<void> {
  const you: GuildMember = await getSelf(discordClient, config);
  const args: string[] = message.toString().split(" ");
  if (args.length === 0) {
    console.error("Empty command, ignoring.");
    return;
  }
  // Get the first word as the command, leave the rest as arguments.
  const command: string = args.shift()?.toLowerCase() ?? "MISSING_COMMAND";
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
    case "move": {
      // Confirm the user is connected to a voice channel.
      if (!you.voice.channel) {
        console.error("User is not connected to a voice channel.");
        return;
      }
      // Move the user.
      const channelName: string = args.join(" ").trim().toLowerCase();
      moveToChannelByName(channelName, you, discordClient, config);
      break;
    }
    case "bot_activity": {
      const botActivity: string = args.join(" ").trim();
      setBotActivity(botActivity, discordClient, mqttClient, config);
      break;
    }
    case "bot_nick": {
      const botNick: string = args.join(" ").trim();
      setBotNickname(botNick, discordClient, config);
      break;
    }
    default:
      console.error(`The command '${command}' is not supported.`);
  }
}

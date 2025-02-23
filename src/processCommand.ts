import { Client, GuildMember } from "discord.js";
import type { MqttClient } from "mqtt";
import {
  getSelf,
  moveToChannelByName,
  setBotActivity,
  setBotNickname,
} from "./discordUtility";
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
  try {
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
        try {
          // Mute the user
          await you.voice.setMute(true);
        } catch (error) {
          console.error("Failed to mute:", error);
        }
        break;
      case "deaf":
        // Confirm the user is connected to a voice channel.
        if (!you.voice.channel) {
          console.error("User is not connected to a voice channel.");
          return;
        }
        try {
          // Deafen and mute the user.
          await you.voice.setDeaf(true);
          await you.voice.setMute(true);
        } catch (error) {
          console.error("Failed to deafen:", error);
        }
        break;
      case "undeaf":
        // Confirm the user is connected to a voice channel.
        if (!you.voice.channel) {
          console.error("User is not connected to a voice channel.");
          return;
        }
        try {
          // Undeafen and unmute the user.
          await you.voice.setDeaf(false);
          await you.voice.setMute(false);
        } catch (error) {
          console.error("Failed to undeafen:", error);
        }
        break;
      case "unmute":
        // Confirm the user is connected to a voice channel.
        if (!you.voice.channel) {
          console.error("User is not connected to a voice channel.");
          return;
        }
        try {
          // Unmute the user.
          await you.voice.setMute(false);
        } catch (error) {
          console.error("Failed to unmute:", error);
        }
        break;
      case "disconnect":
        // Confirm the user is connected to a voice channel.
        if (!you.voice.channel) {
          console.error("User is not connected to a voice channel.");
          return;
        }
        try {
          // Disconnect the user.
          await you.voice.disconnect();
          console.log("Disconnecting from voice channel.");
        } catch (error) {
          console.error("Failed to disconnect:", error);
        }
        break;
      case "move": {
        // Confirm the user is connected to a voice channel.
        if (!you.voice.channel) {
          console.error("User is not connected to a voice channel.");
          return;
        }
        // Move the user.
        const channelName: string = args.join(" ").trim().toLowerCase();
        try {
          await moveToChannelByName(channelName, you, discordClient, config);
        } catch (error) {
          console.error("Failed to move:", error);
        }
        break;
      }
      case "bot_activity": {
        const botActivity: string = args.join(" ").trim();
        try {
          await setBotActivity(botActivity, discordClient, mqttClient, config);
        } catch (error) {
          console.error("Failed to set bot activity:", error);
        }
        break;
      }
      case "bot_nick": {
        const botNick: string = args.join(" ").trim();
        try {
          await setBotNickname(botNick, discordClient, config);
        } catch (error) {
          console.error("Failed to set bot nickname:", error);
        }
        break;
      }
      default:
        console.error(`The command '${command}' is not supported.`);
    }
  } catch (error) {
    console.error("An error occurred while processing command:", error);
  }
}

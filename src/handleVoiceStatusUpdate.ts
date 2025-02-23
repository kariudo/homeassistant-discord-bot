import {ChannelType,type Channel, type GuildMember, VoiceState} from "discord.js";
import {Client} from "discord.js";
import {MqttClient} from "mqtt";
import type {BotConfig} from "./models/BotConfig";
import {getGuild} from "./discordUtility";

/**
 * Create a handler for voice status updates.
 *
 * @param discordClient - the Discord client
 * @param {MqttClient} mqttClient - the MQTT client
 * @param {BotConfig} config - the bot configuration
 * @returns the voice status update handler
 */
export const createHandleVoiceStatusUpdate = (
  discordClient: Client,
  mqttClient: MqttClient,
  config: BotConfig,
) => {
  /**
   * Handles the voice status update for a member.
   *
   * @param {VoiceState} [oldState] - the old voice state
   * @param {VoiceState} newState - the new voice state
   */
  const handleVoiceStatusUpdate = async (
    oldState: VoiceState | undefined,
    newState: VoiceState,
  ) => {
    const memberId = oldState?.member?.id ?? newState.member?.id;
    if (!memberId) return;
    if (memberId === config.you.id) {
      const voiceUpdateInfo = {
        // Binary Sensor in Home Assistant like "ON" or "OFF".
        voice_connection: newState.channelId !== null ? "ON" : "OFF",
        mute: "unavailable",
        deaf: "unavailable",
        channel: "unavailable",
      };
      if (newState.channelId === null) {
        mqttClient.publish(
          config.mqtt.topics.voice,
          JSON.stringify(voiceUpdateInfo),
        );
      } else {
        voiceUpdateInfo.mute =
          newState.member?.voice.mute?.toString() ?? "unavailable";
        voiceUpdateInfo.deaf =
          newState.member?.voice.deaf?.toString() ?? "unavailable";
        voiceUpdateInfo.channel =
          newState.member?.voice.channel?.name ?? "unavailable";
        mqttClient.publish(
          config.mqtt.topics.voice,
          JSON.stringify(voiceUpdateInfo),
          {
            qos: 1,
            retain: true,
          },
        );
      }
      console.debug("Voice status update:", voiceUpdateInfo);
    }
    const guild = await getGuild(discordClient, config);
    const channels = guild.channels.cache.filter(
      (channel: Channel) => channel.type === ChannelType.GuildVoice,
    );
    const channelUsers: Record<string, string[]> = {};
    channels.forEach((channel: Channel) => {
      channelUsers[channel.id] = [];
    });
    guild.members.cache.forEach((member: GuildMember) => {
      // Add each member to the userlist for their current voice channel.
      const voiceChannel = member.voice.channel;
      if (voiceChannel) {
        channelUsers[voiceChannel?.id].push(member.user.username);
      }
    });
    const channelUserString = JSON.stringify({channels:channelUsers});
    mqttClient.publish(config.mqtt.topics.channels, channelUserString);
    // sum of all users in voice channels
    const userCount = Object.values(channelUsers).reduce(
      (acc, users) => acc + users.length,
      0,
    );
    mqttClient.publish(
      `${config.mqtt.topics.channels}/count`,
      JSON.stringify(userCount),
    );
  }
  return handleVoiceStatusUpdate;
};

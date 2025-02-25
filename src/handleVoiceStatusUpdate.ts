import {
  type Channel,
  ChannelType,
  Collection,
  type GuildMember,
  type VoiceBasedChannel,
  VoiceState,
} from "discord.js";
import { Client } from "discord.js";
import { MqttClient } from "mqtt";
import { getGuild } from "./discordUtility";
import type { BotConfig } from "./models/BotConfig";

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
    // Handle changes to your users voice channel change.
    if (memberId === config.you.id) {
      updateSelf(newState, mqttClient, config);
    }
    // Handle changes to other users voice channel changes.
    // This is probably overkill since it will update membership of all the
    // channels on each event.
    // TODO: Refactor - Only react to states changed by newstate.
    await updateAllOtherMembers(discordClient, config, mqttClient);
  };
  return handleVoiceStatusUpdate;
};

/**
 * Updates the MQTT topics with the users in each voice channel.
 *
 * @param {Client<boolean>} discordClient - the Discord client
 * @param {BotConfig} config - the bot configuration
 * @param {MqttClient} mqttClient - the MQTT client
 *
 * @returns {Promise<void>} a promise that resolves when the MQTT publish is complete
 */
async function updateAllOtherMembers(
  discordClient: Client<boolean>,
  config: BotConfig,
  mqttClient: MqttClient,
): Promise<void> {
  const guild = await getGuild(discordClient, config);
  const channels = guild.channels.cache.filter(
    (channel: Channel) => channel.type === ChannelType.GuildVoice,
  ) as Collection<string, VoiceBasedChannel>;
  const channelUsers: Record<string, string[]> = {};
  // Initialize a list of users for each voice channel.
  // biome-ignore lint/complexity/noForEach: `Collection` is not iterable
  channels.forEach((channel: Channel) => {
    channelUsers[channel.id] = [];
  });
  // Check each member to see if they are in a voice channel.
  // biome-ignore lint/complexity/noForEach: `Collection` is not iterable
  guild.members.cache.forEach((member: GuildMember) => {
    const voiceChannel = member.voice.channel;
    if (voiceChannel) {
      // Add to appropriate channel.
      channelUsers[voiceChannel.id].push(member.user.username);
    }
  });
  // Push the list of voice channel users.
  const channelUserString = JSON.stringify({ channels: channelUsers });
  mqttClient.publish(config.mqtt.topics.channels, channelUserString);
  // Sum of all users in voice channels
  const userCount = Object.values(channelUsers).reduce(
    (acc, users) => acc + users.length,
    0,
  );
  // Push the count of users in voice channels.
  mqttClient.publish(
    `${config.mqtt.topics.channels}/count`,
    JSON.stringify(userCount),
  );
}

/**
 * Update our users voice status information.
 *
 * @param {VoiceState} newState - the new voice state
 * @param {MqttClient} mqttClient - the MQTT client
 * @param {BotConfig} config - the bot configuration
 * @return {void}
 */
function updateSelf(
  newState: VoiceState,
  mqttClient: MqttClient,
  config: BotConfig,
): void {
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

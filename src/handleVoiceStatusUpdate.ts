import { VoiceState } from "discord.js";
import { config, m_client } from '.';

/**
 * Handles the voice status update for a member.
 *
 * @param {VoiceState} [oldState] - the old voice state
 * @param {VoiceState} newState - the new voice state
 */
export function handleVoiceStatusUpdate(
  oldState: VoiceState | undefined,
  newState: VoiceState
): void {
  const memberId = oldState?.member?.id ?? newState.member?.id;
  if (!memberId || memberId !== config.you.id) return;

  let voiceUpdateInfo = {
    // Binary Sensor in Home Assistant like "ON" or "OFF".
    voice_connection: newState.channelId !== null ? "ON" : "OFF",
    mute: "unavailable",
    deaf: "unavailable",
    channel: "unavailable",
  };
  console.debug("Voice status update:", voiceUpdateInfo);
  if (newState.channelId === null) {
    m_client.publish(config.mqtt.topics.voice, JSON.stringify(voiceUpdateInfo));
  } else {
    voiceUpdateInfo.mute =
      newState.member?.voice.mute?.toString() ?? "unavailable";
    voiceUpdateInfo.deaf =
      newState.member?.voice.deaf?.toString() ?? "unavailable";
    voiceUpdateInfo.channel =
      newState.member?.voice.channel?.name ?? "unavailable";
    m_client.publish(
      config.mqtt.topics.voice,
      JSON.stringify(voiceUpdateInfo),
      {
        qos: 1,
        retain: true,
      }
    );
  }
}

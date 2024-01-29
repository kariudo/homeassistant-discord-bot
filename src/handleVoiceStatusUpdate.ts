import { VoiceState } from "discord.js";
import { MqttClient } from "mqtt/*";
import { BotConfig } from './models/BotConfig';


/**
 * Create a handler for voice status updates.
 * 
 * @param {MqttClient} mqttClient - the MQTT client
 * @param {BotConfig} config - the bot configuration
 * @returns the voice status update handler
 */
export const createHandleVoiceStatusUpdate = (
  mqttClient: MqttClient,
  config: BotConfig
) => {
  /**
   * Handles the voice status update for a member.
   *
   * @param {VoiceState} [oldState] - the old voice state
   * @param {VoiceState} newState - the new voice state
   */
  const handleVoiceStatusUpdate = (
    oldState: VoiceState | undefined,
    newState: VoiceState
  ) => {
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
      mqttClient.publish(
        config.mqtt.topics.voice,
        JSON.stringify(voiceUpdateInfo)
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
        }
      );
    }
  }
  return handleVoiceStatusUpdate;
};

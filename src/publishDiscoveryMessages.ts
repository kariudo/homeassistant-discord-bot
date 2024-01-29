import { DiscoveryComponent } from "./models/DiscoveryComponent";
import { getVoiceChannelNames } from "./discordUtility";
import { BotConfig } from './models/BotConfig';
import { Client } from 'discord.js';
import { MqttClient } from 'mqtt';

/**
 * Asynchronously publishes discovery messages for Home Assistant MQTT integration.
 *
 * @param {BotConfig} config - the bot configuration
 * @return {Promise<void>} No return value
 */
export async function publishDiscoveryMessages(mqttClient: MqttClient, discordClient: Client, config: BotConfig): Promise<void> {
  console.debug("Home Assistant MQTT Online: Publishing discovery messages...");
  const deviceId = `discordUser_${config.you.id}`;
  // A list of discovery components to publish.
  const discoveryComponents: DiscoveryComponent[] = [];
  // A common device for the components.
  const device = {
    identifiers: [deviceId],
    name: "Discord User",
    configuration_url: "https://github.com/kariudo/homeassistant-discord-bot",
    model: "Discord user voice bot integration",
    manufacturer: "Kariudo",
  };

  // Voice connection sensor.
  discoveryComponents.push({
    topic: `${config.mqtt.topics.discovery}/binary_sensor/${deviceId}/voice/config`,
    payload: {
      name: "Discord User Voice Connection",
      value_template: "{{ value_json.voice_connection }}",
      state_topic: config.mqtt.topics.voice,
      unique_id: `${deviceId}_voice`,
      json_attributes_topic: config.mqtt.topics.voice,
      device: device,
      device_class: "connectivity",
    },
  });
  
  // Users Online sensor.
  discoveryComponents.push({
    topic: `${config.mqtt.topics.discovery}/sensor/${deviceId}/users_online/config`,
    payload: {
      name: "Discord User Guild Users Online",
      state_topic: config.mqtt.topics.online + '/count',
      json_attributes_topic: config.mqtt.topics.online,
      unique_id: `${deviceId}_users_online`,
      device: device,
    },
  });

  // Mute switch.
  discoveryComponents.push({
    topic: `${config.mqtt.topics.discovery}/switch/${deviceId}/mute/config`,
    payload: {
      name: "Discord User Mute",
      device_class: "switch",
      command_topic: config.mqtt.topics.command,
      state_topic: config.mqtt.topics.voice,
      state_on: "true",
      state_off: "false",
      value_template: "{{ value_json.mute }}",
      unique_id: `${deviceId}_mute`,
      device: device,
      payload_on: "mute",
      payload_off: "unmute",
      icon: "mdi:microphone-off",
      // Only available whened connected.
      availability_topic: config.mqtt.topics.voice,
      availability_template: "{{ value_json.voice_connection }}",
      payload_available: "ON",
      payload_not_available: "OFF",
    },
  });

  // Deaf switch.
  discoveryComponents.push({
    topic: `${config.mqtt.topics.discovery}/switch/${deviceId}/deaf/config`,
    payload: {
      name: "Discord User Deafen",
      device_class: "switch",
      command_topic: config.mqtt.topics.command,
      state_topic: config.mqtt.topics.voice,
      state_on: "true",
      state_off: "false",
      value_template: "{{ value_json.deaf }}",
      unique_id: `${deviceId}_deaf`,
      device: device,
      payload_on: "deaf",
      payload_off: "undeaf",
      icon: "mdi:headphones-off",
      // Only available when connected.
      availability_topic: config.mqtt.topics.voice,
      availability_template: "{{ value_json.voice_connection }}",
      payload_available: "ON",
      payload_not_available: "OFF",
    },
  });

  // Create a channel selector.
  discoveryComponents.push({
    topic: `${config.mqtt.topics.discovery}/select/${deviceId}/channel/config`,
    payload: {
      name: "Discord User Channel Selector",
      options: await getVoiceChannelNames(discordClient, config),
      command_topic: config.mqtt.topics.command,
      state_topic: config.mqtt.topics.voice,
      command_template: "move {{ value }}",
      value_template: "{{ value_json.channel }}",
      unique_id: `${deviceId}_channel`,
      device: device,
      icon: "mdi:account-voice",
      // Only available when already connected to a voice channel.
      availability_topic: config.mqtt.topics.voice,
      availability_template: "{{ value_json.voice_connection }}",
      payload_available: "ON",
      payload_not_available: "OFF",
    },
  });

  // Disconnect button.
  discoveryComponents.push({
    topic: `${config.mqtt.topics.discovery}/button/${deviceId}/disconnect/config`,
    payload: {
      name: "Discord User Disconnect",
      command_topic: config.mqtt.topics.command,
      state_topic: config.mqtt.topics.voice,
      command_template: "disconnect",
      unique_id: `${deviceId}_disconnect`,
      device: device,
      icon: "mdi:account-off",
      // Only available when already connected to a voice channel.
      availability_topic: config.mqtt.topics.voice,
      availability_template: "{{ value_json.voice_connection }}",
      payload_available: "ON",
      payload_not_available: "OFF",
    },
  });

  // Publish all the discovery components.
  discoveryComponents.forEach((component) => {
    mqttClient.publish(component.topic, JSON.stringify(component.payload), {
      qos: 1,
      retain: false, // No need to retain, as we publish when Home Assistant is online.
    });
  });
}

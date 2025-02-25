import { Client, Presence } from "discord.js";
import { MqttClient } from "mqtt";
import { getGuild } from "./discordUtility";
import type { BotConfig } from "./models/BotConfig";
import type { UserPresence } from "./models/UserPresence";

export const createHandlePresenceUpdate = (
  discordClient: Client,
  mqttClient: MqttClient,
  config: BotConfig,
) => {
  /**
   * Handles the update of presence information.
   *
   * @param {Presence | undefined} _oldPresence - the old presence information
   * @param {Presence | undefined} _newPresence - the new presence information
   * @return {void}
   */
  const handlePresenceUpdate = async (
    _oldPresence: Presence | null,
    _newPresence: Presence | null,
  ): Promise<void> => {
    const guild = await getGuild(discordClient, config);
    // Get the online presences from the guild.
    const onlinePresences = guild.presences.cache.filter(
      (presence: Presence) => presence.status !== "offline",
    );
    const online: UserPresence[] = [];
    for (const [_key, presence] of onlinePresences) {
      // Do not include the bot in the online list.
      if (presence.member?.user.bot) continue;
      // If the presence member is null, skip it with a warning.
      if (!presence.member) {
        console.warn("Presence member is null.");
        continue;
      }
      // Add a presence to the list of online.
      const userPresence: UserPresence = {
        username: presence.member.user.username,
        activity: presence.activities,
        voiceChannel: presence.member.voice?.channel?.name ?? null,
      };
      online.push(userPresence);
    }
    // Publish the online list to the MQTT topic.
    mqttClient.publish(config.mqtt.topics.online, JSON.stringify({ online }));
    // Also publish a count of the users online.
    mqttClient.publish(
      `${config.mqtt.topics.online}/count`,
      JSON.stringify(online.length),
    );
  };

  return handlePresenceUpdate;
};

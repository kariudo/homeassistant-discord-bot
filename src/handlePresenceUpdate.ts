import { Client, Presence } from "discord.js";
import { UserPresence } from "./models/UserPresence";
import { getGuild } from "./discordUtility";
import { MqttClient } from "mqtt/*";
import { BotConfig } from "./models/BotConfig";

export const createHandlePresenceUpdate = (
  discordClient: Client,
  mqttClient: MqttClient,
  config: BotConfig
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
    _newPresence: Presence | null
  ): Promise<void> => {
    const guild = await getGuild(discordClient, config);
    // Get the online presences from the guild.
    let onlinePresences = guild.presences.cache.filter(
      (presence: Presence) => presence.status !== "offline"
    );
    let online: UserPresence[] = [];
    onlinePresences.forEach((presence: Presence) => {
      // Do not include the bot in the online list.
      if (presence.member?.user.bot) return;
      // If the presence member is null, skip it with a warning.
      if (!presence.member) {
        console.warn("Presence member is null.");
        return;
      }
      // Add a presence to the list of online.
      const userPresence: UserPresence = {
        username: presence.member.user.username,
        activity: presence.activities,
      };
      online.push(userPresence);
    });
    const stringOfUsers = JSON.stringify(online);
    // Publish the online list to the MQTT topic.
    mqttClient.publish(
      config.mqtt.topics.online,
      JSON.stringify({ online: stringOfUsers })
    );
    // Also publish a count of the users online.
    mqttClient.publish(
      config.mqtt.topics.online + "/count",
      JSON.stringify(online.length)
    );
  };

  return handlePresenceUpdate;
};

import { Presence } from "discord.js";
import { UserPresence } from "./models/UserPresence";
import { m_client, config } from '.';
import { getGuild } from './discordUtility';

/**
 * Handles the update of presence information.
 *
 * @param {Presence | undefined} _oldPresence - the old presence information
 * @param {Presence | undefined} _newPresence - the new presence information
 * @return {void}
 */
export async function handlePresenceUpdate(
  _oldPresence: Presence | null,
  _newPresence: Presence | null
): Promise<void> {
  const guild = await getGuild();
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
  // Publish the online list to the MQTT topic.
  m_client.publish(config.mqtt.topics.online, JSON.stringify(online));
}

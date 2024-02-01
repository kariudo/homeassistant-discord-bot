import { Activity } from "discord.js";

export interface UserPresence {
  username: string;
  activity: Activity[];
}

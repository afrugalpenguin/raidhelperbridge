import type { WowClass, RaidRole, RaidSignup } from './types';

export interface EventData {
  eventId: string;
  title: string;
  description?: string;
  startTime: string;
  signups: RaidSignup[];
}

export interface RosterEntry {
  discordId: string;
  discordName: string;
  class: WowClass;
  role: RaidRole;
  spec?: string;
  wowCharacter: string;
}

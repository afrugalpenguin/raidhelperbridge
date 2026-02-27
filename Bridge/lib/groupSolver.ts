import type { RosterEntry } from './rosterTypes';

export interface GroupAssignment {
  groupNumber: number; // 1-5
  label: string;
  players: string[]; // player names, max 5
}

function getPlayerName(entry: RosterEntry): string {
  return entry.wowCharacter.trim() || entry.discordName;
}

// Auto-assign players to numbered groups, filling each to 5
export function autoAssignGroups(roster: RosterEntry[]): GroupAssignment[] {
  const numGroups = Math.min(Math.ceil(roster.length / 5), 5);
  const groups: GroupAssignment[] = [];

  for (let i = 0; i < numGroups; i++) {
    groups.push({
      groupNumber: i + 1,
      label: `Group ${i + 1}`,
      players: [],
    });
  }

  for (const entry of roster) {
    const name = getPlayerName(entry);
    for (const group of groups) {
      if (group.players.length < 5) {
        group.players.push(name);
        break;
      }
    }
  }

  return groups;
}

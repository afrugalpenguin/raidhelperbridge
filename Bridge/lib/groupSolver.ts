import type { WowClass, RaidRole, GroupTemplate } from './types';
import type { RosterEntry } from './rosterTypes';

export interface GroupAssignment {
  groupNumber: number; // 1-5
  label: string;
  players: string[]; // player names, max 5
}

// Default TBC group presets
export const GROUP_PRESETS: Record<string, { label: string; templates: GroupTemplate[] }> = {
  'tbc-10': {
    label: 'TBC 10-man',
    templates: [
      { name: 'Group 1', description: 'Tanks + Melee', priorityBuffs: ['windfury', 'battleshout'], preferredClasses: ['WARRIOR', 'ROGUE', 'PALADIN'], preferredRoles: ['tank', 'mdps'] },
      { name: 'Group 2', description: 'Ranged + Healers', priorityBuffs: ['moonkinaura', 'totemofwrath'], preferredClasses: ['MAGE', 'WARLOCK', 'HUNTER', 'PRIEST', 'DRUID', 'SHAMAN'], preferredRoles: ['rdps', 'healer'] },
    ],
  },
  'tbc-25': {
    label: 'TBC 25-man',
    templates: [
      { name: 'Melee', description: 'Melee DPS + Enhancement', priorityBuffs: ['windfury', 'battleshout', 'leaderofthepack'], preferredClasses: ['WARRIOR', 'ROGUE'], preferredRoles: ['mdps'] },
      { name: 'Casters', description: 'Caster DPS', priorityBuffs: ['totemofwrath', 'moonkinaura'], preferredClasses: ['MAGE', 'WARLOCK'], preferredRoles: ['rdps'] },
      { name: 'Hunters', description: 'Physical ranged', priorityBuffs: ['ferociousinspiration', 'trueshotaura'], preferredClasses: ['HUNTER', 'SHAMAN'], preferredRoles: ['rdps'] },
      { name: 'Healers', description: 'Healers + Mana tide', priorityBuffs: ['manatide', 'treeoflife'], preferredClasses: ['PRIEST', 'DRUID', 'PALADIN', 'SHAMAN'], preferredRoles: ['healer'] },
      { name: 'Tanks', description: 'Tank group', priorityBuffs: ['battleshout', 'devotionaura'], preferredClasses: ['WARRIOR', 'PALADIN', 'DRUID'], preferredRoles: ['tank'] },
    ],
  },
};

function getPlayerName(entry: RosterEntry): string {
  return entry.wowCharacter.trim() || entry.discordName;
}

// Auto-assign players to groups based on templates
export function autoAssignGroups(roster: RosterEntry[], templates: GroupTemplate[]): GroupAssignment[] {
  const groups: GroupAssignment[] = [];
  const assigned = new Set<string>();

  // Create group slots from templates (max 5)
  const numGroups = Math.min(Math.max(templates.length, Math.ceil(roster.length / 5)), 5);

  for (let i = 0; i < numGroups; i++) {
    const template = templates[i];
    groups.push({
      groupNumber: i + 1,
      label: template?.name || `Group ${i + 1}`,
      players: [],
    });
  }

  // Step 1: Assign by preferred role/class from templates
  for (let i = 0; i < groups.length; i++) {
    const template = templates[i];
    if (!template) continue;

    for (const entry of roster) {
      const name = getPlayerName(entry);
      if (assigned.has(name)) continue;
      if (groups[i].players.length >= 5) break;

      const classMatch = template.preferredClasses.includes(entry.class);
      const roleMatch = template.preferredRoles.includes(entry.role);

      if (classMatch || roleMatch) {
        groups[i].players.push(name);
        assigned.add(name);
      }
    }
  }

  // Step 2: Fill remaining players into any group with space
  for (const entry of roster) {
    const name = getPlayerName(entry);
    if (assigned.has(name)) continue;

    for (const group of groups) {
      if (group.players.length < 5) {
        group.players.push(name);
        assigned.add(name);
        break;
      }
    }
  }

  return groups;
}

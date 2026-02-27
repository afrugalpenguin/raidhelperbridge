import type { CCType, WowClass, RaidMarker } from './types';
import type { RosterEntry } from './rosterTypes';

// Which CC types each class can perform
export const CLASS_CC_ABILITIES: Record<WowClass, CCType[]> = {
  MAGE: ['polymorph'],
  WARLOCK: ['banish', 'fear', 'seduce'],
  PRIEST: ['shackle', 'mindcontrol'],
  DRUID: ['hibernate', 'cyclone'],
  ROGUE: ['sap'],
  HUNTER: ['freezingtrap', 'wyvern'],
  PALADIN: ['turnundead', 'repentance'],
  WARRIOR: [],
  SHAMAN: [],
};

// Human-readable CC labels
export const CC_LABELS: Record<CCType, string> = {
  polymorph: 'Polymorph',
  banish: 'Banish',
  fear: 'Fear',
  seduce: 'Seduce',
  shackle: 'Shackle',
  mindcontrol: 'Mind Control',
  hibernate: 'Hibernate',
  cyclone: 'Cyclone',
  sap: 'Sap',
  freezingtrap: 'Freezing Trap',
  wyvern: 'Wyvern Sting',
  turnundead: 'Turn Undead',
  repentance: 'Repentance',
};

export const MARKER_NAMES: Record<RaidMarker, string> = {
  1: 'Star', 2: 'Circle', 3: 'Diamond', 4: 'Triangle',
  5: 'Moon', 6: 'Square', 7: 'Cross', 8: 'Skull',
};

// Unicode symbols for raid markers (good enough for web UI)
export const MARKER_SYMBOLS: Record<RaidMarker, string> = {
  1: '\u2605', 2: '\u25CF', 3: '\u25C6', 4: '\u25B2',
  5: '\u263D', 6: '\u25A0', 7: '\u2715', 8: '\uD83D\uDC80',
};

export const MARKER_COLORS: Record<RaidMarker, string> = {
  1: '#FFD100', 2: '#FF7D0A', 3: '#A335EE', 4: '#1EFF00',
  5: '#69CCF0', 6: '#0070DE', 7: '#C41E3A', 8: '#FFFFFF',
};

export interface CCAssignment {
  marker: RaidMarker;
  entries: CCAssignmentEntry[];
}

export interface CCAssignmentEntry {
  playerName: string;
  ccType: CCType;
}

// Get player display name (wowCharacter if set, else discordName)
function getPlayerName(entry: RosterEntry): string {
  return entry.wowCharacter.trim() || entry.discordName;
}

// Get all CC types available from a roster
export function getAvailableCCTypes(roster: RosterEntry[]): CCType[] {
  const types = new Set<CCType>();
  for (const entry of roster) {
    for (const cc of CLASS_CC_ABILITIES[entry.class] || []) {
      types.add(cc);
    }
  }
  return Array.from(types);
}

// Get players who can perform a specific CC type
export function getPlayersForCC(roster: RosterEntry[], ccType: CCType): string[] {
  const capableClasses = new Set<WowClass>();
  for (const [cls, abilities] of Object.entries(CLASS_CC_ABILITIES)) {
    if (abilities.includes(ccType)) {
      capableClasses.add(cls as WowClass);
    }
  }
  return roster
    .filter(r => capableClasses.has(r.class))
    .map(getPlayerName);
}

// Auto-resolve CC assignments using a default priority
export function autoResolveCC(roster: RosterEntry[]): CCAssignment[] {
  const assignments: CCAssignment[] = [];

  // Default TBC CC priority: Square(6)=poly, Moon(5)=poly2, Triangle(4)=shackle/banish, Diamond(3)=trap
  const defaultRules: { marker: RaidMarker; ccTypes: CCType[] }[] = [
    { marker: 6, ccTypes: ['polymorph', 'freezingtrap'] },
    { marker: 5, ccTypes: ['polymorph', 'sap'] },
    { marker: 4, ccTypes: ['shackle', 'banish'] },
    { marker: 3, ccTypes: ['freezingtrap', 'hibernate'] },
  ];

  const usedPlayers = new Set<string>();

  for (const rule of defaultRules) {
    const entries: CCAssignmentEntry[] = [];

    for (const ccType of rule.ccTypes) {
      const players = getPlayersForCC(roster, ccType);
      const available = players.find(p => !usedPlayers.has(p));
      if (available) {
        entries.push({ playerName: available, ccType });
        usedPlayers.add(available);
        break; // Found a player for this marker
      }
    }

    if (entries.length > 0) {
      assignments.push({ marker: rule.marker, entries });
    }
  }

  return assignments;
}

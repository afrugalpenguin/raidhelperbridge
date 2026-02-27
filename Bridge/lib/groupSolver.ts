import type { RosterEntry } from './rosterTypes';

export interface GroupAssignment {
  groupNumber: number; // 1-5
  label: string;
  players: string[]; // player names, max 5
}

export interface StoredGroupTemplate {
  name: string;
  groups: { label: string; players: string[] }[];
}

const TEMPLATES_KEY = 'rhb-group-templates';

export function loadGroupTemplates(): StoredGroupTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGroupTemplate(name: string, groups: GroupAssignment[]): void {
  if (typeof window === 'undefined') return;
  const templates = loadGroupTemplates();
  // Overwrite if same name exists
  const filtered = templates.filter(t => t.name !== name);
  filtered.push({
    name,
    groups: groups.map(g => ({ label: g.label, players: [...g.players] })),
  });
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
  } catch {
    // localStorage full or unavailable
  }
}

export function deleteGroupTemplate(name: string): void {
  if (typeof window === 'undefined') return;
  const templates = loadGroupTemplates().filter(t => t.name !== name);
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch {
    // localStorage full or unavailable
  }
}

// Apply a saved template against the current roster.
// Known players go into their saved groups; unknown names are dropped.
// Roster players not in the template end up unassigned.
export function applyGroupTemplate(template: StoredGroupTemplate, roster: RosterEntry[]): GroupAssignment[] {
  const rosterNames = new Set(roster.map(r => r.wowCharacter.trim() || r.discordName));

  return template.groups.map((g, i) => ({
    groupNumber: i + 1,
    label: g.label,
    players: g.players.filter(name => rosterNames.has(name)),
  }));
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

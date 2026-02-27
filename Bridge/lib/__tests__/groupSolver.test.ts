import { describe, it, expect } from 'vitest';
import { autoAssignGroups, GROUP_PRESETS } from '../groupSolver';
import type { RosterEntry } from '../rosterTypes';

const makeRoster = (count: number, cls = 'WARRIOR' as const): RosterEntry[] =>
  Array.from({ length: count }, (_, i) => ({
    discordId: String(i),
    discordName: `Player${i}`,
    class: cls,
    role: 'mdps' as const,
    spec: undefined,
    wowCharacter: `Player${i}`,
  }));

describe('groupSolver', () => {
  it('assigns all players', () => {
    const roster = makeRoster(10);
    const groups = autoAssignGroups(roster, GROUP_PRESETS['tbc-10'].templates);
    const totalPlayers = groups.reduce((sum, g) => sum + g.players.length, 0);
    expect(totalPlayers).toBe(10);
  });

  it('creates max 5 groups', () => {
    const roster = makeRoster(25);
    const groups = autoAssignGroups(roster, GROUP_PRESETS['tbc-25'].templates);
    expect(groups.length).toBeLessThanOrEqual(5);
  });

  it('puts max 5 players per group', () => {
    const roster = makeRoster(25);
    const groups = autoAssignGroups(roster, GROUP_PRESETS['tbc-25'].templates);
    for (const g of groups) {
      expect(g.players.length).toBeLessThanOrEqual(5);
    }
  });

  it('handles empty roster', () => {
    const groups = autoAssignGroups([], GROUP_PRESETS['tbc-10'].templates);
    const totalPlayers = groups.reduce((sum, g) => sum + g.players.length, 0);
    expect(totalPlayers).toBe(0);
  });

  it('handles roster smaller than one group', () => {
    const roster = makeRoster(3);
    const groups = autoAssignGroups(roster, GROUP_PRESETS['tbc-10'].templates);
    const totalPlayers = groups.reduce((sum, g) => sum + g.players.length, 0);
    expect(totalPlayers).toBe(3);
  });

  it('assigns by role when templates specify preferences', () => {
    const mixed: RosterEntry[] = [
      { discordId: '1', discordName: 'Tank', class: 'PALADIN', role: 'tank', spec: undefined, wowCharacter: 'Tank' },
      { discordId: '2', discordName: 'Healer', class: 'PRIEST', role: 'healer', spec: undefined, wowCharacter: 'Healer' },
      { discordId: '3', discordName: 'DPS', class: 'ROGUE', role: 'mdps', spec: undefined, wowCharacter: 'DPS' },
    ];
    const groups = autoAssignGroups(mixed, GROUP_PRESETS['tbc-25'].templates);
    // Melee template prefers ROGUE + mdps role
    const meleeGroup = groups.find(g => g.label === 'Melee');
    expect(meleeGroup).toBeDefined();
    expect(meleeGroup!.players).toContain('DPS');
    // Healer template prefers PRIEST + healer role
    const healerGroup = groups.find(g => g.label === 'Healers');
    expect(healerGroup).toBeDefined();
    expect(healerGroup!.players).toContain('Healer');
  });
});

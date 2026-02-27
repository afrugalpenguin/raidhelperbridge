import { describe, it, expect } from 'vitest';
import { autoAssignGroups } from '../groupSolver';
import type { RosterEntry } from '../rosterTypes';

const makeRoster = (count: number, cls = 'WARRIOR' as const): RosterEntry[] =>
  Array.from({ length: count }, (_, i) => ({
    discordId: String(i),
    discordName: `Player${i}`,
    class: cls,
    role: 'mdps' as const,
    spec: undefined,
    signupStatus: 'confirmed' as const,
    wowCharacter: `Player${i}`,
  }));

describe('groupSolver', () => {
  it('assigns all players', () => {
    const roster = makeRoster(10);
    const groups = autoAssignGroups(roster);
    const totalPlayers = groups.reduce((sum, g) => sum + g.players.length, 0);
    expect(totalPlayers).toBe(10);
  });

  it('creates max 5 groups', () => {
    const roster = makeRoster(25);
    const groups = autoAssignGroups(roster);
    expect(groups.length).toBeLessThanOrEqual(5);
  });

  it('puts max 5 players per group', () => {
    const roster = makeRoster(25);
    const groups = autoAssignGroups(roster);
    for (const g of groups) {
      expect(g.players.length).toBeLessThanOrEqual(5);
    }
  });

  it('handles empty roster', () => {
    const groups = autoAssignGroups([]);
    const totalPlayers = groups.reduce((sum, g) => sum + g.players.length, 0);
    expect(totalPlayers).toBe(0);
  });

  it('handles roster smaller than one group', () => {
    const roster = makeRoster(3);
    const groups = autoAssignGroups(roster);
    expect(groups.length).toBe(1);
    expect(groups[0].players.length).toBe(3);
  });

  it('labels groups sequentially', () => {
    const roster = makeRoster(12);
    const groups = autoAssignGroups(roster);
    expect(groups.length).toBe(3);
    expect(groups[0].label).toBe('Group 1');
    expect(groups[1].label).toBe('Group 2');
    expect(groups[2].label).toBe('Group 3');
  });
});

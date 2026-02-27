import { describe, it, expect } from 'vitest';
import { autoResolveCC, getPlayersForCC, getAvailableCCTypes } from '../ccResolver';
import type { RosterEntry } from '../rosterTypes';

const makeRoster = (...entries: [string, string][]): RosterEntry[] =>
  entries.map(([name, cls], i) => ({
    discordId: String(i),
    discordName: name,
    class: cls as RosterEntry['class'],
    role: 'rdps' as const,
    spec: undefined,
    wowCharacter: name,
  }));

describe('ccResolver', () => {
  it('getPlayersForCC returns mages for polymorph', () => {
    const roster = makeRoster(['Frost', 'MAGE'], ['Tank', 'WARRIOR']);
    expect(getPlayersForCC(roster, 'polymorph')).toEqual(['Frost']);
  });

  it('getPlayersForCC returns warlocks for banish', () => {
    const roster = makeRoster(['Dot', 'WARLOCK'], ['Frost', 'MAGE']);
    expect(getPlayersForCC(roster, 'banish')).toEqual(['Dot']);
  });

  it('getAvailableCCTypes lists all CC from roster', () => {
    const roster = makeRoster(['Frost', 'MAGE'], ['Dot', 'WARLOCK']);
    const types = getAvailableCCTypes(roster);
    expect(types).toContain('polymorph');
    expect(types).toContain('banish');
    expect(types).toContain('fear');
    expect(types).not.toContain('sap');
  });

  it('autoResolveCC assigns markers', () => {
    const roster = makeRoster(['Frost', 'MAGE'], ['Dot', 'WARLOCK'], ['Arrow', 'HUNTER']);
    const assignments = autoResolveCC(roster);
    expect(assignments.length).toBeGreaterThan(0);
    // First marker should be Square (6) with polymorph
    expect(assignments[0].marker).toBe(6);
    expect(assignments[0].entries[0].ccType).toBe('polymorph');
    expect(assignments[0].entries[0].playerName).toBe('Frost');
  });

  it('autoResolveCC does not double-assign players', () => {
    const roster = makeRoster(['Frost', 'MAGE']);
    const assignments = autoResolveCC(roster);
    const allPlayers = assignments.flatMap(a => a.entries.map(e => e.playerName));
    expect(new Set(allPlayers).size).toBe(allPlayers.length);
  });

  it('autoResolveCC returns empty for no CC-capable roster', () => {
    const roster = makeRoster(['Tank', 'WARRIOR'], ['Heal', 'SHAMAN']);
    const assignments = autoResolveCC(roster);
    expect(assignments).toEqual([]);
  });
});

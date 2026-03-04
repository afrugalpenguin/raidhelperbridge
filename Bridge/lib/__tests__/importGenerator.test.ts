import { describe, it, expect } from 'vitest';
import { generateImportString, parseImportString, buildImportPayload } from '../importGenerator';
import type { ImportPayload, RaidEvent } from '../types';

describe('importGenerator', () => {
  const minimalPayload: ImportPayload = {
    version: 1,
    eventId: 'test-123',
    eventName: 'Test Event',
    eventTime: 1700000000,
    players: [],
  };

  it('generates a string starting with !RHB!', () => {
    const str = generateImportString(minimalPayload);
    expect(str).toMatch(/^!RHB!/);
  });

  it('round-trips encode/decode', () => {
    const str = generateImportString(minimalPayload);
    const decoded = parseImportString(str);
    expect(decoded).toEqual(minimalPayload);
  });

  it('round-trips with players', () => {
    const payload: ImportPayload = {
      ...minimalPayload,
      players: [
        { name: 'Frostbolt', class: 'MAGE', role: 'rdps', spec: 'frost' },
        { name: 'Tankadin', class: 'PALADIN', role: 'tank', spec: 'protection' },
      ],
    };
    const str = generateImportString(payload);
    const decoded = parseImportString(str);
    expect(decoded).toEqual(payload);
  });

  it('round-trips with CC assignments', () => {
    const payload: ImportPayload = {
      ...minimalPayload,
      players: [{ name: 'Frostbolt', class: 'MAGE', role: 'rdps' }],
      ccAssignments: [
        { marker: 6, assignments: [{ ccType: 'polymorph', playerName: 'Frostbolt' }] },
      ],
    };
    const str = generateImportString(payload);
    const decoded = parseImportString(str);
    expect(decoded).toEqual(payload);
  });

  it('round-trips with group assignments', () => {
    const payload: ImportPayload = {
      ...minimalPayload,
      players: [{ name: 'Frostbolt', class: 'MAGE', role: 'rdps' }],
      groupAssignments: [
        { groupNumber: 1, label: 'Casters', players: ['Frostbolt'] },
      ],
    };
    const str = generateImportString(payload);
    const decoded = parseImportString(str);
    expect(decoded).toEqual(payload);
  });

  it('returns null for invalid import string', () => {
    expect(parseImportString('garbage')).toBeNull();
    expect(parseImportString('!RHB!invalidbase64$$$')).toBeNull();
  });

  it('builds payload from event', () => {
    const event: RaidEvent = {
      eventId: '1', serverId: 's', channelId: 'c', messageId: 'm',
      title: 'Test', startTime: new Date(1700000000000),
      signups: [{
        discordId: 'd1', discordName: 'Player1', class: 'MAGE',
        role: 'rdps', signupTime: new Date(), status: 'confirmed',
      }],
      createdBy: 'leader',
    };
    const payload = buildImportPayload(event);
    expect(payload.version).toBe(1);
    expect(payload.players).toHaveLength(1);
    expect(payload.players[0].name).toBe('Player1');
  });

  it('round-trips a 10-player payload with 2 groups (10-man split)', () => {
    const event: RaidEvent = {
      eventId: 'test-split', serverId: '1', channelId: '1', messageId: '1',
      title: 'Kara Raid 1', startTime: new Date('2026-03-04T20:00:00Z'),
      signups: Array.from({ length: 10 }, (_, i) => ({
        discordId: `d${i}`,
        discordName: `Player${i}`,
        wowCharacter: `Char${i}`,
        class: (['WARRIOR', 'PALADIN', 'PRIEST', 'MAGE', 'WARLOCK', 'ROGUE', 'HUNTER', 'DRUID', 'SHAMAN', 'WARRIOR'] as const)[i],
        role: (i < 2 ? 'tank' : i < 4 ? 'healer' : 'dps') as 'tank' | 'healer' | 'dps',
        signupTime: new Date(),
        status: 'confirmed' as const,
      })),
      createdBy: 'test',
    };

    const groups = [
      { groupNumber: 1, label: 'Group 1', players: ['Char0', 'Char2', 'Char4', 'Char6', 'Char8'] },
      { groupNumber: 2, label: 'Group 2', players: ['Char1', 'Char3', 'Char5', 'Char7', 'Char9'] },
    ];

    const cc = [
      { marker: 5 as const, assignments: [{ ccType: 'polymorph' as const, playerName: 'Char3' }] },
    ];

    const payload = buildImportPayload(event, undefined, undefined, cc, groups);
    expect(payload.players).toHaveLength(10);
    expect(payload.groupAssignments).toHaveLength(2);

    const importStr = generateImportString(payload);
    expect(importStr.startsWith('!RHB!')).toBe(true);

    const parsed = parseImportString(importStr);
    expect(parsed).not.toBeNull();
    expect(parsed!.players).toHaveLength(10);
    expect(parsed!.groupAssignments).toHaveLength(2);
    expect(parsed!.ccAssignments).toHaveLength(1);
  });

  it('uses wowCharacter name when available', () => {
    const event: RaidEvent = {
      eventId: '1', serverId: 's', channelId: 'c', messageId: 'm',
      title: 'Test', startTime: new Date(1700000000000),
      signups: [{
        discordId: 'd1', discordName: 'DiscordGuy', wowCharacter: 'Frostbolt',
        class: 'MAGE', role: 'rdps', signupTime: new Date(), status: 'confirmed',
      }],
      createdBy: 'leader',
    };
    const payload = buildImportPayload(event);
    expect(payload.players[0].name).toBe('Frostbolt');
  });
});

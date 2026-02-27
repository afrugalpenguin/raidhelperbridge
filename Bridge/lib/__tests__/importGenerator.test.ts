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

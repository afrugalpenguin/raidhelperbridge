import { ImportPayload, WowClass, RaidRole } from './types';
import { generateImportString } from './importGenerator';

const MOCK_PLAYERS: { name: string; class: WowClass; role: RaidRole; spec?: string }[] = [
    { name: 'Tankadin', class: 'PALADIN', role: 'tank', spec: 'protection' },
    { name: 'Beartank', class: 'DRUID', role: 'tank', spec: 'feral' },
    { name: 'Frostbolt', class: 'MAGE', role: 'rdps', spec: 'frost' },
    { name: 'Icyveins', class: 'MAGE', role: 'rdps', spec: 'frost' },
    { name: 'Dotmaster', class: 'WARLOCK', role: 'rdps', spec: 'affliction' },
    { name: 'Backstab', class: 'ROGUE', role: 'mdps', spec: 'combat' },
    { name: 'Windrunner', class: 'HUNTER', role: 'rdps', spec: 'beastmastery' },
    { name: 'Holybolt', class: 'PALADIN', role: 'healer', spec: 'holy' },
    { name: 'Treeheals', class: 'DRUID', role: 'healer', spec: 'restoration' },
    { name: 'Spiritlink', class: 'SHAMAN', role: 'healer', spec: 'restoration' },
];

export const MOCK_PAYLOAD: ImportPayload = {
    version: 1,
    eventId: 'mock-kara-001',
    eventName: 'Karazhan Thursday',
    eventTime: Math.floor(Date.now() / 1000) + 86400,
    players: MOCK_PLAYERS,
    ccAssignments: [
        {
            marker: 6,
            assignments: [{ ccType: 'polymorph', playerName: 'Frostbolt' }],
        },
        {
            marker: 5,
            assignments: [{ ccType: 'polymorph', playerName: 'Icyveins' }],
        },
        {
            marker: 4,
            assignments: [{ ccType: 'banish', playerName: 'Dotmaster' }],
        },
        {
            marker: 3,
            assignments: [{ ccType: 'freezingtrap', playerName: 'Windrunner' }],
        },
    ],
};

export function getMockImportString(): string {
    return generateImportString(MOCK_PAYLOAD);
}

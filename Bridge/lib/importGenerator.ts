/**
 * Import String Generator
 * 
 * Creates compressed strings that the WoW addon can parse.
 * Format similar to WeakAuras import strings.
 */

import pako from 'pako';
import { 
    ImportPayload, 
    RaidEvent, 
    CCTemplate, 
    GroupTemplate,
    CCType,
    RaidMarker,
    WowClass
} from './types';

// CC abilities each class can use
const CLASS_CC_ABILITIES: Record<WowClass, CCType[]> = {
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

/**
 * Resolve CC template against actual signups
 * Turns "1st Mage" into "Frostbolt" (actual player name)
 */
export function resolveCCAssignments(
    event: RaidEvent,
    template: CCTemplate
): ImportPayload['ccAssignments'] {
    const assignments: ImportPayload['ccAssignments'] = [];
    
    // Group players by class
    const playersByClass: Record<WowClass, string[]> = {
        WARRIOR: [], PALADIN: [], HUNTER: [], ROGUE: [],
        PRIEST: [], SHAMAN: [], MAGE: [], WARLOCK: [], DRUID: []
    };
    
    for (const signup of event.signups) {
        if (signup.status === 'confirmed' || signup.status === 'tentative') {
            const name = signup.wowCharacter || signup.discordName;
            playersByClass[signup.class].push(name);
        }
    }
    
    // Process each marker's rules
    for (const rule of template.rules) {
        const markerAssignments: { ccType: CCType; playerName: string }[] = [];
        
        for (const priority of rule.priority) {
            // Find which classes can use this CC type
            const capableClasses = Object.entries(CLASS_CC_ABILITIES)
                .filter(([_, abilities]) => abilities.includes(priority.ccType))
                .map(([cls]) => cls as WowClass);
            
            // Find the Nth player of a capable class
            for (const cls of capableClasses) {
                const players = playersByClass[cls];
                const playerIndex = priority.classOrder - 1; // 1-indexed to 0-indexed
                
                if (players.length > playerIndex) {
                    markerAssignments.push({
                        ccType: priority.ccType,
                        playerName: players[playerIndex],
                    });
                    break; // Found a player for this priority level
                }
            }
        }
        
        if (markerAssignments.length > 0) {
            assignments.push({
                marker: rule.marker,
                assignments: markerAssignments,
            });
        }
    }
    
    return assignments;
}

/**
 * Build the import payload from event data and templates
 */
export function buildImportPayload(
    event: RaidEvent,
    ccTemplate?: CCTemplate,
    groupTemplates?: GroupTemplate[]
): ImportPayload {
    const payload: ImportPayload = {
        version: 1,
        eventId: event.eventId,
        eventName: event.title,
        eventTime: Math.floor(event.startTime.getTime() / 1000),
        players: event.signups
            .filter(s => s.status === 'confirmed' || s.status === 'tentative')
            .map(s => ({
                name: s.wowCharacter || s.discordName,
                class: s.class,
                role: s.role,
                spec: s.spec,
            })),
    };
    
    if (ccTemplate) {
        payload.ccTemplate = ccTemplate;
        payload.ccAssignments = resolveCCAssignments(event, ccTemplate);
    }
    
    if (groupTemplates) {
        payload.groupTemplates = groupTemplates;
    }
    
    return payload;
}

/**
 * Compress payload to import string
 * Format: !RHB!<base64-compressed-json>
 */
export function generateImportString(payload: ImportPayload): string {
    const json = JSON.stringify(payload);
    const compressed = pako.deflate(json);
    const base64 = Buffer.from(compressed).toString('base64');
    return `!RHB!${base64}`;
}

/**
 * Decompress import string back to payload (for testing/debugging)
 */
export function parseImportString(importString: string): ImportPayload | null {
    try {
        if (!importString.startsWith('!RHB!')) {
            return null;
        }
        
        const base64 = importString.slice(5);
        const compressed = Buffer.from(base64, 'base64');
        const json = pako.inflate(compressed, { to: 'string' });
        return JSON.parse(json);
    } catch (e) {
        console.error('Failed to parse import string:', e);
        return null;
    }
}

/**
 * Generate a human-readable summary of the import
 */
export function generateImportSummary(payload: ImportPayload): string {
    const lines: string[] = [];
    
    lines.push(`Event: ${payload.eventName}`);
    lines.push(`Time: ${new Date(payload.eventTime * 1000).toLocaleString()}`);
    lines.push(`Players: ${payload.players.length}`);
    lines.push('');
    
    // Group by class
    const byClass: Record<string, string[]> = {};
    for (const player of payload.players) {
        if (!byClass[player.class]) {
            byClass[player.class] = [];
        }
        byClass[player.class].push(player.name);
    }
    
    lines.push('Roster:');
    for (const [cls, players] of Object.entries(byClass)) {
        lines.push(`  ${cls}: ${players.join(', ')}`);
    }
    
    if (payload.ccAssignments && payload.ccAssignments.length > 0) {
        lines.push('');
        lines.push('CC Assignments:');
        const markerNames = ['Star', 'Circle', 'Diamond', 'Triangle', 'Moon', 'Square', 'Cross', 'Skull'];
        for (const assignment of payload.ccAssignments) {
            const markerName = markerNames[assignment.marker - 1];
            for (const cc of assignment.assignments) {
                lines.push(`  ${markerName}: ${cc.playerName} (${cc.ccType})`);
            }
        }
    }
    
    return lines.join('\n');
}

// Default CC template for TBC raids
export const DEFAULT_CC_TEMPLATE: CCTemplate = {
    name: 'TBC Default',
    description: 'Standard CC priority for TBC raids',
    rules: [
        {
            marker: 6, // Square
            priority: [
                { ccType: 'polymorph', classOrder: 1 },
                { ccType: 'freezingtrap', classOrder: 1 },
            ],
        },
        {
            marker: 5, // Moon
            priority: [
                { ccType: 'polymorph', classOrder: 2 },
                { ccType: 'sap', classOrder: 1 },
            ],
        },
        {
            marker: 4, // Triangle
            priority: [
                { ccType: 'shackle', classOrder: 1 },
                { ccType: 'banish', classOrder: 1 },
            ],
        },
        {
            marker: 3, // Diamond
            priority: [
                { ccType: 'freezingtrap', classOrder: 2 },
                { ccType: 'hibernate', classOrder: 1 },
            ],
        },
    ],
};

// Default group templates for TBC
export const DEFAULT_GROUP_TEMPLATES: GroupTemplate[] = [
    {
        name: 'Melee Group',
        description: 'Melee DPS with Windfury',
        priorityBuffs: ['windfury', 'battleshout', 'leaderofthepack'],
        preferredClasses: ['WARRIOR', 'ROGUE'],
        preferredRoles: ['mdps'],
    },
    {
        name: 'Caster Group',
        description: 'Casters with Shadow Priest',
        priorityBuffs: ['totemofwrath', 'moonkinaura', 'vampirictouch'],
        preferredClasses: ['MAGE', 'WARLOCK'],
        preferredRoles: ['rdps'],
    },
    {
        name: 'Healer Group',
        description: 'Healers with Mana Tide',
        priorityBuffs: ['manatide', 'manaspring', 'treeoflife'],
        preferredClasses: ['PRIEST', 'DRUID', 'PALADIN', 'SHAMAN'],
        preferredRoles: ['healer'],
    },
];

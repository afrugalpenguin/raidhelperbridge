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
} from './types';

/**
 * Build the import payload from event data and templates
 */
export function buildImportPayload(
    event: RaidEvent,
    ccTemplate?: CCTemplate,
    groupTemplates?: GroupTemplate[],
    resolvedCC?: ImportPayload['ccAssignments'],
    groupAssignments?: ImportPayload['groupAssignments'],
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

    if (resolvedCC) {
        payload.ccAssignments = resolvedCC;
    } else if (ccTemplate) {
        payload.ccTemplate = ccTemplate;
    }

    if (groupAssignments) {
        payload.groupAssignments = groupAssignments;
    } else if (groupTemplates) {
        payload.groupTemplates = groupTemplates;
    }

    // Build character mappings from signups
    const characterMappings: Record<string, string> = {};
    for (const s of event.signups) {
        if (s.wowCharacter) {
            characterMappings[s.discordId] = s.wowCharacter;
        }
    }
    if (Object.keys(characterMappings).length > 0) {
        payload.characterMappings = characterMappings;
    }

    return payload;
}

/**
 * Compress payload to import string
 * Format: !RHB!<base64-compressed-json>
 */
export function generateImportString(payload: ImportPayload): string {
    const json = JSON.stringify(payload);
    const compressed = pako.deflateRaw(json);
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
        const json = pako.inflateRaw(compressed, { to: 'string' });
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
            for (let i = 0; i < assignment.assignments.length; i++) {
                const cc = assignment.assignments[i];
                const label = i === 0 ? '' : ' [fallback]';
                lines.push(`  ${markerName}: ${cc.playerName} (${cc.ccType})${label}`);
            }
        }
    }

    if (payload.groupAssignments && payload.groupAssignments.length > 0) {
        lines.push('');
        lines.push('Group Assignments:');
        for (const group of payload.groupAssignments) {
            const players = group.players.length > 0 ? group.players.join(', ') : '(empty)';
            lines.push(`  Group ${group.groupNumber} (${group.label}): ${players}`);
        }
    }

    return lines.join('\n');
}


/**
 * Discord Embed Parser for Raid-Helper
 * 
 * Parses Raid-Helper embed messages to extract event and signup data.
 * This is the fallback method when API access isn't available.
 * 
 * Raid-Helper embeds typically have this structure:
 * - Title: Event name
 * - Description: Event description
 * - Fields: Role sections with signups (Tank, Healer, DPS, etc.)
 * - Footer: Event ID and timing info
 */

import { 
    RaidEvent, 
    RaidSignup, 
    WowClass, 
    RaidRole, 
    RaidHelperEmbed,
    RAID_HELPER_CLASS_EMOJIS,
    RAID_HELPER_ROLE_EMOJIS
} from './types';

// Regex patterns for parsing Raid-Helper embeds
const PATTERNS = {
    // Matches: "<emoji> PlayerName" or "1. <emoji> PlayerName" or just "PlayerName"
    signupLine: /^(?:\d+\.\s*)?(?:<:[^:]+:\d+>\s*)?(.+?)(?:\s*\(.*\))?$/,
    // Matches event ID in footer: "Event ID: abc123"
    eventId: /Event ID:\s*(\w+)/i,
    // Matches timestamp formats
    timestamp: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/,
    // Matches class names in various formats
    className: /\b(warrior|paladin|hunter|rogue|priest|shaman|mage|warlock|druid)\b/i,
    // Matches custom emoji format: <:name:id>
    customEmoji: /<:([^:]+):(\d+)>/g,
    // Matches role count: "Tank (2/2)" or "Healers [3]"
    roleCount: /\((\d+)(?:\/(\d+))?\)|\[(\d+)\]/,
};

/**
 * Detects if a Discord embed is from Raid-Helper
 */
export function isRaidHelperEmbed(embed: RaidHelperEmbed): boolean {
    // Raid-Helper embeds typically have:
    // - Specific field names (Tank, Healer, DPS, etc.)
    // - Footer with "Raid-Helper" or event ID
    // - Specific color (often gold/orange)
    
    if (!embed.fields || embed.fields.length === 0) {
        return false;
    }
    
    // Check for typical Raid-Helper field names
    const raidHelperFields = ['tank', 'healer', 'dps', 'damage', 'support', 'bench', 'tentative', 'absence'];
    const hasRaidHelperFields = embed.fields.some(field => 
        raidHelperFields.some(name => 
            field.name.toLowerCase().includes(name)
        )
    );
    
    // Check footer for Raid-Helper indicators
    const hasRaidHelperFooter = embed.footer?.text?.toLowerCase().includes('raid-helper') ||
                                 embed.footer?.text?.match(PATTERNS.eventId);
    
    return hasRaidHelperFields || !!hasRaidHelperFooter;
}

/**
 * Parse a single signup line from a field value
 */
function parseSignupLine(line: string, fieldName: string): Partial<RaidSignup> | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'none') {
        return null;
    }
    
    // Extract player name (remove numbering, emojis, and status indicators)
    let playerName = trimmed
        .replace(/^\d+\.\s*/, '')           // Remove numbering "1. "
        .replace(/<:[^>]+>/g, '')            // Remove custom emojis
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove unicode emojis
        .replace(/\s*\([^)]*\)\s*$/, '')     // Remove trailing (status)
        .replace(/\s*\[[^\]]*\]\s*$/, '')    // Remove trailing [info]
        .trim();
    
    if (!playerName) {
        return null;
    }
    
    // Try to detect class from emoji or text
    let wowClass: WowClass = 'WARRIOR'; // Default
    const classMatch = trimmed.match(PATTERNS.className);
    if (classMatch) {
        wowClass = RAID_HELPER_CLASS_EMOJIS[classMatch[1].toLowerCase()] || 'WARRIOR';
    }
    
    // Detect role from field name
    let role: RaidRole = 'dps';
    for (const [keyword, raidRole] of Object.entries(RAID_HELPER_ROLE_EMOJIS)) {
        if (fieldName.toLowerCase().includes(keyword)) {
            role = raidRole;
            break;
        }
    }
    
    // Detect status from line content
    let status: RaidSignup['status'] = 'confirmed';
    if (trimmed.toLowerCase().includes('tentative') || trimmed.includes('?')) {
        status = 'tentative';
    } else if (trimmed.toLowerCase().includes('bench')) {
        status = 'bench';
    } else if (trimmed.toLowerCase().includes('absence') || trimmed.toLowerCase().includes('absent')) {
        status = 'absence';
    }
    
    return {
        discordName: playerName,
        wowCharacter: playerName, // Assume same name unless mapped
        class: wowClass,
        role,
        status,
    };
}

/**
 * Parse all signups from a field
 */
function parseFieldSignups(field: { name: string; value: string }): Partial<RaidSignup>[] {
    const signups: Partial<RaidSignup>[] = [];
    const lines = field.value.split('\n');
    
    for (const line of lines) {
        const signup = parseSignupLine(line, field.name);
        if (signup) {
            signups.push(signup);
        }
    }
    
    return signups;
}

/**
 * Parse event date/time from embed
 */
function parseEventTime(embed: RaidHelperEmbed): Date {
    // Try to find timestamp in description or fields
    const searchText = [
        embed.description || '',
        embed.timestamp || '',
        ...embed.fields.map(f => `${f.name} ${f.value}`)
    ].join(' ');
    
    // If embed has ISO timestamp, use that
    if (embed.timestamp) {
        return new Date(embed.timestamp);
    }
    
    // Try to parse from text
    const timestampMatch = searchText.match(PATTERNS.timestamp);
    if (timestampMatch) {
        return new Date(timestampMatch[1]);
    }
    
    // Default to now if can't parse
    return new Date();
}

/**
 * Parse event ID from footer
 */
function parseEventId(embed: RaidHelperEmbed): string {
    if (embed.footer?.text) {
        const match = embed.footer.text.match(PATTERNS.eventId);
        if (match) {
            return match[1];
        }
    }
    
    // Generate a fallback ID from title and timestamp
    const hash = (embed.title + embed.timestamp).split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    
    return `local_${Math.abs(hash).toString(16)}`;
}

/**
 * Main parser: Convert a Raid-Helper embed to our RaidEvent structure
 */
export function parseRaidHelperEmbed(
    embed: RaidHelperEmbed,
    messageId: string,
    channelId: string,
    serverId: string
): RaidEvent {
    const signups: RaidSignup[] = [];
    
    // Parse signups from each field
    for (const field of embed.fields) {
        const fieldSignups = parseFieldSignups(field);
        for (const signup of fieldSignups) {
            signups.push({
                discordId: '', // Will be filled in by Discord.js if available
                discordName: signup.discordName || 'Unknown',
                wowCharacter: signup.wowCharacter,
                class: signup.class || 'WARRIOR',
                role: signup.role || 'dps',
                signupTime: new Date(),
                status: signup.status || 'confirmed',
            });
        }
    }
    
    return {
        eventId: parseEventId(embed),
        serverId,
        channelId,
        messageId,
        title: embed.title || 'Untitled Event',
        description: embed.description,
        startTime: parseEventTime(embed),
        signups,
        createdBy: '',
    };
}

/**
 * Parse multiple embeds from a Discord message (Raid-Helper sometimes uses multiple)
 */
export function parseRaidHelperMessage(
    embeds: RaidHelperEmbed[],
    messageId: string,
    channelId: string,
    serverId: string
): RaidEvent | null {
    // Find the main Raid-Helper embed
    const raidEmbed = embeds.find(isRaidHelperEmbed);
    if (!raidEmbed) {
        return null;
    }
    
    return parseRaidHelperEmbed(raidEmbed, messageId, channelId, serverId);
}

/**
 * Enhance signup data with class detection from custom emojis
 * This requires knowing the server's custom emoji mappings
 */
export function enhanceSignupsWithEmojiMapping(
    event: RaidEvent,
    emojiMap: Record<string, WowClass>
): RaidEvent {
    // This would be called if we have access to the server's custom emoji definitions
    // For now, just return the event unchanged
    return event;
}

// Types for Raid-Helper Bridge

export interface RaidSignup {
    discordId: string;
    discordName: string;
    wowCharacter?: string;  // May need manual mapping
    class: WowClass;
    role: RaidRole;
    spec?: string;
    position?: number;      // Raid-Helper lineup position (1-indexed, 5 per group)
    groupNumber?: number;   // From raidplan API — explicit group assignment (1-indexed)
    signupTime: Date;
    status: 'confirmed' | 'tentative' | 'bench' | 'late' | 'absence';
}

export interface RaidEvent {
    eventId: string;
    serverId: string;
    channelId: string;
    messageId: string;
    title: string;
    description?: string;
    startTime: Date;
    endTime?: Date;
    signups: RaidSignup[];
    createdBy: string;
}

export type WowClass = 
    | 'WARRIOR' 
    | 'PALADIN' 
    | 'HUNTER' 
    | 'ROGUE' 
    | 'PRIEST' 
    | 'SHAMAN' 
    | 'MAGE' 
    | 'WARLOCK' 
    | 'DRUID';

export type RaidRole = 'tank' | 'healer' | 'mdps' | 'rdps' | 'dps';

export type CCType = 
    | 'polymorph'
    | 'banish'
    | 'fear'
    | 'seduce'
    | 'shackle'
    | 'mindcontrol'
    | 'hibernate'
    | 'cyclone'
    | 'sap'
    | 'freezingtrap'
    | 'wyvern'
    | 'turnundead'
    | 'repentance';

export type RaidMarker = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
// 1=Star, 2=Circle, 3=Diamond, 4=Triangle, 5=Moon, 6=Square, 7=Cross, 8=Skull

export interface CCAssignmentRule {
    marker: RaidMarker;
    priority: {
        ccType: CCType;
        classOrder: number;  // 1st mage, 2nd mage, etc.
    }[];
}

export interface CCTemplate {
    name: string;
    description?: string;
    rules: CCAssignmentRule[];
}

export interface GroupTemplate {
    name: string;
    description?: string;
    priorityBuffs: string[];
    preferredClasses: WowClass[];
    preferredRoles: RaidRole[];
}

export interface ImportPayload {
    version: number;
    eventId: string;
    eventName: string;
    eventTime: number;  // Unix timestamp
    players: {
        name: string;
        class: WowClass;
        role: RaidRole;
        spec?: string;
    }[];
    ccTemplate?: CCTemplate;
    groupTemplates?: GroupTemplate[];
    // Resolved CC assignments (after applying template to actual signups)
    ccAssignments?: {
        marker: RaidMarker;
        assignments: {
            ccType: CCType;
            playerName: string;
        }[];
    }[];
    groupAssignments?: {
        groupNumber: number;
        label: string;
        players: string[];
    }[];
    characterMappings?: Record<string, string>; // discordId -> wowName
}

// Raid-Helper API v2 response types
export interface RaidHelperSignUp {
    id: string;
    name: string;         // Discord display name
    className: string;    // "Hunter", "Mage", "Absence", "Bench", etc.
    specName: string;     // "Beastmastery", "Holy1", "Feral1", etc.
    roleName: string;     // "Tanks", "Melee", "Ranged", "Healers"
    entryTime: number;
    position: number;
    status: string;
    userId: string;
}

export interface RaidHelperApiResponse {
    id: string;
    channelId: string;
    guildId: string;
    leaderId: string;
    title: string;
    description: string;
    startTime: number;    // Unix timestamp
    endTime: number;
    signUps: RaidHelperSignUp[];
    lastUpdated: number;
    templateId: string;
    advancedSettings: Record<string, unknown>;
}

// Discord-to-WoW character mapping (stored per user/server)
export interface CharacterMapping {
    discordId: string;
    serverId: string;
    wowCharacters: {
        name: string;
        class: WowClass;
        isMain: boolean;
    }[];
}

// Raid-Helper specific types (based on their embed format)
export interface RaidHelperEmbed {
    title: string;
    description: string;
    fields: {
        name: string;
        value: string;
        inline: boolean;
    }[];
    timestamp?: string;
    footer?: {
        text: string;
    };
}

// Class icons used by Raid-Helper for WoW
export const RAID_HELPER_CLASS_EMOJIS: Record<string, WowClass> = {
    // These are typical emoji names used in Raid-Helper WoW templates
    'warrior': 'WARRIOR',
    'paladin': 'PALADIN',
    'hunter': 'HUNTER',
    'rogue': 'ROGUE',
    'priest': 'PRIEST',
    'shaman': 'SHAMAN',
    'mage': 'MAGE',
    'warlock': 'WARLOCK',
    'druid': 'DRUID',
    // Tank/Healer/DPS role emojis
    'tank': 'WARRIOR',  // Will be overridden by class if available
    'healer': 'PRIEST',
    'dps': 'WARRIOR',
    'melee': 'WARRIOR',
    'ranged': 'HUNTER',
};

// Role emojis to RaidRole mapping
export const RAID_HELPER_ROLE_EMOJIS: Record<string, RaidRole> = {
    'tank': 'tank',
    'healer': 'healer',
    'heal': 'healer',
    'dps': 'dps',
    'melee': 'mdps',
    'ranged': 'rdps',
    'caster': 'rdps',
};

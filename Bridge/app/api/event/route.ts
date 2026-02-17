import { NextRequest, NextResponse } from 'next/server';
import {
    RaidHelperApiResponse,
    RaidHelperSignUp,
    RaidEvent,
    RaidSignup,
    WowClass,
    RaidRole,
} from '@/lib/types';

const EXCLUDED_CLASS_NAMES = new Set([
    'absence', 'bench', 'tentative', 'late',
]);

const CLASS_NAME_MAP: Record<string, WowClass> = {
    warrior: 'WARRIOR',
    paladin: 'PALADIN',
    hunter: 'HUNTER',
    rogue: 'ROGUE',
    priest: 'PRIEST',
    shaman: 'SHAMAN',
    mage: 'MAGE',
    warlock: 'WARLOCK',
    druid: 'DRUID',
};

const ROLE_NAME_MAP: Record<string, RaidRole> = {
    tanks: 'tank',
    melee: 'mdps',
    ranged: 'rdps',
    healers: 'healer',
};

function mapClassName(className: string): WowClass | null {
    return CLASS_NAME_MAP[className.toLowerCase()] ?? null;
}

function mapRoleName(roleName: string): RaidRole {
    return ROLE_NAME_MAP[roleName.toLowerCase()] ?? 'dps';
}

function cleanSpecName(specName: string): string {
    // Raid-Helper appends numbers for disambiguation: "Holy1", "Feral1"
    return specName.replace(/\d+$/, '').toLowerCase();
}

function transformSignup(signup: RaidHelperSignUp): RaidSignup | null {
    if (EXCLUDED_CLASS_NAMES.has(signup.className.toLowerCase())) {
        return null;
    }

    const wowClass = mapClassName(signup.className);
    if (!wowClass) {
        return null;
    }

    return {
        discordId: signup.userId,
        discordName: signup.name,
        class: wowClass,
        role: mapRoleName(signup.roleName),
        spec: cleanSpecName(signup.specName),
        signupTime: new Date(signup.entryTime * 1000),
        status: 'confirmed',
    };
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');

    if (!eventId) {
        return NextResponse.json(
            { error: 'Missing event ID' },
            { status: 400 }
        );
    }

    // Sanitize: only allow numeric IDs
    if (!/^\d+$/.test(eventId)) {
        return NextResponse.json(
            { error: 'Invalid event ID format' },
            { status: 400 }
        );
    }

    try {
        const apiUrl = `https://raid-helper.dev/api/v2/events/${eventId}`;
        const response = await fetch(apiUrl, {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 60 }, // cache for 60s
        });

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json(
                    { error: 'Event not found' },
                    { status: 404 }
                );
            }
            return NextResponse.json(
                { error: `Raid-Helper API returned ${response.status}` },
                { status: 502 }
            );
        }

        const data: RaidHelperApiResponse = await response.json();

        const signups: RaidSignup[] = (data.signUps ?? [])
            .map(transformSignup)
            .filter((s): s is RaidSignup => s !== null);

        const event: RaidEvent = {
            eventId: data.id,
            serverId: data.guildId,
            channelId: data.channelId,
            messageId: data.id,
            title: data.title,
            description: data.description,
            startTime: new Date(data.startTime * 1000),
            endTime: data.endTime ? new Date(data.endTime * 1000) : undefined,
            signups,
            createdBy: data.leaderId,
        };

        return NextResponse.json(event);
    } catch (err) {
        console.error('Failed to fetch Raid-Helper event:', err);
        return NextResponse.json(
            { error: 'Failed to fetch event from Raid-Helper' },
            { status: 500 }
        );
    }
}

import type { WowClass } from './types';
import type { RosterEntry } from './rosterTypes';

export interface GroupBuff {
  id: string;
  name: string;
  icon: string;
  match: (cls: WowClass, spec?: string) => boolean;
}

const BUFFS: GroupBuff[] = [
  {
    id: 'bloodlust',
    name: 'Bloodlust / Heroism',
    icon: 'spell_nature_bloodlust',
    match: (cls) => cls === 'SHAMAN',
  },
  {
    id: 'moonkin',
    name: 'Moonkin Aura',
    icon: 'spell_nature_starfall',
    match: (cls, spec) => cls === 'DRUID' && !!spec && spec.toLowerCase().includes('balance'),
  },
  {
    id: 'trueshot',
    name: 'Trueshot Aura',
    icon: 'ability_trueshot',
    match: (cls) => cls === 'HUNTER',
  },
  {
    id: 'unleashed',
    name: 'Unleashed Rage',
    icon: 'spell_nature_unleashedrage',
    match: (cls, spec) => cls === 'SHAMAN' && !!spec && spec.toLowerCase().includes('enhancement'),
  },
  {
    id: 'totemwrath',
    name: 'Totem of Wrath',
    icon: 'spell_fire_totemofwrath',
    match: (cls, spec) => cls === 'SHAMAN' && !!spec && spec.toLowerCase().includes('elemental'),
  },
  {
    id: 'lotp',
    name: 'Leader of the Pack',
    icon: 'ability_druid_demoralizingroar',
    match: (cls, spec) => cls === 'DRUID' && !!spec && spec.toLowerCase().includes('feral'),
  },
];

function getPlayerName(entry: RosterEntry): string {
  return entry.wowCharacter.trim() || entry.discordName;
}

export function resolveGroupBuffs(
  playerNames: string[],
  roster: RosterEntry[],
): { buff: GroupBuff; active: boolean; provider?: string }[] {
  return BUFFS.map((buff) => {
    for (const name of playerNames) {
      const entry = roster.find((r) => getPlayerName(r) === name);
      if (entry && buff.match(entry.class, entry.spec)) {
        return { buff, active: true, provider: name };
      }
    }
    return { buff, active: false };
  });
}

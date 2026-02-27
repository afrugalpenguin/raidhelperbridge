import type { WowClass } from './types';
import type { RosterEntry } from './rosterTypes';

export interface GroupBuff {
  id: string;
  name: string;
  icon: string;
  match: (cls: WowClass, spec?: string) => boolean;
}

const BUFFS: GroupBuff[] = [
  // --- Any-class auras ---
  {
    id: 'bloodlust',
    name: 'Bloodlust / Heroism',
    icon: 'spell_nature_bloodlust',
    match: (cls) => cls === 'SHAMAN',
  },
  {
    id: 'windfury',
    name: 'Windfury Totem',
    icon: 'spell_nature_windfury',
    match: (cls) => cls === 'SHAMAN',
  },
  {
    id: 'wrathofair',
    name: 'Wrath of Air Totem',
    icon: 'spell_nature_slowingtotem',
    match: (cls) => cls === 'SHAMAN',
  },
  {
    id: 'manaspring',
    name: 'Mana Spring Totem',
    icon: 'spell_nature_manaregentotem',
    match: (cls) => cls === 'SHAMAN',
  },
  {
    id: 'trueshot',
    name: 'Trueshot Aura',
    icon: 'ability_trueshot',
    match: (cls) => cls === 'HUNTER',
  },
  {
    id: 'battleshout',
    name: 'Battle Shout',
    icon: 'ability_warrior_battleshout',
    match: (cls) => cls === 'WARRIOR',
  },
  {
    id: 'devotion',
    name: 'Devotion Aura',
    icon: 'spell_holy_devotionaura',
    match: (cls) => cls === 'PALADIN',
  },
  // --- Spec-specific ---
  {
    id: 'moonkin',
    name: 'Moonkin Aura',
    icon: 'spell_nature_starfall',
    match: (cls, spec) => cls === 'DRUID' && !!spec && spec.toLowerCase().includes('balance'),
  },
  {
    id: 'lotp',
    name: 'Leader of the Pack',
    icon: 'ability_druid_demoralizingroar',
    match: (cls, spec) => cls === 'DRUID' && !!spec && spec.toLowerCase().includes('feral'),
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
    id: 'vampirictouch',
    name: 'Vampiric Touch',
    icon: 'spell_holy_stoicism',
    match: (cls, spec) => cls === 'PRIEST' && !!spec && spec.toLowerCase().includes('shadow'),
  },
  {
    id: 'ferocious',
    name: 'Ferocious Inspiration',
    icon: 'ability_hunter_ferociousinspiration',
    match: (cls, spec) => cls === 'HUNTER' && !!spec && spec.toLowerCase().includes('beast'),
  },
  {
    id: 'sanctity',
    name: 'Sanctity Aura',
    icon: 'spell_holy_mindvision',
    match: (cls, spec) => cls === 'PALADIN' && !!spec && spec.toLowerCase().includes('retribution'),
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

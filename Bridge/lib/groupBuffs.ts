import type { WowClass } from './types';
import type { RosterEntry } from './rosterTypes';

export interface GroupBuff {
  id: string;
  name: string;
  icon: string;
  providerClass: WowClass; // used to find candidate when manually toggling
  exclusionGroup?: string; // buffs in the same group are mutually exclusive per player
  match: (cls: WowClass, spec?: string) => boolean;
}

export const BUFFS: GroupBuff[] = [
  // --- Any-class auras ---
  {
    id: 'bloodlust',
    name: 'Bloodlust / Heroism',
    icon: 'spell_nature_bloodlust',
    providerClass: 'SHAMAN',
    match: (cls) => cls === 'SHAMAN',
  },
  {
    id: 'windfury',
    name: 'Windfury Totem',
    icon: 'spell_nature_windfury',
    providerClass: 'SHAMAN',
    exclusionGroup: 'air-totem',
    match: (cls) => cls === 'SHAMAN',
  },
  {
    id: 'wrathofair',
    name: 'Wrath of Air Totem',
    icon: 'spell_nature_slowingtotem',
    providerClass: 'SHAMAN',
    exclusionGroup: 'air-totem',
    match: (cls) => cls === 'SHAMAN',
  },
  {
    id: 'manaspring',
    name: 'Mana Spring Totem',
    icon: 'spell_nature_manaregentotem',
    providerClass: 'SHAMAN',
    match: (cls) => cls === 'SHAMAN',
  },
  {
    id: 'trueshot',
    name: 'Trueshot Aura',
    icon: 'ability_trueshot',
    providerClass: 'HUNTER',
    match: (cls) => cls === 'HUNTER',
  },
  {
    id: 'battleshout',
    name: 'Battle Shout',
    icon: 'ability_warrior_battleshout',
    providerClass: 'WARRIOR',
    match: (cls) => cls === 'WARRIOR',
  },
  {
    id: 'devotion',
    name: 'Devotion Aura',
    icon: 'spell_holy_devotionaura',
    providerClass: 'PALADIN',
    exclusionGroup: 'paladin-aura',
    match: (cls) => cls === 'PALADIN',
  },
  // --- Spec-specific ---
  {
    id: 'moonkin',
    name: 'Moonkin Aura',
    icon: 'spell_nature_starfall',
    providerClass: 'DRUID',
    match: (cls, spec) => cls === 'DRUID' && !!spec && spec.toLowerCase().includes('balance'),
  },
  {
    id: 'lotp',
    name: 'Leader of the Pack',
    icon: 'ability_druid_demoralizingroar',
    providerClass: 'DRUID',
    match: (cls, spec) => cls === 'DRUID' && !!spec && spec.toLowerCase().includes('feral'),
  },
  {
    id: 'unleashed',
    name: 'Unleashed Rage',
    icon: 'spell_nature_unleashedrage',
    providerClass: 'SHAMAN',
    match: (cls, spec) => cls === 'SHAMAN' && !!spec && spec.toLowerCase().includes('enhancement'),
  },
  {
    id: 'totemwrath',
    name: 'Totem of Wrath',
    icon: 'spell_fire_totemofwrath',
    providerClass: 'SHAMAN',
    match: (cls, spec) => cls === 'SHAMAN' && !!spec && spec.toLowerCase().includes('elemental'),
  },
  {
    id: 'vampirictouch',
    name: 'Vampiric Touch',
    icon: 'spell_holy_stoicism',
    providerClass: 'PRIEST',
    match: (cls, spec) => cls === 'PRIEST' && !!spec && spec.toLowerCase().includes('shadow'),
  },
  {
    id: 'ferocious',
    name: 'Ferocious Inspiration',
    icon: 'ability_hunter_ferociousinspiration',
    providerClass: 'HUNTER',
    match: (cls, spec) => cls === 'HUNTER' && !!spec && spec.toLowerCase().includes('beast'),
  },
  {
    id: 'sanctity',
    name: 'Sanctity Aura',
    icon: 'spell_holy_mindvision',
    providerClass: 'PALADIN',
    exclusionGroup: 'paladin-aura',
    match: () => false, // manual toggle only — can't detect from spec data
  },
];

function getPlayerName(entry: RosterEntry): string {
  return entry.wowCharacter.trim() || entry.discordName;
}

export function resolveGroupBuffs(
  playerNames: string[],
  roster: RosterEntry[],
  overrides?: Set<string>,
): { buff: GroupBuff; active: boolean; provider?: string }[] {
  return BUFFS.map((buff) => {
    for (const name of playerNames) {
      // If this player has an override for a DIFFERENT buff in the same exclusion group,
      // they can't also provide this buff (e.g., paladin using Sanctity can't provide Devotion)
      if (overrides && buff.exclusionGroup) {
        const excluded = BUFFS.some(
          (other) =>
            other.id !== buff.id &&
            other.exclusionGroup === buff.exclusionGroup &&
            overrides.has(`${name}_${other.id}`),
        );
        if (excluded) continue;
      }

      const entry = roster.find((r) => getPlayerName(r) === name);
      if (entry && buff.match(entry.class, entry.spec)) {
        return { buff, active: true, provider: name };
      }
    }
    return { buff, active: false };
  });
}

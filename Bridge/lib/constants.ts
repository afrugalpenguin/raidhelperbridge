import type { WowClass, RaidRole } from './types';

export const CLASS_COLORS: Record<WowClass, string> = {
  WARRIOR: '#C79C6E',
  PALADIN: '#F58CBA',
  HUNTER: '#ABD473',
  ROGUE: '#FFF569',
  PRIEST: '#FFFFFF',
  SHAMAN: '#0070DE',
  MAGE: '#69CCF0',
  WARLOCK: '#9482C9',
  DRUID: '#FF7D0A',
};

export const ROLE_LABELS: Record<RaidRole, string> = {
  tank: 'Tank',
  healer: 'Healer',
  mdps: 'Melee DPS',
  rdps: 'Ranged DPS',
  dps: 'DPS',
};

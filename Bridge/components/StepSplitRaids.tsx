'use client';

import { useState } from 'react';
import type { RosterEntry } from '@/lib/rosterTypes';
import { CLASS_COLORS } from '@/lib/constants';

interface Props {
  roster: RosterEntry[];
  splits: [RosterEntry[], RosterEntry[]];
  onChange: (splits: [RosterEntry[], RosterEntry[]]) => void;
}

// Melee specs/classes for loot balance display
function isMelee(entry: RosterEntry): boolean {
  if (entry.role === 'tank') return true;
  if (entry.role === 'mdps') return true;
  const cls = entry.class;
  const spec = entry.spec?.toLowerCase() || '';
  if (cls === 'WARRIOR' || cls === 'ROGUE') return true;
  if (cls === 'DRUID' && spec.includes('feral')) return true;
  if (cls === 'SHAMAN' && spec.includes('enhancement')) return true;
  if (cls === 'PALADIN' && spec.includes('retribution')) return true;
  return false;
}

function RoleSummary({ players }: { players: RosterEntry[] }) {
  const tanks = players.filter(p => p.role === 'tank').length;
  const healers = players.filter(p => p.role === 'healer').length;
  const dps = players.filter(p => p.role !== 'tank' && p.role !== 'healer').length;
  const melee = players.filter(isMelee).length;
  const ranged = players.length - melee;

  return (
    <div className="text-xs text-zinc-400 mt-2 space-y-1">
      <div>{tanks} Tank / {healers} Healer / {dps} DPS</div>
      <div>Melee: {melee} / Ranged: {ranged}</div>
    </div>
  );
}

function PlayerCard({
  entry,
  onClick,
  draggable,
  onDragStart,
}: {
  entry: RosterEntry;
  onClick: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  const color = CLASS_COLORS[entry.class] || '#ffffff';
  const name = entry.wowCharacter || entry.discordName;
  const meleeTag = isMelee(entry) ? 'melee' : 'ranged';

  return (
    <div
      className="flex items-center justify-between px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 cursor-pointer select-none"
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <span style={{ color }} className="text-sm font-medium truncate">
        {name}
      </span>
      <span className="text-xs text-zinc-500 ml-2 shrink-0">
        {entry.role} · {meleeTag}
      </span>
    </div>
  );
}

export default function StepSplitRaids({ roster, splits, onChange }: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Only confirmed players can be split
  const confirmed = roster.filter(r => r.signupStatus === 'confirmed');

  // Players assigned to each raid
  const raid1Ids = new Set(splits[0].map(p => p.discordId));
  const raid2Ids = new Set(splits[1].map(p => p.discordId));

  // Unassigned = confirmed but not in either raid
  const unassigned = confirmed.filter(
    p => !raid1Ids.has(p.discordId) && !raid2Ids.has(p.discordId)
  );

  function assignToRaid(entry: RosterEntry, raidIndex: 0 | 1) {
    // Remove from both raids first
    const newSplits: [RosterEntry[], RosterEntry[]] = [
      splits[0].filter(p => p.discordId !== entry.discordId),
      splits[1].filter(p => p.discordId !== entry.discordId),
    ];
    newSplits[raidIndex] = [...newSplits[raidIndex], entry];
    onChange(newSplits);
  }

  function unassignPlayer(entry: RosterEntry) {
    onChange([
      splits[0].filter(p => p.discordId !== entry.discordId),
      splits[1].filter(p => p.discordId !== entry.discordId),
    ]);
  }

  function handleUnassignedClick(entry: RosterEntry) {
    // Send to whichever raid has fewer players, Raid 1 if tied
    const target = splits[1].length < splits[0].length ? 1 : 0;
    assignToRaid(entry, target as 0 | 1);
  }

  function handleDrop(raidIndex: 0 | 1) {
    if (!draggedId) return;
    const entry = confirmed.find(p => p.discordId === draggedId);
    if (entry) assignToRaid(entry, raidIndex);
    setDraggedId(null);
  }

  function handleDropUnassigned() {
    if (!draggedId) return;
    const entry = confirmed.find(p => p.discordId === draggedId);
    if (entry) unassignPlayer(entry);
    setDraggedId(null);
  }

  function renderColumn(
    title: string,
    players: RosterEntry[],
    onPlayerClick: (entry: RosterEntry) => void,
    onDrop: () => void,
    showSummary: boolean,
  ) {
    return (
      <div
        className="flex-1 min-w-[200px]"
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); onDrop(); }}
      >
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">
          {title} ({players.length})
        </h3>
        <div className="space-y-1 min-h-[100px] p-2 rounded-lg border border-zinc-700 bg-zinc-900/50">
          {players.map(entry => (
            <PlayerCard
              key={entry.discordId}
              entry={entry}
              onClick={() => onPlayerClick(entry)}
              draggable
              onDragStart={() => setDraggedId(entry.discordId)}
            />
          ))}
          {players.length === 0 && (
            <div className="text-xs text-zinc-600 text-center py-4">
              Drop players here
            </div>
          )}
        </div>
        {showSummary && players.length > 0 && <RoleSummary players={players} />}
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-bold text-white mb-4">Split into Raids</h2>
      <div className="flex gap-4">
        {renderColumn(
          'Raid 1',
          splits[0],
          unassignPlayer,
          () => handleDrop(0),
          true,
        )}
        {renderColumn(
          'Unassigned',
          unassigned,
          handleUnassignedClick,
          handleDropUnassigned,
          false,
        )}
        {renderColumn(
          'Raid 2',
          splits[1],
          unassignPlayer,
          () => handleDrop(1),
          true,
        )}
      </div>
    </section>
  );
}

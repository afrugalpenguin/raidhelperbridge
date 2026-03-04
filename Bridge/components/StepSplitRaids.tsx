'use client';

import { useState } from 'react';
import type { RosterEntry } from '@/lib/rosterTypes';
import { CLASS_COLORS } from '@/lib/constants';

type Splits = [RosterEntry[], RosterEntry[]];

interface Props {
  roster: RosterEntry[];
  splits: Splits;
  onChange: (updater: Splits | ((prev: Splits) => Splits)) => void;
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

  function assignToRaid(entry: RosterEntry, raidIndex: 0 | 1, groupIndex?: 0 | 1) {
    onChange(prev => {
      const newSplits: Splits = [
        prev[0].filter(p => p.discordId !== entry.discordId),
        prev[1].filter(p => p.discordId !== entry.discordId),
      ];
      if (groupIndex === 1) {
        const raid = newSplits[raidIndex];
        const insertAt = Math.min(5, raid.length);
        raid.splice(insertAt, 0, entry);
      } else {
        newSplits[raidIndex] = [...newSplits[raidIndex], entry];
      }
      return newSplits;
    });
  }

  function unassignPlayer(entry: RosterEntry) {
    onChange(prev => [
      prev[0].filter(p => p.discordId !== entry.discordId),
      prev[1].filter(p => p.discordId !== entry.discordId),
    ]);
  }

  function handleUnassignedClick(entry: RosterEntry) {
    onChange(prev => {
      const newSplits: Splits = [
        prev[0].filter(p => p.discordId !== entry.discordId),
        prev[1].filter(p => p.discordId !== entry.discordId),
      ];
      // Fill Raid 1 to 10 first, then Raid 2
      const target = newSplits[0].length < 10 ? 0 : 1;
      newSplits[target] = [...newSplits[target], entry];
      return newSplits;
    });
  }

  function handleDrop(raidIndex: 0 | 1, groupIndex?: 0 | 1) {
    if (!draggedId) return;
    const entry = confirmed.find(p => p.discordId === draggedId);
    if (entry) assignToRaid(entry, raidIndex, groupIndex);
    setDraggedId(null);
  }

  function handleDropUnassigned() {
    if (!draggedId) return;
    const entry = confirmed.find(p => p.discordId === draggedId);
    if (entry) unassignPlayer(entry);
    setDraggedId(null);
  }

  function renderRaidColumn(
    title: string,
    players: RosterEntry[],
    raidIndex: 0 | 1,
    onPlayerClick: (entry: RosterEntry) => void,
  ) {
    const group1 = players.slice(0, 5);
    const group2 = players.slice(5, 10);
    const overflow = players.slice(10);

    return (
      <div className="flex-1 min-w-[200px]">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">
          {title} ({players.length}{players.length > 10 ? ' — too many!' : ''})
        </h3>
        <div className="space-y-3 min-h-[100px] p-2 rounded-lg border border-zinc-700 bg-zinc-900/50">
          {players.length === 0 ? (
            <div
              className="text-xs text-zinc-600 text-center py-4"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleDrop(raidIndex, 0); }}
            >
              Drop players here
            </div>
          ) : (
            <>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleDrop(raidIndex, 0); }}
              >
                <div className="text-xs text-zinc-500 mb-1">Group 1 ({group1.length}/5)</div>
                <div className="space-y-1">
                  {group1.map(entry => (
                    <PlayerCard
                      key={entry.discordId}
                      entry={entry}
                      onClick={() => onPlayerClick(entry)}
                      draggable
                      onDragStart={() => setDraggedId(entry.discordId)}
                    />
                  ))}
                </div>
              </div>
              <div
                className="border-t border-zinc-700 pt-2"
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleDrop(raidIndex, 1); }}
              >
                <div className="text-xs text-zinc-500 mb-1">Group 2 ({group2.length}/5)</div>
                <div className="space-y-1">
                  {group2.map(entry => (
                    <PlayerCard
                      key={entry.discordId}
                      entry={entry}
                      onClick={() => onPlayerClick(entry)}
                      draggable
                      onDragStart={() => setDraggedId(entry.discordId)}
                    />
                  ))}
                </div>
              </div>
              {overflow.length > 0 && (
                <div className="border-t border-amber-700 pt-2">
                  <div className="text-xs text-amber-500 mb-1">Overflow — not grouped ({overflow.length})</div>
                  <div className="space-y-1">
                    {overflow.map(entry => (
                      <PlayerCard
                        key={entry.discordId}
                        entry={entry}
                        onClick={() => onPlayerClick(entry)}
                        draggable
                        onDragStart={() => setDraggedId(entry.discordId)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {players.length > 0 && <RoleSummary players={players.slice(0, 10)} />}
      </div>
    );
  }

  function renderPoolColumn(
    title: string,
    players: RosterEntry[],
    onPlayerClick: (entry: RosterEntry) => void,
    onDrop: () => void,
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
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-bold text-white mb-4">Split into Raids</h2>
      <div className="flex gap-4">
        {renderRaidColumn(
          'Raid 1',
          splits[0],
          0,
          unassignPlayer,
        )}
        {renderPoolColumn(
          'Unassigned',
          unassigned,
          handleUnassignedClick,
          handleDropUnassigned,
        )}
        {renderRaidColumn(
          'Raid 2',
          splits[1],
          1,
          unassignPlayer,
        )}
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';
import type { RosterEntry, EventData } from '@/lib/rosterTypes';
import type { CCAssignment } from '@/lib/ccResolver';
import type { GroupAssignment } from '@/lib/groupSolver';
import { CLASS_COLORS } from '@/lib/constants';
import RaidPanel from '@/components/RaidPanel';

interface Props {
  event: EventData;
  splits: [RosterEntry[], RosterEntry[]];
  onSplitsChange: (splits: [RosterEntry[], RosterEntry[]]) => void;
  ccAssignments: [CCAssignment[], CCAssignment[]];
  onCCChange: (cc: [CCAssignment[], CCAssignment[]]) => void;
  groups: [GroupAssignment[], GroupAssignment[]];
  onGroupsChange: (groups: [GroupAssignment[], GroupAssignment[]]) => void;
}

function getPlayerName(entry: RosterEntry): string {
  return entry.wowCharacter.trim() || entry.discordName;
}

function SwapControl({
  splits,
  onSwap,
}: {
  splits: [RosterEntry[], RosterEntry[]];
  onSwap: (raid1Player: string, raid2Player: string) => void;
}) {
  const [selected1, setSelected1] = useState<string | null>(null);
  const [selected2, setSelected2] = useState<string | null>(null);

  const canSwap = selected1 && selected2;

  return (
    <div className="flex flex-col items-center gap-3 px-2 py-4 min-w-[180px]">
      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Swap Players</h4>

      <div className="w-full">
        <label className="text-xs text-zinc-500 mb-1 block">From Raid 1</label>
        <select
          value={selected1 || ''}
          onChange={e => setSelected1(e.target.value || null)}
          className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-2 py-1.5 border border-zinc-700"
        >
          <option value="">Select player...</option>
          {splits[0].map(entry => {
            const name = getPlayerName(entry);
            return (
              <option key={entry.discordId} value={entry.discordId} style={{ color: CLASS_COLORS[entry.class] }}>
                {name}
              </option>
            );
          })}
        </select>
      </div>

      <button
        disabled={!canSwap}
        onClick={() => {
          if (selected1 && selected2) {
            onSwap(selected1, selected2);
            setSelected1(null);
            setSelected2(null);
          }
        }}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          canSwap
            ? 'bg-indigo-600 text-white hover:bg-indigo-500'
            : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
        }`}
      >
        ⇄ Swap
      </button>

      <div className="w-full">
        <label className="text-xs text-zinc-500 mb-1 block">From Raid 2</label>
        <select
          value={selected2 || ''}
          onChange={e => setSelected2(e.target.value || null)}
          className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-2 py-1.5 border border-zinc-700"
        >
          <option value="">Select player...</option>
          {splits[1].map(entry => {
            const name = getPlayerName(entry);
            return (
              <option key={entry.discordId} value={entry.discordId} style={{ color: CLASS_COLORS[entry.class] }}>
                {name}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}

export default function DualRaidView({
  event,
  splits,
  onSplitsChange,
  ccAssignments,
  onCCChange,
  groups,
  onGroupsChange,
}: Props) {

  function swapPlayers(raid1DiscordId: string, raid2DiscordId: string) {
    const player1 = splits[0].find(p => p.discordId === raid1DiscordId);
    const player2 = splits[1].find(p => p.discordId === raid2DiscordId);
    if (!player1 || !player2) return;

    onSplitsChange([
      splits[0].map(p => p.discordId === raid1DiscordId ? player2 : p),
      splits[1].map(p => p.discordId === raid2DiscordId ? player1 : p),
    ]);
  }

  return (
    <div className="mt-6">
      <div className="flex gap-4 items-start">
        {/* Raid 1 */}
        <div className="flex-1 min-w-0">
          <RaidPanel
            raidLabel="Raid 1"
            event={event}
            roster={splits[0]}
            ccAssignments={ccAssignments[0]}
            onCCChange={(assignments) => {
              onCCChange([assignments, ccAssignments[1]]);
            }}
            groups={groups[0]}
            onGroupsChange={(newGroups) => {
              onGroupsChange([newGroups, groups[1]]);
            }}
          />
        </div>

        {/* Swap control */}
        {splits[0].length > 0 && splits[1].length > 0 && (
          <SwapControl splits={splits} onSwap={swapPlayers} />
        )}

        {/* Raid 2 */}
        <div className="flex-1 min-w-0">
          <RaidPanel
            raidLabel="Raid 2"
            event={event}
            roster={splits[1]}
            ccAssignments={ccAssignments[1]}
            onCCChange={(assignments) => {
              onCCChange([ccAssignments[0], assignments]);
            }}
            groups={groups[1]}
            onGroupsChange={(newGroups) => {
              onGroupsChange([groups[0], newGroups]);
            }}
          />
        </div>
      </div>
    </div>
  );
}

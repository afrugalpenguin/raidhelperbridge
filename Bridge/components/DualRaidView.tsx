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
    <div className="flex flex-col items-center gap-1 pt-6 shrink-0 w-40">
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Raid 1</div>
      <div className="w-full max-h-48 overflow-y-auto space-y-0.5">
        {splits[0].map(entry => (
          <button
            key={entry.discordId}
            onClick={() => setSelected1(selected1 === entry.discordId ? null : entry.discordId)}
            className={`w-full text-left text-xs px-2 py-0.5 rounded truncate transition-colors ${
              selected1 === entry.discordId
                ? 'bg-indigo-600/30 ring-1 ring-indigo-500'
                : 'hover:bg-zinc-800'
            }`}
            style={{ color: CLASS_COLORS[entry.class] }}
          >
            {getPlayerName(entry)}
          </button>
        ))}
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
        className={`my-1 text-xs font-medium transition-colors ${
          canSwap
            ? 'text-indigo-400 hover:text-indigo-300'
            : 'text-zinc-600 cursor-not-allowed'
        }`}
      >
        &lt; Swap &gt;
      </button>

      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Raid 2</div>
      <div className="w-full max-h-48 overflow-y-auto space-y-0.5">
        {splits[1].map(entry => (
          <button
            key={entry.discordId}
            onClick={() => setSelected2(selected2 === entry.discordId ? null : entry.discordId)}
            className={`w-full text-left text-xs px-2 py-0.5 rounded truncate transition-colors ${
              selected2 === entry.discordId
                ? 'bg-indigo-600/30 ring-1 ring-indigo-500'
                : 'hover:bg-zinc-800'
            }`}
            style={{ color: CLASS_COLORS[entry.class] }}
          >
            {getPlayerName(entry)}
          </button>
        ))}
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

        {/* Swap control between the two raid panels */}
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

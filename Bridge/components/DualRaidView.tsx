'use client';

import { useState } from 'react';
import type { RosterEntry, EventData } from '@/lib/rosterTypes';
import type { CCAssignment } from '@/lib/ccResolver';
import type { GroupAssignment } from '@/lib/groupSolver';
import StepCCRules from '@/components/StepCCRules';
import StepGroupBuilder from '@/components/StepGroupBuilder';
import StepGenerateImport from '@/components/StepGenerateImport';

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

export default function DualRaidView({
  event,
  splits,
  onSplitsChange,
  ccAssignments,
  onCCChange,
  groups,
  onGroupsChange,
}: Props) {
  const [selected1, setSelected1] = useState<string | null>(null);
  const [selected2, setSelected2] = useState<string | null>(null);

  function swapPlayers() {
    if (!selected1 || !selected2) return;
    const player1 = splits[0].find(p => getPlayerName(p) === selected1);
    const player2 = splits[1].find(p => getPlayerName(p) === selected2);
    if (!player1 || !player2) return;

    onSplitsChange([
      splits[0].map(p => getPlayerName(p) === selected1 ? player2 : p),
      splits[1].map(p => getPlayerName(p) === selected2 ? player1 : p),
    ]);
    setSelected1(null);
    setSelected2(null);
  }

  const canSwap = selected1 && selected2;
  const bothHavePlayers = splits[0].length > 0 && splits[1].length > 0;

  return (
    <div className="mt-6 space-y-8">
      {/* Raid Groups — side by side with swap button between */}
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <h3 className="text-md font-semibold text-indigo-400 mb-3">Raid 1</h3>
          <StepGroupBuilder
            roster={splits[0]}
            groups={groups[0]}
            onChange={(g) => onGroupsChange([g, groups[1]])}
            eventId={event.eventId}
            hideBuffs
            selectedPlayer={selected1}
            onPlayerSelect={(name) => setSelected1(selected1 === name ? null : name)}
          />
        </div>

        {bothHavePlayers && (
          <div className="flex items-center pt-24 shrink-0">
            <button
              disabled={!canSwap}
              onClick={swapPlayers}
              className={`text-xs font-medium transition-colors ${
                canSwap
                  ? 'text-indigo-400 hover:text-indigo-300'
                  : 'text-zinc-600 cursor-not-allowed'
              }`}
            >
              &lt; Swap &gt;
            </button>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="text-md font-semibold text-indigo-400 mb-3">Raid 2</h3>
          <StepGroupBuilder
            roster={splits[1]}
            groups={groups[1]}
            onChange={(g) => onGroupsChange([groups[0], g])}
            eventId={event.eventId}
            hideBuffs
            selectedPlayer={selected2}
            onPlayerSelect={(name) => setSelected2(selected2 === name ? null : name)}
          />
        </div>
      </div>

      {/* CC Assignments — side by side */}
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <StepCCRules
            roster={splits[0]}
            assignments={ccAssignments[0]}
            onChange={(a) => onCCChange([a, ccAssignments[1]])}
          />
        </div>
        <div className="flex-1 min-w-0">
          <StepCCRules
            roster={splits[1]}
            assignments={ccAssignments[1]}
            onChange={(a) => onCCChange([ccAssignments[0], a])}
          />
        </div>
      </div>

      {/* Generate Import — side by side */}
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <StepGenerateImport
            event={event}
            roster={splits[0]}
            ccAssignments={ccAssignments[0]}
            groupAssignments={groups[0]}
          />
        </div>
        <div className="flex-1 min-w-0">
          <StepGenerateImport
            event={event}
            roster={splits[1]}
            ccAssignments={ccAssignments[1]}
            groupAssignments={groups[1]}
          />
        </div>
      </div>
    </div>
  );
}

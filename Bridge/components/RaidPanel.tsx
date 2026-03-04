'use client';

import type { RosterEntry, EventData } from '@/lib/rosterTypes';
import type { CCAssignment } from '@/lib/ccResolver';
import type { GroupAssignment } from '@/lib/groupSolver';
import StepCCRules from '@/components/StepCCRules';
import StepGroupBuilder from '@/components/StepGroupBuilder';
import StepGenerateImport from '@/components/StepGenerateImport';

interface Props {
  raidLabel: string;
  event: EventData;
  roster: RosterEntry[];
  ccAssignments: CCAssignment[];
  onCCChange: (assignments: CCAssignment[]) => void;
  groups: GroupAssignment[];
  onGroupsChange: (groups: GroupAssignment[]) => void;
}

export default function RaidPanel({
  raidLabel,
  event,
  roster,
  ccAssignments,
  onCCChange,
  groups,
  onGroupsChange,
}: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-md font-semibold text-indigo-400">{raidLabel}</h3>

      {roster.length === 0 ? (
        <p className="text-zinc-500 text-sm">No players assigned to this raid yet.</p>
      ) : (
        <>
          <StepCCRules
            roster={roster}
            assignments={ccAssignments}
            onChange={onCCChange}
          />

          <StepGroupBuilder
            roster={roster}
            groups={groups}
            onChange={onGroupsChange}
            eventId={event.eventId}
            hideBuffs
          />

          <StepGenerateImport
            event={event}
            roster={roster}
            ccAssignments={ccAssignments}
            groupAssignments={groups}
          />
        </>
      )}
    </div>
  );
}

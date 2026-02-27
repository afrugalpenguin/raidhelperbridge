import { useState } from 'react';
import type { RaidMarker, CCType } from '@/lib/types';
import type { RosterEntry } from '@/lib/rosterTypes';
import { CLASS_COLORS } from '@/lib/constants';
import {
  CCAssignment,
  CCAssignmentEntry,
  autoResolveCC,
  getPlayersForCC,
  getAvailableCCTypes,
  CC_LABELS,
  MARKER_NAMES,
  MARKER_SYMBOLS,
  MARKER_COLORS,
  CLASS_CC_ABILITIES,
} from '@/lib/ccResolver';

const ALL_MARKERS: RaidMarker[] = [1, 2, 3, 4, 5, 6, 7, 8];

interface Props {
  roster: RosterEntry[];
  assignments: CCAssignment[];
  onChange: (assignments: CCAssignment[]) => void;
}

// Get player display name (wowCharacter if set, else discordName)
function getPlayerName(entry: RosterEntry): string {
  return entry.wowCharacter.trim() || entry.discordName;
}

// Get the class of a player by their display name
function getPlayerClass(roster: RosterEntry[], playerName: string): string | null {
  const entry = roster.find(r => getPlayerName(r) === playerName);
  return entry ? entry.class : null;
}

export default function StepCCRules({ roster, assignments, onChange }: Props) {
  const availableCCTypes = getAvailableCCTypes(roster);

  // Find first unused marker
  const usedMarkers = new Set(assignments.map(a => a.marker));
  const nextUnusedMarker = ALL_MARKERS.find(m => !usedMarkers.has(m));

  const handleAutoAssign = () => {
    onChange(autoResolveCC(roster));
  };

  const handleAddAssignment = () => {
    if (!nextUnusedMarker) return;
    onChange([
      ...assignments,
      { marker: nextUnusedMarker, entries: [{ playerName: '', ccType: availableCCTypes[0] || 'polymorph' as CCType }] },
    ]);
  };

  const handleRemoveAssignment = (index: number) => {
    onChange(assignments.filter((_, i) => i !== index));
  };

  const handleMarkerChange = (index: number, marker: RaidMarker) => {
    const updated = [...assignments];
    updated[index] = { ...updated[index], marker };
    onChange(updated);
  };

  const handleEntryChange = (
    assignmentIndex: number,
    entryIndex: number,
    field: 'playerName' | 'ccType',
    value: string
  ) => {
    const updated = [...assignments];
    const assignment = { ...updated[assignmentIndex] };
    const entries = [...assignment.entries];
    const entry = { ...entries[entryIndex] };

    if (field === 'ccType') {
      entry.ccType = value as CCType;
      // Reset player if they can't do the new CC type
      const validPlayers = getPlayersForCC(roster, value as CCType);
      if (!validPlayers.includes(entry.playerName)) {
        entry.playerName = '';
      }
    } else {
      entry.playerName = value;
    }

    entries[entryIndex] = entry;
    assignment.entries = entries;
    updated[assignmentIndex] = assignment;
    onChange(updated);
  };

  const handleAddFallback = (assignmentIndex: number) => {
    const updated = [...assignments];
    const assignment = { ...updated[assignmentIndex] };
    assignment.entries = [
      ...assignment.entries,
      { playerName: '', ccType: availableCCTypes[0] || 'polymorph' as CCType },
    ];
    updated[assignmentIndex] = assignment;
    onChange(updated);
  };

  const handleRemoveEntry = (assignmentIndex: number, entryIndex: number) => {
    const updated = [...assignments];
    const assignment = { ...updated[assignmentIndex] };
    assignment.entries = assignment.entries.filter((_, i) => i !== entryIndex);
    updated[assignmentIndex] = assignment;
    // If no entries remain, remove the whole assignment
    if (assignment.entries.length === 0) {
      onChange(updated.filter((_, i) => i !== assignmentIndex));
    } else {
      onChange(updated);
    }
  };

  // Collect all currently assigned player names (to show warnings for duplicates)
  const allAssignedPlayers = assignments.flatMap(a => a.entries.map(e => e.playerName).filter(Boolean));

  return (
    <section className="bg-gray-800 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold">3. CC Assignments</h2>
        <button
          onClick={handleAutoAssign}
          className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
        >
          Auto-assign
        </button>
      </div>
      <p className="text-gray-400 text-sm mb-4">
        Assign crowd control duties to raid markers.
      </p>

      {availableCCTypes.length === 0 && (
        <p className="text-gray-500 text-sm italic">
          No CC-capable classes found in the roster.
        </p>
      )}

      <div className="space-y-2">
        {assignments.map((assignment, ai) => (
          assignment.entries.map((entry, ei) => {
            const playersForCC = getPlayersForCC(roster, entry.ccType);
            const isDuplicate =
              entry.playerName &&
              allAssignedPlayers.filter(p => p === entry.playerName).length > 1;

            return (
              <div key={`${ai}-${ei}`} className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-2">
                {/* Marker selector (only on first entry) */}
                {ei === 0 ? (
                  <select
                    value={assignment.marker}
                    onChange={(e) => handleMarkerChange(ai, Number(e.target.value) as RaidMarker)}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500 w-28 flex-shrink-0"
                    style={{ color: MARKER_COLORS[assignment.marker] }}
                  >
                    {ALL_MARKERS.map((m) => (
                      <option key={m} value={m} disabled={m !== assignment.marker && usedMarkers.has(m)}>
                        {MARKER_SYMBOLS[m]} {MARKER_NAMES[m]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-gray-500 text-xs w-28 text-right flex-shrink-0 pr-2">fallback</span>
                )}

                {/* CC type dropdown */}
                <select
                  value={entry.ccType}
                  onChange={(e) => handleEntryChange(ai, ei, 'ccType', e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500 w-40 flex-shrink-0"
                >
                  {availableCCTypes.map((cc) => (
                    <option key={cc} value={cc}>
                      {CC_LABELS[cc]}
                    </option>
                  ))}
                </select>

                {/* Player dropdown */}
                <select
                  value={entry.playerName}
                  onChange={(e) => handleEntryChange(ai, ei, 'playerName', e.target.value)}
                  className={`bg-gray-700 border rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500 w-48 flex-shrink-0 ${
                    isDuplicate ? 'border-yellow-500/50' : 'border-gray-600'
                  }`}
                  style={
                    entry.playerName
                      ? { color: CLASS_COLORS[getPlayerClass(roster, entry.playerName) as keyof typeof CLASS_COLORS] || '#FFFFFF' }
                      : undefined
                  }
                >
                  <option value="">Select player...</option>
                  {playersForCC.map((name) => {
                    const cls = getPlayerClass(roster, name);
                    return (
                      <option
                        key={name}
                        value={name}
                        style={cls ? { color: CLASS_COLORS[cls as keyof typeof CLASS_COLORS] } : undefined}
                      >
                        {name}{cls ? ` (${cls.charAt(0) + cls.slice(1).toLowerCase()})` : ''}
                      </option>
                    );
                  })}
                </select>

                {/* Add fallback */}
                {ei === assignment.entries.length - 1 && (
                  <button
                    onClick={() => handleAddFallback(ai)}
                    className="text-gray-400 hover:text-white text-sm px-2 py-1 rounded hover:bg-gray-700 flex-shrink-0"
                    title="Add fallback"
                  >
                    +
                  </button>
                )}

                {/* Remove */}
                <button
                  onClick={() => assignment.entries.length > 1 ? handleRemoveEntry(ai, ei) : handleRemoveAssignment(ai)}
                  className="text-gray-500 hover:text-red-400 text-sm px-1 flex-shrink-0"
                  title={assignment.entries.length > 1 ? 'Remove entry' : 'Remove assignment'}
                >
                  x
                </button>
              </div>
            );
          })
        ))}
      </div>

      {/* Add assignment button */}
      {nextUnusedMarker && availableCCTypes.length > 0 && (
        <button
          onClick={handleAddAssignment}
          className="mt-3 w-full border border-dashed border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white py-2 rounded-lg text-sm"
        >
          + Add marker assignment
        </button>
      )}
    </section>
  );
}

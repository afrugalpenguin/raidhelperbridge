import { useState } from 'react';
import type { RosterEntry } from '@/lib/rosterTypes';
import type { GroupAssignment } from '@/lib/groupSolver';
import { autoAssignGroups } from '@/lib/groupSolver';
import { CLASS_COLORS } from '@/lib/constants';

interface Props {
  roster: RosterEntry[];
  groups: GroupAssignment[];
  onChange: (groups: GroupAssignment[]) => void;
}

function getPlayerName(entry: RosterEntry): string {
  return entry.wowCharacter.trim() || entry.discordName;
}

function getPlayerClass(roster: RosterEntry[], playerName: string): string | null {
  const entry = roster.find(r => getPlayerName(r) === playerName);
  return entry ? entry.class : null;
}

export default function StepGroupBuilder({ roster, groups, onChange }: Props) {
  const [dragSource, setDragSource] = useState<{ groupIndex: number | 'pool'; playerName: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<number | 'pool' | null>(null);

  // Compute unassigned players
  const assignedNames = new Set(groups.flatMap(g => g.players));
  const unassigned = roster
    .map(getPlayerName)
    .filter(name => !assignedNames.has(name));

  const handleReset = () => {
    onChange(autoAssignGroups(roster));
  };

  const handleLabelChange = (groupIndex: number, label: string) => {
    const updated = groups.map((g, i) =>
      i === groupIndex ? { ...g, label } : g
    );
    onChange(updated);
  };

  // Drag handlers — encode source in dataTransfer for reliability
  const handleDragStart = (groupIndex: number | 'pool', playerName: string) => (e: React.DragEvent) => {
    setDragSource({ groupIndex, playerName });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ groupIndex, playerName }));
  };

  const handleDragOver = (targetIndex: number | 'pool') => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(targetIndex);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (targetIndex: number | 'pool') => (e: React.DragEvent) => {
    e.preventDefault();
    setDropTarget(null);
    setDragSource(null);

    let sourceIndex: number | 'pool';
    let playerName: string;
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      sourceIndex = data.groupIndex;
      playerName = data.playerName;
    } catch {
      return;
    }

    // No-op if dropping on same group
    if (sourceIndex === targetIndex) return;

    // Check target capacity (groups max 5, pool unlimited)
    if (targetIndex !== 'pool' && groups[targetIndex].players.length >= 5) return;

    const updated = groups.map((g, i) => {
      const isSource = i === sourceIndex;
      const isTarget = i === targetIndex;
      if (isSource && isTarget) return g;
      if (isSource) return { ...g, players: g.players.filter(p => p !== playerName) };
      if (isTarget) return { ...g, players: [...g.players, playerName] };
      return g;
    });

    onChange(updated);
  };

  const handleDragEnd = () => {
    setDragSource(null);
    setDropTarget(null);
  };

  return (
    <section className="bg-gray-800 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold">4. Raid Groups</h2>
        <button
          onClick={handleReset}
          className="text-sm text-gray-400 hover:text-white px-3 py-1 rounded border border-gray-600 hover:border-gray-400"
        >
          Reset
        </button>
      </div>
      <p className="text-gray-400 text-sm mb-4">
        Drag players between groups to customize assignments.
      </p>

      {/* Group cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {groups.map((group, gi) => (
          <div
            key={gi}
            className={`bg-gray-900 rounded-lg p-3 transition-colors ${
              dropTarget === gi ? 'ring-2 ring-blue-500' : ''
            }`}
            onDragOver={handleDragOver(gi)}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop(gi)}
          >
            {/* Group header */}
            <div className="flex items-center justify-between mb-2">
              <input
                type="text"
                value={group.label}
                onChange={(e) => handleLabelChange(gi, e.target.value)}
                className="bg-transparent border-b border-transparent hover:border-gray-600 focus:border-blue-500 focus:outline-none text-sm font-medium w-32 px-0"
              />
              <span className="text-gray-500 text-xs">{group.players.length}/5</span>
            </div>

            {/* Player list */}
            <div className="space-y-1 min-h-[2.5rem]">
              {group.players.map((name) => {
                const cls = getPlayerClass(roster, name);
                const isDragging = dragSource?.playerName === name && dragSource?.groupIndex === gi;
                return (
                  <div
                    key={name}
                    draggable
                    onDragStart={handleDragStart(gi, name)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 px-2 py-1 rounded text-sm cursor-grab active:cursor-grabbing bg-gray-800 hover:bg-gray-700 transition-opacity ${
                      isDragging ? 'opacity-40' : ''
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cls ? CLASS_COLORS[cls as keyof typeof CLASS_COLORS] : '#888' }}
                    />
                    <span
                      className="truncate"
                      style={{ color: cls ? CLASS_COLORS[cls as keyof typeof CLASS_COLORS] : '#ccc' }}
                    >
                      {name}
                    </span>
                  </div>
                );
              })}

              {/* Empty slot indicators */}
              {Array.from({ length: Math.max(0, 5 - group.players.length) }).map((_, si) => (
                <div
                  key={`empty-${si}`}
                  className="border border-dashed border-gray-700 rounded px-2 py-1 text-gray-600 text-sm text-center"
                >
                  ---
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Unassigned pool */}
      {unassigned.length > 0 && (
        <div
          className={`bg-gray-900 rounded-lg p-3 transition-colors ${
            dropTarget === 'pool' ? 'ring-2 ring-blue-500' : ''
          }`}
          onDragOver={handleDragOver('pool')}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop('pool')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-400">Unassigned</span>
            <span className="text-gray-500 text-xs">{unassigned.length} player{unassigned.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {unassigned.map((name) => {
              const cls = getPlayerClass(roster, name);
              const isDragging = dragSource?.playerName === name && dragSource?.groupIndex === 'pool';
              return (
                <div
                  key={name}
                  draggable
                  onDragStart={handleDragStart('pool', name)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-sm cursor-grab active:cursor-grabbing bg-gray-800 hover:bg-gray-700 transition-opacity ${
                    isDragging ? 'opacity-40' : ''
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cls ? CLASS_COLORS[cls as keyof typeof CLASS_COLORS] : '#888' }}
                  />
                  <span
                    className="truncate"
                    style={{ color: cls ? CLASS_COLORS[cls as keyof typeof CLASS_COLORS] : '#ccc' }}
                  >
                    {name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

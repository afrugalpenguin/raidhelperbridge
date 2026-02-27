import { useState, useRef, useEffect } from 'react';
import type { RosterEntry } from '@/lib/rosterTypes';
import type { GroupAssignment, StoredGroupTemplate } from '@/lib/groupSolver';
import { autoAssignGroups, loadGroupTemplates, saveGroupTemplate, deleteGroupTemplate, applyGroupTemplate } from '@/lib/groupSolver';
import { CLASS_COLORS, ROLE_LABELS } from '@/lib/constants';
import { resolveGroupBuffs } from '@/lib/groupBuffs';
import type { RaidRole } from '@/lib/types';

interface Props {
  roster: RosterEntry[];
  groups: GroupAssignment[];
  onChange: (groups: GroupAssignment[]) => void;
}

type DragSource = { groupIndex: number | 'pool'; playerName: string };

function getPlayerName(entry: RosterEntry): string {
  return entry.wowCharacter.trim() || entry.discordName;
}

function getPlayerClass(roster: RosterEntry[], playerName: string): string | null {
  const entry = roster.find(r => getPlayerName(r) === playerName);
  return entry ? entry.class : null;
}

function encodeDrag(source: DragSource): string {
  return JSON.stringify(source);
}

function decodeDrag(e: React.DragEvent): DragSource | null {
  try {
    return JSON.parse(e.dataTransfer.getData('text/plain'));
  } catch {
    return null;
  }
}

export default function StepGroupBuilder({ roster, groups, onChange }: Props) {
  const [dropGroupTarget, setDropGroupTarget] = useState<number | 'pool' | null>(null);
  const [dropPlayerTarget, setDropPlayerTarget] = useState<string | null>(null);
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
  const dragSourceRef = useRef<DragSource | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<StoredGroupTemplate[]>([]);

  useEffect(() => {
    setSavedTemplates(loadGroupTemplates());
  }, []);

  // Compute pools by signup status
  const assignedNames = new Set(groups.flatMap(g => g.players));
  const confirmedRoster = roster.filter(r => r.signupStatus === 'confirmed');
  const tentativeRoster = roster.filter(r => r.signupStatus === 'tentative');
  const otherRoster = roster.filter(r => r.signupStatus !== 'confirmed' && r.signupStatus !== 'tentative');

  const unassigned = confirmedRoster
    .map(getPlayerName)
    .filter(name => !assignedNames.has(name));
  const tentative = tentativeRoster
    .map(getPlayerName)
    .filter(name => !assignedNames.has(name));
  const other = otherRoster
    .map(getPlayerName)
    .filter(name => !assignedNames.has(name));

  const handleReset = () => {
    setDraggedPlayer(null);
    setDropGroupTarget(null);
    setDropPlayerTarget(null);
    onChange(autoAssignGroups(roster));
  };

  const handleSave = () => {
    const name = prompt('Template name:');
    if (!name?.trim()) return;
    saveGroupTemplate(name.trim(), groups);
    setSavedTemplates(loadGroupTemplates());
  };

  const handleLoad = (templateName: string) => {
    const template = savedTemplates.find(t => t.name === templateName);
    if (!template) return;
    onChange(applyGroupTemplate(template, roster));
  };

  const handleDelete = (templateName: string) => {
    deleteGroupTemplate(templateName);
    setSavedTemplates(loadGroupTemplates());
  };

  const handleLabelChange = (groupIndex: number, label: string) => {
    onChange(groups.map((g, i) => i === groupIndex ? { ...g, label } : g));
  };

  // --- Drag start ---
  const onDragStart = (groupIndex: number | 'pool', playerName: string) => (e: React.DragEvent) => {
    const source: DragSource = { groupIndex, playerName };
    dragSourceRef.current = source;
    setDraggedPlayer(playerName);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', encodeDrag(source));
  };

  const onDragEnd = () => {
    dragSourceRef.current = null;
    setDraggedPlayer(null);
    setDropGroupTarget(null);
    setDropPlayerTarget(null);
  };

  // --- Drop on a group (move player into it) ---
  const onGroupDragOver = (gi: number | 'pool') => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropGroupTarget(gi);
    setDropPlayerTarget(null);
  };

  const onGroupDragLeave = () => {
    setDropGroupTarget(null);
  };

  const onGroupDrop = (targetGroupIndex: number | 'pool') => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedPlayer(null);
    setDropGroupTarget(null);
    setDropPlayerTarget(null);

    const source = decodeDrag(e);
    if (!source) return;
    if (source.groupIndex === targetGroupIndex) return;

    // Move: remove from source, add to target
    const updated = groups.map((g, i) => {
      let players = [...g.players];
      if (i === source.groupIndex) {
        players = players.filter(p => p !== source.playerName);
      }
      if (i === targetGroupIndex) {
        players = [...players, source.playerName];
      }
      return { ...g, players };
    });

    onChange(updated);
  };

  // --- Drop on a player (swap) ---
  const onPlayerDragOver = (targetGroupIndex: number | 'pool', targetPlayer: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDropPlayerTarget(targetPlayer);
    setDropGroupTarget(targetGroupIndex);
  };

  const onPlayerDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDropPlayerTarget(null);
  };

  const onPlayerDrop = (targetGroupIndex: number | 'pool', targetPlayer: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedPlayer(null);
    setDropGroupTarget(null);
    setDropPlayerTarget(null);

    const source = decodeDrag(e);
    if (!source) return;
    if (source.playerName === targetPlayer) return;

    // Swap the two players in their respective groups
    const updated = groups.map((g, i) => {
      let players = g.players.map(p => {
        if (p === source.playerName) return targetPlayer;
        if (p === targetPlayer) return source.playerName;
        return p;
      });
      // If source was from pool, just add source player where target was
      // and remove target (target goes to pool automatically)
      if (source.groupIndex === 'pool' && i === targetGroupIndex) {
        players = g.players.map(p => p === targetPlayer ? source.playerName : p);
      }
      return { ...g, players };
    });

    onChange(updated);
  };

  // --- Render helpers ---
  const renderPlayer = (name: string, groupIndex: number | 'pool') => {
    const cls = getPlayerClass(roster, name);
    const isDragging = draggedPlayer === name;
    const isSwapTarget = dropPlayerTarget === name;
    // Highlight the dragged player too when hovering over a swap target
    const isSwapSource = isDragging && dropPlayerTarget !== null;
    const highlighted = isSwapTarget || isSwapSource;

    return (
      <div
        key={name}
        draggable
        onDragStart={onDragStart(groupIndex, name)}
        onDragEnd={onDragEnd}
        onDragOver={onPlayerDragOver(groupIndex, name)}
        onDragLeave={onPlayerDragLeave}
        onDrop={onPlayerDrop(groupIndex, name)}
        className={`flex items-center gap-2 px-2 py-1 rounded text-sm cursor-grab active:cursor-grabbing transition-all ${
          highlighted
            ? 'bg-blue-600/30 ring-1 ring-blue-500'
            : 'bg-gray-800 hover:bg-gray-700'
        } ${isDragging && !isSwapSource ? 'opacity-40' : ''}`}
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
  };

  return (
    <section className="bg-gray-800 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold">4. Raid Groups</h2>
        <div className="flex items-center gap-2">
          {savedTemplates.length > 0 && (
            <div className="flex items-center gap-1">
              <select
                defaultValue=""
                onChange={(e) => { handleLoad(e.target.value); e.target.value = ''; }}
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="" disabled>Load template...</option>
                {savedTemplates.map(t => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  const name = prompt('Delete which template?\n\n' + savedTemplates.map(t => t.name).join('\n'));
                  if (name) handleDelete(name);
                }}
                className="text-gray-500 hover:text-red-400 text-sm px-1"
                title="Delete a template"
              >
                x
              </button>
            </div>
          )}
          <button
            onClick={handleSave}
            className="text-sm text-gray-400 hover:text-white px-3 py-1 rounded border border-gray-600 hover:border-gray-400"
          >
            Save
          </button>
          <button
            onClick={handleReset}
            className="text-sm text-gray-400 hover:text-white px-3 py-1 rounded border border-gray-600 hover:border-gray-400"
          >
            Reset
          </button>
        </div>
      </div>
      <p className="text-gray-400 text-sm mb-4">
        Drag to a group to move, or onto a player to swap.
      </p>

      {/* Role count summary */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        {(['tank', 'healer', 'mdps', 'rdps', 'dps'] as RaidRole[])
          .map(role => {
            const count = confirmedRoster.filter(r => r.role === role).length;
            if (count === 0) return null;
            return (
              <span key={role} className="text-gray-300">
                <span className="text-gray-500">{ROLE_LABELS[role]}:</span> {count}
              </span>
            );
          })
        }
        <span className="text-gray-300">
          <span className="text-gray-500">Total:</span> {confirmedRoster.length}
        </span>
      </div>

      {/* Group cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {groups.map((group, gi) => {
          const isOver = dropGroupTarget === gi && !dropPlayerTarget;
          const overLimit = group.players.length > 5;
          const incomplete = group.players.length < 5;

          return (
            <div
              key={gi}
              className={`bg-gray-900 rounded-lg p-3 transition-colors ${
                isOver ? 'ring-2 ring-blue-500' : ''
              } ${incomplete ? 'ring-1 ring-amber-500/50' : ''}`}
              onDragOver={onGroupDragOver(gi)}
              onDragLeave={onGroupDragLeave}
              onDrop={onGroupDrop(gi)}
            >
              {/* Group header */}
              <div className="flex items-center justify-between mb-2">
                <input
                  type="text"
                  value={group.label}
                  onChange={(e) => handleLabelChange(gi, e.target.value)}
                  className="bg-transparent border-b border-transparent hover:border-gray-600 focus:border-blue-500 focus:outline-none text-sm font-medium w-32 px-0"
                />
                <span className={`text-xs flex items-center gap-1 ${
                  overLimit ? 'text-red-400 font-bold' : incomplete ? 'text-amber-400' : 'text-gray-500'
                }`}>
                  {incomplete && <span title="Group incomplete">&#9888;</span>}
                  {group.players.length}/5
                </span>
              </div>

              {/* Player list */}
              <div className="space-y-1 min-h-[2.5rem]">
                {group.players.map((name) => renderPlayer(name, gi))}

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

              {/* Buff icons */}
              <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-800">
                {resolveGroupBuffs(group.players, roster).map(({ buff, active, provider }) => (
                  <img
                    key={buff.id}
                    src={`https://wow.zamimg.com/images/wow/icons/small/${buff.icon}.jpg`}
                    alt={buff.name}
                    title={active ? `${buff.name} (${provider})` : `${buff.name} — missing`}
                    className={`w-4 h-4 rounded-sm ${active ? '' : 'opacity-25 grayscale'}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pool boxes: Unassigned, Tentative, Other */}
      {(unassigned.length > 0 || tentative.length > 0 || other.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'Unassigned', players: unassigned },
            { label: 'Tentative', players: tentative },
            { label: 'Bench / Late / Absent', players: other },
          ].map(pool => (
            <div
              key={pool.label}
              className={`bg-gray-900 rounded-lg p-3 transition-colors ${
                dropGroupTarget === 'pool' && !dropPlayerTarget ? 'ring-2 ring-blue-500' : ''
              }`}
              onDragOver={onGroupDragOver('pool')}
              onDragLeave={onGroupDragLeave}
              onDrop={onGroupDrop('pool')}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-400">{pool.label}</span>
                <span className="text-gray-500 text-xs">{pool.players.length}</span>
              </div>
              <div className="space-y-1 min-h-[2rem]">
                {pool.players.map((name) => renderPlayer(name, 'pool'))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

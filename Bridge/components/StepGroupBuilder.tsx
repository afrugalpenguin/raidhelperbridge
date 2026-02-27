import { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import type { RosterEntry } from '@/lib/rosterTypes';
import type { GroupAssignment, StoredGroupTemplate } from '@/lib/groupSolver';
import { autoAssignGroups, loadGroupTemplates, saveGroupTemplate, deleteGroupTemplate, applyGroupTemplate } from '@/lib/groupSolver';
import { CLASS_COLORS, ROLE_LABELS } from '@/lib/constants';
import { resolveGroupBuffs, BUFFS } from '@/lib/groupBuffs';
import { encodeShareUrl } from '@/lib/shareUrl';
import type { RaidRole } from '@/lib/types';

interface Props {
  roster: RosterEntry[];
  groups: GroupAssignment[];
  onChange: (groups: GroupAssignment[]) => void;
  eventId: string;
  initialBuffOverrides?: Set<string> | null;
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

const StepGroupBuilder = forwardRef<HTMLElement, Props>(function StepGroupBuilder({ roster, groups, onChange, eventId, initialBuffOverrides }, ref) {
  const [dropGroupTarget, setDropGroupTarget] = useState<number | 'pool' | null>(null);
  const [dropPlayerTarget, setDropPlayerTarget] = useState<string | null>(null);
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
  const dragSourceRef = useRef<DragSource | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<StoredGroupTemplate[]>([]);
  // Player-keyed buff overrides: `${playerName}_${buffId}` in set
  // Overrides follow the player when dragged between groups
  const [buffOverrides, setBuffOverrides] = useState<Set<string>>(initialBuffOverrides ?? new Set());
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');
  const [warningsExpanded, setWarningsExpanded] = useState(false);
  // Popover state: which buff icon is showing a candidate picker
  const [buffPopover, setBuffPopover] = useState<{ groupIndex: number; buffId: string; candidates: string[] } | null>(null);

  // Undo/redo history
  interface Snapshot { groups: GroupAssignment[]; overrides: string[] }
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const pushSnapshot = useCallback(() => {
    const snap: Snapshot = {
      groups: groups.map(g => ({ ...g, players: [...g.players] })),
      overrides: Array.from(buffOverrides),
    };
    setHistory(prev => {
      const truncated = prev.slice(0, historyIndex + 1);
      return [...truncated, snap];
    });
    setHistoryIndex(prev => prev + 1);
  }, [groups, buffOverrides, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex < 0) return;
    const snap = history[historyIndex];
    onChange(snap.groups);
    setBuffOverrides(new Set(snap.overrides));
    setHistoryIndex(prev => prev - 1);
  }, [history, historyIndex, onChange]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 2) return;
    const snap = history[historyIndex + 2];
    if (!snap) return;
    onChange(snap.groups);
    setBuffOverrides(new Set(snap.overrides));
    setHistoryIndex(prev => prev + 1);
  }, [history, historyIndex, onChange]);

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 2;

  const setOverride = (playerName: string, buffId: string, on: boolean) => {
    setBuffOverrides(prev => {
      const next = new Set(prev);
      const key = `${playerName}_${buffId}`;
      if (on) next.add(key); else next.delete(key);
      return next;
    });
  };

  const getCandidates = (groupIndex: number | 'pool', providerClass: string): string[] => {
    const groupPlayers = groupIndex !== 'pool' ? groups[groupIndex].players : [];
    return groupPlayers.filter(p => {
      const entry = roster.find(r => getPlayerName(r) === p);
      return entry && entry.class === providerClass;
    });
  };

  const handleBuffClick = (groupIndex: number | 'pool', buffId: string, autoProvider: string | undefined, buff: { providerClass: string }) => {
    pushSnapshot();
    // If auto-detected provider exists, toggle override on that player
    if (autoProvider) {
      const key = `${autoProvider}_${buffId}`;
      setOverride(autoProvider, buffId, !buffOverrides.has(key));
      setBuffPopover(null);
      return;
    }

    // Check if there's already an override for someone in this group — if so, remove it
    if (groupIndex !== 'pool') {
      const existing = groups[groupIndex].players.find(p => buffOverrides.has(`${p}_${buffId}`));
      if (existing) {
        setOverride(existing, buffId, false);
        setBuffPopover(null);
        return;
      }
    }

    // No override yet — find candidates
    const candidates = typeof groupIndex === 'number' ? getCandidates(groupIndex, buff.providerClass) : [];
    if (candidates.length === 0) return;
    if (candidates.length === 1) {
      setOverride(candidates[0], buffId, true);
      setBuffPopover(null);
      return;
    }

    // Multiple candidates — show popover
    setBuffPopover({ groupIndex: groupIndex as number, buffId, candidates });
  };

  const getBuffActive = (playerNames: string[], buffId: string, autoActive: boolean): boolean => {
    const hasOverride = playerNames.some(p => buffOverrides.has(`${p}_${buffId}`));
    if (hasOverride) return !autoActive;
    return autoActive;
  };

  const isOverridden = (playerNames: string[], buffId: string): boolean => {
    return playerNames.some(p => buffOverrides.has(`${p}_${buffId}`));
  };

  useEffect(() => {
    setSavedTemplates(loadGroupTemplates());
  }, []);

  // Apply shared buff overrides when loaded from URL
  useEffect(() => {
    if (initialBuffOverrides && initialBuffOverrides.size > 0) {
      setBuffOverrides(initialBuffOverrides);
    }
  }, [initialBuffOverrides]);

  // Close buff popover on outside click
  useEffect(() => {
    if (!buffPopover) return;
    const handler = () => setBuffPopover(null);
    // Delay so the opening click doesn't immediately close it
    const id = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => { clearTimeout(id); document.removeEventListener('click', handler); };
  }, [buffPopover]);

  // Undo/redo keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [undo, redo]);

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
    pushSnapshot();
    setDraggedPlayer(null);
    setDropGroupTarget(null);
    setDropPlayerTarget(null);
    setBuffOverrides(new Set());
    onChange(autoAssignGroups(roster));
  };

  const handleSave = () => {
    const name = prompt('Template name:');
    if (!name?.trim()) return;
    saveGroupTemplate(name.trim(), groups, buffOverrides);
    setSavedTemplates(loadGroupTemplates());
  };

  const handleLoad = (templateName: string) => {
    const template = savedTemplates.find(t => t.name === templateName);
    if (!template) return;
    pushSnapshot();
    onChange(applyGroupTemplate(template, roster));
    setBuffOverrides(template.buffOverrides ? new Set(template.buffOverrides) : new Set());
  };

  const handleDelete = (templateName: string) => {
    deleteGroupTemplate(templateName);
    setSavedTemplates(loadGroupTemplates());
  };

  const handleShare = async () => {
    const url = encodeShareUrl(eventId, groups, buffOverrides);
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2000);
    } catch {
      // Fallback: select text in a prompt
      window.prompt('Copy this share URL:', url);
    }
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

    pushSnapshot();

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

    pushSnapshot();

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
    <section ref={ref} className="bg-gray-800 rounded-lg p-6 mb-6">
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
            onClick={undo}
            disabled={!canUndo}
            className="text-sm text-gray-400 hover:text-white px-2 py-1 rounded border border-gray-600 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="text-sm text-gray-400 hover:text-white px-2 py-1 rounded border border-gray-600 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Y)"
          >
            Redo
          </button>
          <button
            onClick={handleShare}
            className={`text-sm px-3 py-1 rounded border ${
              shareStatus === 'copied'
                ? 'text-green-400 border-green-600'
                : 'text-gray-400 hover:text-white border-gray-600 hover:border-gray-400'
            }`}
          >
            {shareStatus === 'copied' ? 'Copied!' : 'Share'}
          </button>
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

      {/* Buff coverage summary */}
      <div className="flex flex-wrap gap-2 mb-4">
        {BUFFS.map(buff => {
          const covered = groups.filter(g => {
            const auto = resolveGroupBuffs(g.players, roster, buffOverrides).find(b => b.buff.id === buff.id);
            const autoActive = auto?.active ?? false;
            const hasOverride = g.players.some(p => buffOverrides.has(`${p}_${buff.id}`));
            return hasOverride ? !autoActive : autoActive;
          }).length;
          return (
            <div
              key={buff.id}
              className={`flex items-center gap-1 ${covered > 0 ? '' : 'opacity-30 grayscale'}`}
              title={`${buff.name}: ${covered}/${groups.length} groups`}
            >
              <img
                src={`https://wow.zamimg.com/images/wow/icons/small/${buff.icon}.jpg`}
                alt={buff.name}
                className="w-4 h-4 rounded-sm"
              />
              <span className={`text-xs ${covered > 0 ? 'text-gray-300' : 'text-gray-600'}`}>{covered}</span>
            </div>
          );
        })}
      </div>

      {/* Missing buff warnings */}
      {(() => {
        // Compute which buffs are available raid-wide (at least one provider exists)
        const allPlayers = groups.flatMap(g => g.players);
        const raidBuffs = resolveGroupBuffs(allPlayers, roster, buffOverrides);
        const availableBuffIds = new Set(
          raidBuffs
            .filter(b => {
              const hasOverride = allPlayers.some(p => buffOverrides.has(`${p}_${b.buff.id}`));
              return hasOverride ? !b.active : b.active;
            })
            .map(b => b.buff.id)
        );

        // For each group, find which available buffs are missing
        const groupWarnings = groups.map((g, gi) => {
          const resolved = resolveGroupBuffs(g.players, roster, buffOverrides);
          const missing = resolved.filter(b => {
            if (!availableBuffIds.has(b.buff.id)) return false;
            const active = g.players.some(p => buffOverrides.has(`${p}_${b.buff.id}`)) ? !b.active : b.active;
            return !active;
          });
          return { groupIndex: gi, label: g.label, missing };
        }).filter(w => w.missing.length > 0);

        if (groupWarnings.length === 0) return null;

        const totalMissing = groupWarnings.reduce((sum, w) => sum + w.missing.length, 0);

        return (
          <div className="mb-4">
            <button
              onClick={() => setWarningsExpanded(prev => !prev)}
              className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              <span>&#9888;</span>
              <span>{groupWarnings.length} group{groupWarnings.length > 1 ? 's' : ''} missing buffs ({totalMissing} total)</span>
              <span className={`transition-transform ${warningsExpanded ? 'rotate-90' : ''}`}>&#9656;</span>
            </button>
            {warningsExpanded && (
              <div className="mt-2 space-y-1 pl-5">
                {groupWarnings.map(w => (
                  <div key={w.groupIndex} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400 w-20 flex-shrink-0">{w.label}:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {w.missing.map(b => (
                        <div key={b.buff.id} className="flex items-center gap-1" title={b.buff.name}>
                          <img
                            src={`https://wow.zamimg.com/images/wow/icons/small/${b.buff.icon}.jpg`}
                            alt={b.buff.name}
                            className="w-4 h-4 rounded-sm opacity-50"
                          />
                          <span className="text-gray-500 text-xs">{b.buff.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

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
                {resolveGroupBuffs(group.players, roster, buffOverrides).map(({ buff, active: autoActive, provider }) => {
                  const shown = getBuffActive(group.players, buff.id, autoActive);
                  const overridden = isOverridden(group.players, buff.id);
                  const popoverOpen = buffPopover?.groupIndex === gi && buffPopover?.buffId === buff.id;
                  return (
                    <div key={buff.id} className="relative">
                      <img
                        src={`https://wow.zamimg.com/images/wow/icons/small/${buff.icon}.jpg`}
                        alt={buff.name}
                        title={
                          overridden
                            ? `${buff.name} (manual${shown ? '' : ' — disabled'})`
                            : shown ? `${buff.name} (${provider})` : `${buff.name} — missing`
                        }
                        onClick={() => handleBuffClick(gi, buff.id, provider, buff)}
                        className={`w-4 h-4 rounded-sm cursor-pointer transition-all ${
                          shown ? '' : 'opacity-25 grayscale'
                        } ${overridden ? 'ring-1 ring-yellow-500/60' : ''}`}
                      />
                      {popoverOpen && (
                        <div className="absolute bottom-6 left-0 bg-gray-800 border border-gray-600 rounded shadow-lg py-1 z-50 min-w-[120px]">
                          <div className="text-xs text-gray-400 px-2 pb-1 border-b border-gray-700">{buff.name}</div>
                          {buffPopover.candidates.map(name => {
                            const cls = getPlayerClass(roster, name);
                            return (
                              <button
                                key={name}
                                onClick={() => { setOverride(name, buff.id, true); setBuffPopover(null); }}
                                className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-700"
                                style={{ color: cls ? CLASS_COLORS[cls as keyof typeof CLASS_COLORS] : '#ccc' }}
                              >
                                {name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
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
});

export default StepGroupBuilder;

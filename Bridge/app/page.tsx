'use client';

import { useState } from 'react';
import type { EventData, RosterEntry } from '@/lib/rosterTypes';
import { loadMappings, saveMapping } from '@/lib/characterMappings';
import { autoResolveCC } from '@/lib/ccResolver';
import type { CCAssignment } from '@/lib/ccResolver';
import type { GroupAssignment } from '@/lib/groupSolver';
import { autoAssignGroups } from '@/lib/groupSolver';
import StepFetchEvent from '@/components/StepFetchEvent';
import StepMapNames from '@/components/StepMapNames';
import StepCCRules from '@/components/StepCCRules';
import StepGroupBuilder from '@/components/StepGroupBuilder';
import StepGenerateImport from '@/components/StepGenerateImport';

function extractEventId(input: string): string | null {
  const trimmed = input.trim();
  // Plain numeric ID
  if (/^\d+$/.test(trimmed)) return trimmed;
  // URL like raid-helper.dev/event/<id>, /events/<id>, or /raidplan/<id>
  const match = trimmed.match(/raid-helper\.dev\/(?:events?|raidplan)\/(\d+)/);
  return match ? match[1] : null;
}

export default function Home() {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [event, setEvent] = useState<EventData | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [ccAssignments, setCCAssignments] = useState<CCAssignment[]>([]);
  const [groups, setGroups] = useState<GroupAssignment[]>([]);

  const fetchEvent = async () => {
    const eventId = extractEventId(urlInput);
    if (!eventId) {
      setError('Enter a valid Raid-Helper event URL or numeric ID.');
      return;
    }

    setLoading(true);
    setError('');
    setEvent(null);
    setRoster([]);

    try {
      const res = await fetch(`/api/event?id=${eventId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to fetch event (${res.status})`);
      }
      const data: EventData = await res.json();
      setEvent(data);
      const stored = loadMappings();
      const rosterEntries = data.signups.map((s) => ({
        discordId: s.discordId,
        discordName: s.discordName,
        class: s.class,
        role: s.role,
        spec: s.spec,
        position: s.position,
        groupNumber: s.groupNumber,
        signupStatus: s.status,
        wowCharacter: stored[s.discordId] || '',
      }));
      setRoster(rosterEntries);
      // Auto-resolve initial CC assignments
      setCCAssignments(autoResolveCC(rosterEntries));
      // Auto-assign groups
      setGroups(autoAssignGroups(rosterEntries));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const updateWowName = (index: number, name: string) => {
    setRoster((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], wowCharacter: name };
      saveMapping(next[index].discordId, name);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-1">Raid Helper Bridge</h1>
        <p className="text-gray-400 mb-8">Import Raid-Helper signups into the Raid Helper Bridge WoW addon</p>

        <StepFetchEvent
          urlInput={urlInput}
          setUrlInput={setUrlInput}
          loading={loading}
          error={error}
          event={event}
          onFetch={fetchEvent}
        />

        {roster.length > 0 && (
          <>
            <StepMapNames roster={roster} onUpdateName={updateWowName} />
            <StepCCRules roster={roster} assignments={ccAssignments} onChange={setCCAssignments} />
            <StepGroupBuilder roster={roster} groups={groups} onChange={setGroups} />
            <StepGenerateImport event={event!} roster={roster} ccAssignments={ccAssignments} groupAssignments={groups} />
          </>
        )}
      </div>
    </div>
  );
}

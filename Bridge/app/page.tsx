'use client';

import { useState } from 'react';
import type { RaidSignup, WowClass, RaidRole } from '@/lib/types';

interface EventData {
  eventId: string;
  title: string;
  description?: string;
  startTime: string; // ISO string from JSON
  signups: RaidSignup[];
}

interface RosterEntry {
  discordId: string;
  discordName: string;
  class: WowClass;
  role: RaidRole;
  spec?: string;
  wowCharacter: string;
}

const CLASS_COLORS: Record<WowClass, string> = {
  WARRIOR: '#C79C6E',
  PALADIN: '#F58CBA',
  HUNTER: '#ABD473',
  ROGUE: '#FFF569',
  PRIEST: '#FFFFFF',
  SHAMAN: '#0070DE',
  MAGE: '#69CCF0',
  WARLOCK: '#9482C9',
  DRUID: '#FF7D0A',
};

const ROLE_LABELS: Record<RaidRole, string> = {
  tank: 'Tank',
  healer: 'Healer',
  mdps: 'Melee DPS',
  rdps: 'Ranged DPS',
  dps: 'DPS',
};

function extractEventId(input: string): string | null {
  const trimmed = input.trim();
  // Plain numeric ID
  if (/^\d+$/.test(trimmed)) return trimmed;
  // URL like raid-helper.dev/event/<id> or raid-helper.dev/events/<id>
  const match = trimmed.match(/raid-helper\.dev\/events?\/(\d+)/);
  return match ? match[1] : null;
}

export default function Home() {
  // Step 1: Event input
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [event, setEvent] = useState<EventData | null>(null);

  // Step 2: Roster
  const [roster, setRoster] = useState<RosterEntry[]>([]);

  // Step 3: Output
  const [importString, setImportString] = useState('');
  const [summary, setSummary] = useState('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

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
    setImportString('');
    setSummary('');

    try {
      const res = await fetch(`/api/event?id=${eventId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to fetch event (${res.status})`);
      }
      const data: EventData = await res.json();
      setEvent(data);
      setRoster(
        data.signups.map((s) => ({
          discordId: s.discordId,
          discordName: s.discordName,
          class: s.class,
          role: s.role,
          spec: s.spec,
          wowCharacter: '',
        }))
      );
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
      return next;
    });
  };

  const emptyCount = roster.filter((r) => !r.wowCharacter.trim()).length;

  const generateImport = async () => {
    setGenerating(true);
    try {
      // Dynamic import to keep pako out of initial bundle
      const { buildImportPayload, generateImportString, generateImportSummary, DEFAULT_CC_TEMPLATE, DEFAULT_GROUP_TEMPLATES } =
        await import('@/lib/importGenerator');

      const raidEvent = {
        eventId: event!.eventId,
        serverId: '',
        channelId: '',
        messageId: '',
        title: event!.title,
        description: event!.description,
        startTime: new Date(event!.startTime),
        signups: roster.map((r) => ({
          discordId: r.discordId,
          discordName: r.discordName,
          wowCharacter: r.wowCharacter.trim() || undefined,
          class: r.class,
          role: r.role,
          spec: r.spec,
          signupTime: new Date(),
          status: 'confirmed' as const,
        })),
        createdBy: '',
      };

      const payload = buildImportPayload(raidEvent, DEFAULT_CC_TEMPLATE, DEFAULT_GROUP_TEMPLATES);
      const str = generateImportString(payload);
      const sum = generateImportSummary(payload);
      setImportString(str);
      setSummary(sum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate import string');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(importString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-1">Raid Helper Bridge</h1>
        <p className="text-gray-400 mb-8">Import Raid-Helper signups into your WoW addon</p>

        {/* Step 1: Event Input */}
        <section className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">1. Fetch Event</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchEvent()}
              placeholder="Paste Raid-Helper event URL or ID"
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={fetchEvent}
              disabled={loading || !urlInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-2 rounded font-medium whitespace-nowrap"
            >
              {loading ? 'Fetching...' : 'Fetch Event'}
            </button>
          </div>
          {error && <p className="text-red-400 mt-3 text-sm">{error}</p>}
          {event && (
            <div className="mt-4 border-t border-gray-700 pt-4">
              <p className="font-semibold text-lg">{event.title}</p>
              <p className="text-gray-400 text-sm">
                {new Date(event.startTime).toLocaleString()} &middot; {event.signups.length} signups
              </p>
            </div>
          )}
        </section>

        {/* Step 2: Roster & Name Mapping */}
        {roster.length > 0 && (
          <section className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-1">2. Map Character Names</h2>
            <p className="text-gray-400 text-sm mb-4">
              Enter each player&apos;s WoW character name.
              {emptyCount > 0 && (
                <span className="text-yellow-400 ml-2">{emptyCount} still empty</span>
              )}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-left border-b border-gray-700">
                    <th className="pb-2 pr-4">Discord Name</th>
                    <th className="pb-2 pr-4">Class</th>
                    <th className="pb-2 pr-4">Role / Spec</th>
                    <th className="pb-2">WoW Character Name</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((entry, i) => (
                    <tr key={entry.discordId + i} className="border-b border-gray-700/50">
                      <td className="py-2 pr-4" style={{ color: CLASS_COLORS[entry.class] }}>
                        {entry.discordName}
                      </td>
                      <td className="py-2 pr-4" style={{ color: CLASS_COLORS[entry.class] }}>
                        {entry.class}
                      </td>
                      <td className="py-2 pr-4 text-gray-300">
                        {ROLE_LABELS[entry.role]}
                        {entry.spec ? ` (${entry.spec})` : ''}
                      </td>
                      <td className="py-2">
                        <input
                          type="text"
                          value={entry.wowCharacter}
                          onChange={(e) => updateWowName(i, e.target.value)}
                          placeholder="Character name"
                          className={`bg-gray-700 border rounded px-3 py-1 w-full max-w-[200px] text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 ${
                            !entry.wowCharacter.trim() ? 'border-yellow-500/50' : 'border-gray-600'
                          }`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Step 3: Generate & Copy */}
        {roster.length > 0 && (
          <section className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3">3. Generate Import String</h2>
            <button
              onClick={generateImport}
              disabled={generating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 py-3 rounded-lg font-semibold mb-4"
            >
              {generating ? 'Generating...' : 'Generate Import String'}
            </button>

            {importString && (
              <>
                <div className="bg-gray-900 p-4 rounded font-mono text-xs break-all mb-3 max-h-32 overflow-y-auto">
                  {importString}
                </div>
                <button
                  onClick={copyToClipboard}
                  className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-medium mb-4"
                >
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>

                {summary && (
                  <details className="mt-4" open>
                    <summary className="cursor-pointer text-gray-400 text-sm font-medium">
                      Import Summary
                    </summary>
                    <pre className="mt-2 bg-gray-900 p-4 rounded text-sm text-gray-300 whitespace-pre-wrap">
                      {summary}
                    </pre>
                  </details>
                )}

                <div className="mt-4 border-t border-gray-700 pt-4 text-gray-400 text-sm">
                  <p className="font-medium text-white mb-2">How to import in WoW:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Copy the import string above</li>
                    <li>In WoW, type <code className="bg-gray-700 px-1 rounded">/rhb import</code></li>
                    <li>Paste into the dialog and click Accept</li>
                    <li>Use <code className="bg-gray-700 px-1 rounded">/rhb invite</code> to send raid invites</li>
                    <li>Use <code className="bg-gray-700 px-1 rounded">/rhb sort</code> to optimize groups</li>
                  </ol>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

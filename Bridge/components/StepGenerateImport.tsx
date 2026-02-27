import { useState } from 'react';
import type { EventData, RosterEntry } from '@/lib/rosterTypes';

interface Props {
  event: EventData;
  roster: RosterEntry[];
}

export default function StepGenerateImport({ event, roster }: Props) {
  const [importString, setImportString] = useState('');
  const [summary, setSummary] = useState('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateImport = async () => {
    setGenerating(true);
    try {
      // Dynamic import to keep pako out of initial bundle
      const { buildImportPayload, generateImportString, generateImportSummary, DEFAULT_CC_TEMPLATE, DEFAULT_GROUP_TEMPLATES } =
        await import('@/lib/importGenerator');

      const raidEvent = {
        eventId: event.eventId,
        serverId: '',
        channelId: '',
        messageId: '',
        title: event.title,
        description: event.description,
        startTime: new Date(event.startTime),
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
      // Re-throw so the parent can handle if needed, or log
      console.error('Failed to generate import string:', err);
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
    <section className="bg-gray-800 rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold mb-3">5. Generate Import String</h2>
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
  );
}

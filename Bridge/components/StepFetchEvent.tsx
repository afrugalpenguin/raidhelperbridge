import type { EventData } from '@/lib/rosterTypes';

interface Props {
  urlInput: string;
  setUrlInput: (val: string) => void;
  loading: boolean;
  error: string;
  event: EventData | null;
  onFetch: () => void;
}

export default function StepFetchEvent({ urlInput, setUrlInput, loading, error, event, onFetch }: Props) {
  return (
    <section className="bg-gray-800 rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold mb-3">1. Fetch Event</h2>
      <div className="flex gap-3">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onFetch()}
          placeholder="Paste Raid-Helper event URL or ID"
          className="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={onFetch}
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
  );
}

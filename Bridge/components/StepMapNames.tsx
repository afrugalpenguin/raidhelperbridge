import type { RosterEntry } from '@/lib/rosterTypes';
import { CLASS_COLORS, ROLE_LABELS } from '@/lib/constants';

interface Props {
  roster: RosterEntry[];
  onUpdateName: (index: number, name: string) => void;
}

export default function StepMapNames({ roster, onUpdateName }: Props) {
  const emptyCount = roster.filter((r) => !r.wowCharacter.trim()).length;

  return (
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
              <th className="pb-2 pr-2 w-8">#</th>
              <th className="pb-2 pr-4">Discord Name</th>
              <th className="pb-2 pr-4">Class</th>
              <th className="pb-2 pr-4">Role / Spec</th>
              <th className="pb-2">WoW Character Name</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((entry, i) => (
              <tr key={entry.discordId + i} className="border-b border-gray-700/50">
                <td className="py-2 pr-2 text-gray-500">{i + 1}</td>
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
                    onChange={(e) => onUpdateName(i, e.target.value)}
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
  );
}

import { useState } from 'react';

// Mock data for demonstration
const MOCK_EVENT = {
  eventId: 'demo123',
  eventName: 'Karazhan Thursday',
  eventTime: Math.floor(Date.now() / 1000) + 86400,
  players: [
    { name: 'Tankyboi', class: 'WARRIOR', role: 'tank' },
    { name: 'Healmaster', class: 'PRIEST', role: 'healer' },
    { name: 'Treehugger', class: 'DRUID', role: 'healer' },
    { name: 'Frostbolt', class: 'MAGE', role: 'rdps' },
    { name: 'Icyveins', class: 'MAGE', role: 'rdps' },
    { name: 'Dotmaster', class: 'WARLOCK', role: 'rdps' },
    { name: 'Backstab', class: 'ROGUE', role: 'mdps' },
    { name: 'Windfuryftw', class: 'SHAMAN', role: 'mdps' },
    { name: 'Huntard', class: 'HUNTER', role: 'rdps' },
    { name: 'Holylight', class: 'PALADIN', role: 'healer' },
  ],
};

const MARKERS = ['Star', 'Circle', 'Diamond', 'Triangle', 'Moon', 'Square', 'Cross', 'Skull'];
const CC_TYPES = ['polymorph', 'banish', 'shackle', 'freezingtrap', 'sap', 'hibernate', 'fear'];

export default function Home() {
  const [importString, setImportString] = useState('');
  const [ccRules, setCCRules] = useState<Record<number, string[]>>({
    6: ['polymorph', 'banish'],  // Square
    5: ['polymorph', 'shackle'], // Moon
    4: ['shackle', 'banish'],    // Triangle
  });

  const generateImport = () => {
    const payload = {
      version: 1,
      ...MOCK_EVENT,
      ccAssignments: Object.entries(ccRules).map(([marker, ccTypes]) => ({
        marker: parseInt(marker),
        assignments: ccTypes.map((ccType, idx) => ({
          ccType,
          playerName: getPlayerForCC(ccType, idx + 1),
        })).filter(a => a.playerName),
      })).filter(a => a.assignments.length > 0),
    };

    // In real implementation, this would use pako to deflate
    const json = JSON.stringify(payload);
    const base64 = btoa(json);
    setImportString(`!RHB!${base64}`);
  };

  const getPlayerForCC = (ccType: string, order: number): string | null => {
    const ccToClass: Record<string, string> = {
      polymorph: 'MAGE',
      banish: 'WARLOCK',
      shackle: 'PRIEST',
      freezingtrap: 'HUNTER',
      sap: 'ROGUE',
      hibernate: 'DRUID',
      fear: 'WARLOCK',
    };
    
    const targetClass = ccToClass[ccType];
    const players = MOCK_EVENT.players.filter(p => p.class === targetClass);
    return players[order - 1]?.name || null;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(importString);
    alert('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Raid Helper Bridge</h1>
        <p className="text-gray-400 mb-8">Generate import strings for the WoW addon</p>

        {/* Event Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Event: {MOCK_EVENT.eventName}</h2>
          <p className="text-gray-400 mb-4">
            {new Date(MOCK_EVENT.eventTime * 1000).toLocaleString()}
          </p>
          
          <h3 className="font-semibold mb-2">Signups ({MOCK_EVENT.players.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {MOCK_EVENT.players.map(player => (
              <div key={player.name} className="bg-gray-700 rounded p-2 text-sm">
                <span className={`class-${player.class.toLowerCase()}`}>
                  {player.name}
                </span>
                <span className="text-gray-400 text-xs block">{player.class}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CC Configuration */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">CC Assignments</h2>
          <p className="text-gray-400 mb-4 text-sm">
            Assignments resolve based on signups. "1st Mage" becomes the actual player name.
          </p>
          
          <div className="space-y-4">
            {[6, 5, 4].map(marker => (
              <div key={marker} className="flex items-center gap-4">
                <span className="w-20 font-semibold">{MARKERS[marker - 1]}</span>
                <div className="flex gap-2 flex-wrap">
                  {(ccRules[marker] || []).map((cc, idx) => {
                    const player = getPlayerForCC(cc, idx + 1);
                    return (
                      <span key={idx} className="bg-gray-700 px-3 py-1 rounded text-sm">
                        {cc} → {player || '(no player)'}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateImport}
          className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold mb-6"
        >
          Generate Import String
        </button>

        {/* Output */}
        {importString && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Import String</h2>
            <p className="text-gray-400 mb-2 text-sm">
              Copy this and paste into WoW with <code>/rhb import</code>
            </p>
            <div className="bg-gray-900 p-4 rounded font-mono text-sm break-all mb-4">
              {importString}
            </div>
            <button
              onClick={copyToClipboard}
              className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded"
            >
              Copy to Clipboard
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 text-gray-400 text-sm">
          <h3 className="font-semibold text-white mb-2">How to use:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Connect your Discord server (not implemented in demo)</li>
            <li>Select your Raid-Helper event</li>
            <li>Configure CC assignments for each marker</li>
            <li>Click "Generate Import String"</li>
            <li>In WoW: <code>/rhb import</code> and paste the string</li>
            <li>Use <code>/rhb invite</code> to send raid invites</li>
            <li>Use <code>/rhb sort</code> to optimize group buffs</li>
          </ol>
        </div>
      </div>

      <style jsx>{`
        .class-warrior { color: #C79C6E; }
        .class-paladin { color: #F58CBA; }
        .class-hunter { color: #ABD473; }
        .class-rogue { color: #FFF569; }
        .class-priest { color: #FFFFFF; }
        .class-shaman { color: #0070DE; }
        .class-mage { color: #69CCF0; }
        .class-warlock { color: #9482C9; }
        .class-druid { color: #FF7D0A; }
      `}</style>
    </div>
  );
}

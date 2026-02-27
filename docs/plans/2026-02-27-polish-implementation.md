# Polish Pass Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Take the working MVP to production quality — CC rule builder, group template builder, LDB minimap button, character name persistence, and tests.

**Architecture:** All configuration happens in the Bridge web app (5-step flow). The addon stays lean — receives, stores, and acts on import data. Data structures support future v2 in-game editors. Groups capped at 1–5 (TBC Anniversary, max 25 players).

**Tech Stack:** Next.js 14 / React 18 / Tailwind / pako (Bridge), Lua 5.1 / WoW TBC API / LibDataBroker / LibDBIcon (Addon), Vitest (tests)

---

### Task 1: Character Name Persistence (localStorage)

**Files:**
- Create: `Bridge/lib/characterMappings.ts`
- Modify: `Bridge/app/page.tsx` (lines 90-99 where roster is built, lines 107-113 updateWowName)

**Step 1: Create the mapping store module**

Create `Bridge/lib/characterMappings.ts`:

```typescript
const STORAGE_KEY = 'rhb-character-mappings';

interface StoredMapping {
  [discordId: string]: string; // discordId -> wowCharacter
}

export function loadMappings(): StoredMapping {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveMappings(mappings: StoredMapping): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function saveMapping(discordId: string, wowCharacter: string): void {
  const mappings = loadMappings();
  if (wowCharacter.trim()) {
    mappings[discordId] = wowCharacter.trim();
  } else {
    delete mappings[discordId];
  }
  saveMappings(mappings);
}
```

**Step 2: Wire into page.tsx**

In `page.tsx`, modify the `fetchEvent` success handler (around line 90) to pre-fill from localStorage:

```typescript
import { loadMappings, saveMapping } from '@/lib/characterMappings';

// Inside fetchEvent(), after setEvent(data), replace the setRoster call:
const stored = loadMappings();
setRoster(
  data.signups.map((s) => ({
    discordId: s.discordId,
    discordName: s.discordName,
    class: s.class,
    role: s.role,
    spec: s.spec,
    wowCharacter: stored[s.discordId] || '',
  }))
);
```

Modify `updateWowName` (around line 107) to persist on change:

```typescript
const updateWowName = (index: number, name: string) => {
  setRoster((prev) => {
    const next = [...prev];
    next[index] = { ...next[index], wowCharacter: name };
    saveMapping(next[index].discordId, name);
    return next;
  });
};
```

**Step 3: Commit**

```
feat(bridge): persist character name mappings in localStorage
```

---

### Task 2: Refactor page.tsx into Step Components

The page is about to grow from 3 steps to 5. Before adding new steps, extract each step into its own component file to keep things manageable.

**Files:**
- Create: `Bridge/components/StepFetchEvent.tsx`
- Create: `Bridge/components/StepMapNames.tsx`
- Create: `Bridge/components/StepGenerateImport.tsx`
- Modify: `Bridge/app/page.tsx`

**Step 1: Create StepFetchEvent component**

Extract lines 169-198 from page.tsx into `Bridge/components/StepFetchEvent.tsx`. Props:

```typescript
interface StepFetchEventProps {
  urlInput: string;
  setUrlInput: (val: string) => void;
  loading: boolean;
  error: string;
  event: EventData | null;
  onFetch: () => void;
}
```

**Step 2: Create StepMapNames component**

Extract lines 201-250 from page.tsx into `Bridge/components/StepMapNames.tsx`. Props:

```typescript
interface StepMapNamesProps {
  roster: RosterEntry[];
  onUpdateName: (index: number, name: string) => void;
}
```

Move `CLASS_COLORS` and `ROLE_LABELS` into a shared `Bridge/lib/constants.ts` since the CC builder will also need them.

**Step 3: Create StepGenerateImport component**

Extract lines 253-300 from page.tsx into `Bridge/components/StepGenerateImport.tsx`. Props:

```typescript
interface StepGenerateImportProps {
  event: EventData;
  roster: RosterEntry[];
  ccAssignments: ResolvedCCAssignment[];
  groupAssignments: GroupAssignment[];
  onGenerated: (importString: string, summary: string) => void;
}
```

**Step 4: Simplify page.tsx**

page.tsx becomes a thin orchestrator that manages state and renders steps 1–5 in order. Each step only renders when the previous step has data.

**Step 5: Commit**

```
refactor(bridge): extract step components from page.tsx
```

---

### Task 3: CC Rule Builder UI

**Files:**
- Create: `Bridge/lib/constants.ts` (if not done in Task 2)
- Create: `Bridge/lib/ccResolver.ts`
- Create: `Bridge/components/StepCCRules.tsx`
- Modify: `Bridge/app/page.tsx` (add step 3 between names and import)
- Modify: `Bridge/lib/types.ts` (add ResolvedCCAssignment type)

**Step 1: Add types**

Add to `Bridge/lib/types.ts`:

```typescript
export interface ResolvedCCAssignment {
  marker: RaidMarker;
  playerName: string;
  ccType: CCType;
  fallbacks: { playerName: string; ccType: CCType }[];
}
```

**Step 2: Create CC resolver module**

Create `Bridge/lib/ccResolver.ts` — extract and refine the resolution logic from `importGenerator.ts`:

```typescript
import { CCType, WowClass, RaidMarker, RosterEntry, ResolvedCCAssignment } from './types';

// Which CC types each class can perform
export const CLASS_CC_ABILITIES: Record<WowClass, CCType[]> = {
  MAGE: ['polymorph'],
  WARLOCK: ['banish', 'fear', 'seduce'],
  PRIEST: ['shackle', 'mindcontrol'],
  DRUID: ['hibernate', 'cyclone'],
  ROGUE: ['sap'],
  HUNTER: ['freezingtrap', 'wyvern'],
  PALADIN: ['turnundead', 'repentance'],
  WARRIOR: [],
  SHAMAN: [],
};

// Human-readable CC names
export const CC_LABELS: Record<CCType, string> = {
  polymorph: 'Polymorph',
  banish: 'Banish',
  fear: 'Fear',
  seduce: 'Seduce',
  shackle: 'Shackle',
  mindcontrol: 'Mind Control',
  hibernate: 'Hibernate',
  cyclone: 'Cyclone',
  sap: 'Sap',
  freezingtrap: 'Freezing Trap',
  wyvern: 'Wyvern Sting',
  turnundead: 'Turn Undead',
  repentance: 'Repentance',
};

export const MARKER_NAMES: Record<RaidMarker, string> = { ... };
export const MARKER_ICONS: Record<RaidMarker, string> = { ... }; // emoji or image paths

// Get all players who can perform a given CC type
export function getPlayersForCC(roster: RosterEntry[], ccType: CCType): string[] { ... }

// Auto-resolve default assignments from roster
export function autoResolveCC(roster: RosterEntry[]): ResolvedCCAssignment[] { ... }
```

**Step 3: Build the StepCCRules component**

Create `Bridge/components/StepCCRules.tsx`:

- Displays 8 marker rows (Star–Skull), each with marker icon + name
- Each row has: primary CC assignment (player dropdown + CC type dropdown)
- "Add fallback" button per row for secondary assignments
- Player dropdowns filtered by CC capability (only show Mages for polymorph, etc.)
- "Auto-assign" button runs `autoResolveCC()` to reset to defaults
- State: `ResolvedCCAssignment[]` lifted to page.tsx

UI structure per row:
```
[Marker Icon] [Marker Name] | [Player ▼] [CC Type ▼] | [+ Fallback] [✕ Clear]
                             | [Fallback Player ▼] [Fallback CC ▼] | [✕]
```

Props:
```typescript
interface StepCCRulesProps {
  roster: RosterEntry[];
  assignments: ResolvedCCAssignment[];
  onChange: (assignments: ResolvedCCAssignment[]) => void;
}
```

**Step 4: Wire into page.tsx**

Add CC state to page.tsx. When roster changes (step 2), auto-resolve CC as defaults. Render StepCCRules as step 3. Pass assignments down to StepGenerateImport.

**Step 5: Commit**

```
feat(bridge): add CC rule builder UI
```

---

### Task 4: Group Template Builder UI

**Files:**
- Create: `Bridge/lib/groupSolver.ts`
- Create: `Bridge/components/StepGroupBuilder.tsx`
- Modify: `Bridge/lib/types.ts` (add GroupAssignment type)
- Modify: `Bridge/app/page.tsx` (add step 4)

**Step 1: Add types**

Add to `Bridge/lib/types.ts`:

```typescript
export interface GroupAssignment {
  groupNumber: number; // 1-5
  label: string; // "Melee", "Casters", etc.
  players: string[]; // max 5 per group
}
```

**Step 2: Create group solver module**

Create `Bridge/lib/groupSolver.ts`:

```typescript
import { RosterEntry, GroupAssignment, GroupTemplate } from './types';

// Auto-assign players to groups based on templates
export function autoAssignGroups(
  roster: RosterEntry[],
  templates: GroupTemplate[]
): GroupAssignment[] { ... }

// Get available buffs from roster (for the buff selector UI)
export function getAvailableBuffs(roster: RosterEntry[]): string[] { ... }
```

Port the logic from `importGenerator.ts` DEFAULT_GROUP_TEMPLATES and the addon's GroupManager:CalculateGroups into TypeScript. Cap at 5 groups.

**Step 3: Build the StepGroupBuilder component**

Create `Bridge/components/StepGroupBuilder.tsx`:

- Preset selector at top: "TBC 10-man", "TBC 25-man", "Custom"
- 5 group cards in a row/grid, each showing:
  - Editable label (defaults from template: "Melee", "Casters", "Healers", etc.)
  - Up to 5 player slots with class-colored names
  - Drop zone for drag-and-drop
- Unassigned players pool on the side/bottom
- Drag players between groups and to/from the pool
- Each group card has a buff priority indicator showing which key buffs are covered

Use HTML drag-and-drop API (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) — no extra dependencies.

Props:
```typescript
interface StepGroupBuilderProps {
  roster: RosterEntry[];
  groups: GroupAssignment[];
  onChange: (groups: GroupAssignment[]) => void;
}
```

**Step 4: Wire into page.tsx**

Add group state. When roster changes, auto-assign groups using default templates. Render as step 4. Pass to StepGenerateImport.

**Step 5: Update import generator**

Modify `Bridge/lib/importGenerator.ts`:
- `buildImportPayload()` now accepts `ccAssignments: ResolvedCCAssignment[]` and `groupAssignments: GroupAssignment[]` directly (not just templates)
- Add `groupAssignments` and `characterMappings` to the payload

**Step 6: Commit**

```
feat(bridge): add group template builder UI with drag-and-drop
```

---

### Task 5: Update Import Payload and Addon Storage

**Files:**
- Modify: `Bridge/lib/importGenerator.ts`
- Modify: `Bridge/lib/types.ts`
- Modify: `Addon/Import.lua`
- Modify: `Addon/Core.lua`

**Step 1: Extend ImportPayload type**

Add to `Bridge/lib/types.ts` ImportPayload:

```typescript
export interface ImportPayload {
  // ... existing fields ...
  groupAssignments?: GroupAssignment[];
  characterMappings?: Record<string, string>; // discordId -> wowName
}
```

**Step 2: Update buildImportPayload**

Modify `importGenerator.ts` to accept the new concrete assignments from the UI and embed them in the payload alongside the abstract templates.

**Step 3: Update Addon Import.lua**

After parsing the import, store templates and mappings in saved vars:

```lua
-- In addon:ImportEvent(), after storing currentEvent:
if data.ccTemplate then
    addon.db.ccTemplates[data.eventId] = data.ccTemplate
end
if data.groupTemplates then
    addon.db.groupTemplates[data.eventId] = data.groupTemplates
end
if data.characterMappings then
    for discordId, wowName in pairs(data.characterMappings) do
        addon.db.characterMappings[discordId] = wowName
    end
end
```

**Step 4: Update Addon GroupManager to use concrete assignments**

Modify `GroupManager.lua` so `/rhb sort` prefers concrete `groupAssignments` from the import (direct player-to-group mapping) over recalculating from templates.

**Step 5: Commit**

```
feat(bridge/addon): extend import payload with groups and mappings
```

---

### Task 6: LDB Minimap Button

**Files:**
- Create: `Addon/Libs/LibDataBroker-1.1.lua` (download from CurseForge/GitHub)
- Create: `Addon/Libs/LibDBIcon-1.0/` (download — includes LibDBIcon-1.0.lua + lib.xml)
- Modify: `Addon/RaidHelperBridge.toc` (add libs)
- Rewrite: `Addon/UI/MainFrame.lua`
- Modify: `Addon/Core.lua` (add default for minimap icon position)

**Step 1: Download libraries**

Fetch LibDataBroker-1.1 and LibDBIcon-1.0 from their repos. These are standard, MIT-licensed WoW addon libraries.

**Step 2: Add to TOC**

```
# Libraries
Libs\LibStub\LibStub.lua
Libs\CallbackHandler-1.0\CallbackHandler-1.0.lua
Libs\LibDataBroker-1.1\LibDataBroker-1.1.lua
Libs\LibDBIcon-1.0\LibDBIcon-1.0.lua
Libs\LibDeflate\LibDeflate.lua
Libs\json.lua
```

Note: LibDBIcon depends on CallbackHandler-1.0, which we also need to bundle.

**Step 3: Add saved var defaults**

In `Core.lua` defaults, add:

```lua
global = {
    -- ... existing ...
    minimap = { hide = false },  -- LibDBIcon config
},
```

**Step 4: Rewrite MainFrame.lua**

```lua
local addonName, addon = ...

local LDB = LibStub("LibDataBroker-1.1")
local LDBIcon = LibStub("LibDBIcon-1.0")

local dataObj = LDB:NewDataObject("RaidHelperBridge", {
    type = "launcher",
    text = "RHB",
    icon = "Interface\\Icons\\INV_Misc_GroupLooking",
    OnClick = function(self, button)
        if button == "LeftButton" then
            if IsShiftKeyDown() then
                addon:ToggleLeaderCCFrame()
            else
                addon:ShowStatus()
            end
        elseif button == "RightButton" then
            addon:ShowImportDialog()
        end
    end,
    OnTooltipShow = function(tooltip)
        tooltip:AddLine("Raid Helper Bridge")
        local event = addon:GetCurrentEvent()
        if event then
            tooltip:AddLine(event.eventName, 1, 1, 1)
            tooltip:AddLine(#event.players .. " players", 0.7, 0.7, 0.7)
        else
            tooltip:AddLine("No event loaded", 0.7, 0.7, 0.7)
        end
        tooltip:AddLine(" ")
        tooltip:AddLine("Left-click: Status", 0, 1, 0)
        tooltip:AddLine("Shift-click: CC Assignments", 0, 1, 0)
        tooltip:AddLine("Right-click: Import", 0, 1, 0)
    end,
})

-- Register after PLAYER_LOGIN (saved vars must be ready)
addon.frame:HookScript("OnEvent", function(self, event, arg1)
    if event == "PLAYER_LOGIN" then
        LDBIcon:Register("RaidHelperBridge", dataObj, addon.db.minimap)
    end
end)
```

**Step 5: Commit**

```
feat(addon): replace minimap button with LibDataBroker/LibDBIcon
```

---

### Task 7: Bridge Tests (Vitest)

**Files:**
- Modify: `Bridge/package.json` (add vitest)
- Create: `Bridge/vitest.config.ts`
- Create: `Bridge/lib/__tests__/importGenerator.test.ts`
- Create: `Bridge/lib/__tests__/ccResolver.test.ts`
- Create: `Bridge/lib/__tests__/groupSolver.test.ts`
- Create: `Bridge/lib/__tests__/characterMappings.test.ts`

**Step 1: Set up Vitest**

Add to package.json:
```json
"devDependencies": {
  "vitest": "^3.0.0",
  "@vitejs/plugin-react": "^4.0.0"
},
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Create `Bridge/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

**Step 2: Import generator tests**

```typescript
// Bridge/lib/__tests__/importGenerator.test.ts
import { describe, it, expect } from 'vitest';
import { generateImportString, parseImportString, buildImportPayload } from '../importGenerator';

describe('importGenerator', () => {
  it('round-trips encode/decode', () => {
    const payload = { version: 1, eventId: 'test', eventName: 'Test', eventTime: 123, players: [] };
    const str = generateImportString(payload as any);
    expect(str).toMatch(/^!RHB!/);
    const decoded = parseImportString(str);
    expect(decoded).toEqual(payload);
  });

  it('builds payload with players', () => {
    const event = {
      eventId: '1', serverId: '', channelId: '', messageId: '',
      title: 'Test', startTime: new Date(1000000000000),
      signups: [{ discordId: '1', discordName: 'Player', class: 'MAGE' as const,
                  role: 'rdps' as const, signupTime: new Date(), status: 'confirmed' as const }],
      createdBy: '',
    };
    const payload = buildImportPayload(event);
    expect(payload.players).toHaveLength(1);
    expect(payload.players[0].name).toBe('Player');
  });
});
```

**Step 3: CC resolver tests**

```typescript
// Bridge/lib/__tests__/ccResolver.test.ts
import { describe, it, expect } from 'vitest';
import { autoResolveCC, getPlayersForCC } from '../ccResolver';

describe('ccResolver', () => {
  const roster = [
    { discordId: '1', discordName: 'Frost', class: 'MAGE' as const, role: 'rdps' as const, wowCharacter: 'Frostbolt' },
    { discordId: '2', discordName: 'Lock', class: 'WARLOCK' as const, role: 'rdps' as const, wowCharacter: 'Dotmaster' },
  ];

  it('finds polymorph-capable players', () => {
    const players = getPlayersForCC(roster, 'polymorph');
    expect(players).toEqual(['Frostbolt']);
  });

  it('auto-resolves assignments', () => {
    const assignments = autoResolveCC(roster);
    expect(assignments.length).toBeGreaterThan(0);
    expect(assignments[0].playerName).toBe('Frostbolt');
  });
});
```

**Step 4: Group solver tests**

```typescript
// Bridge/lib/__tests__/groupSolver.test.ts
import { describe, it, expect } from 'vitest';
import { autoAssignGroups } from '../groupSolver';

describe('groupSolver', () => {
  it('assigns players to max 5 groups', () => {
    const roster = Array.from({ length: 25 }, (_, i) => ({
      discordId: String(i), discordName: `P${i}`,
      class: 'WARRIOR' as const, role: 'mdps' as const,
      wowCharacter: `Player${i}`,
    }));
    const groups = autoAssignGroups(roster, []);
    expect(groups.length).toBeLessThanOrEqual(5);
    const totalPlayers = groups.reduce((sum, g) => sum + g.players.length, 0);
    expect(totalPlayers).toBe(25);
  });

  it('puts no more than 5 players per group', () => {
    const roster = Array.from({ length: 10 }, (_, i) => ({
      discordId: String(i), discordName: `P${i}`,
      class: 'MAGE' as const, role: 'rdps' as const,
      wowCharacter: `Mage${i}`,
    }));
    const groups = autoAssignGroups(roster, []);
    for (const g of groups) {
      expect(g.players.length).toBeLessThanOrEqual(5);
    }
  });
});
```

**Step 5: Character mappings tests**

```typescript
// Bridge/lib/__tests__/characterMappings.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadMappings, saveMapping } from '../characterMappings';

describe('characterMappings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty object when no mappings exist', () => {
    expect(loadMappings()).toEqual({});
  });

  it('saves and loads a mapping', () => {
    saveMapping('discord123', 'Frostbolt');
    const mappings = loadMappings();
    expect(mappings['discord123']).toBe('Frostbolt');
  });

  it('removes mapping when name is empty', () => {
    saveMapping('discord123', 'Frostbolt');
    saveMapping('discord123', '');
    expect(loadMappings()['discord123']).toBeUndefined();
  });
});
```

**Step 6: Run tests, verify pass**

```bash
cd Bridge && npm test
```

**Step 7: Commit**

```
test(bridge): add Vitest tests for core modules
```

---

### Task 8: Expanded Addon Mock Scenarios

**Files:**
- Modify: `Addon/Core.lua` (expand LoadMockEvent, add variant mocks)

**Step 1: Add mock variants**

Expand the slash command to support `/rhb mock <scenario>`:

```lua
elseif cmd == "mock" then
    local scenario = args[2] or "kara"
    addon:LoadMockEvent(scenario)
```

Add scenarios:
- `kara` — existing 10-man Karazhan (default)
- `ssc` — 25-man SSC with full groups, all CC types used
- `empty` — event with 0 players (edge case)
- `nocc` — 10 players, no CC assignments

**Step 2: Commit**

```
test(addon): add mock event scenarios for testing
```

---

### Task 9: Final Cleanup and README

**Files:**
- Modify: `README.md`
- Modify: `Bridge/lib/importGenerator.ts` (remove dead code superseded by ccResolver/groupSolver)

**Step 1: Update README**

- Update TODO list (mark completed items)
- Update project structure (new files)
- Update workflow section with 5-step Bridge flow
- Add deployment section mentioning Vercel

**Step 2: Clean up importGenerator.ts**

Remove `CLASS_CC_ABILITIES` and `resolveCCAssignments` from importGenerator.ts (now in ccResolver.ts). Keep only `buildImportPayload`, `generateImportString`, `parseImportString`, `generateImportSummary`.

**Step 3: Commit**

```
chore(project): final cleanup and README update
```

---

## Task Dependencies

```
Task 1 (localStorage) ──┐
                         ├── Task 3 (CC builder) ──┐
Task 2 (refactor) ──────┤                          ├── Task 5 (payload update) ── Task 9 (cleanup)
                         ├── Task 4 (group builder)─┘
                         │
Task 6 (LDB minimap) ───┘  (independent)
Task 7 (tests) ─────────── (after tasks 1,3,4)
Task 8 (mock scenarios) ── (independent)
```

Tasks 1, 2, 6, and 8 can run in parallel. Tasks 3 and 4 depend on 2. Task 5 depends on 3+4. Task 7 depends on 1+3+4. Task 9 is last.

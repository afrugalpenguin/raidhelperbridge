# Raid Helper Bridge - Implementation Guide

## Overview

A system that bridges Discord Raid-Helper signups with in-game WoW TBC Anniversary raid management. Since WoW addons can't make HTTP requests (Blizzard's sandbox), we use a web bridge that generates import strings.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Raid-Helper    │ ──► │  Bridge Web App  │ ──► │  WoW Addon      │
│  (Discord Bot)  │     │  (Vercel/Railway)│     │  (In-Game)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │                        │
        │                       ▼                        │
        │                 Import String                  │
        │                 (copy/paste)                   │
        │                       │                        │
        ▼                       ▼                        ▼
   Event signups         CC rules applied          Auto-whispers
   Class/role info       Group templates           Group sorting
   Player names          Compressed JSON           Raid invites
```

## Project Structure

```
RaidHelperBridge/
│
├── README.md                           # User-facing documentation
├── IMPLEMENTATION.md                   # This file
│
├── Addon/                              # WoW Addon (Lua) - TBC 2.5.4
│   │
│   ├── RaidHelperBridge.toc            # Addon manifest (Interface: 20504)
│   │
│   ├── Core.lua                        # ✅ Main addon frame, slash commands, utilities
│   ├── Import.lua                      # ✅ Import string parsing, base64/JSON decode
│   ├── CCManager.lua                   # ✅ CC assignments, auto-whisper on marker
│   ├── GroupManager.lua                # ✅ Buff-based group optimisation
│   ├── InviteManager.lua               # ✅ Automated raid invites with throttling
│   │
│   ├── Data/
│   │   ├── CCAbilities.lua             # ✅ TBC CC types (poly, banish, shackle, etc.)
│   │   ├── BuffProviders.lua           # ✅ Group buffs (Windfury, LotP, ToW, etc.)
│   │   └── MarkerInfo.lua              # ✅ Raid marker names/icons
│   │
│   ├── UI/
│   │   ├── MainFrame.lua               # ⚠️  Placeholder - minimap button only
│   │   ├── ImportDialog.lua            # ⚠️  Placeholder - basic dialog in Import.lua
│   │   ├── CCEditor.lua                # ❌ TODO - in-game CC template editor
│   │   └── GroupEditor.lua             # ❌ TODO - in-game group template editor
│   │
│   └── Libs/                           # ❌ EMPTY - need to download
│       ├── LibStub/
│       ├── CallbackHandler-1.0/
│       ├── AceAddon-3.0/
│       ├── AceEvent-3.0/
│       ├── AceConsole-3.0/
│       ├── AceTimer-3.0/
│       ├── AceComm-3.0/
│       ├── AceSerializer-3.0/
│       └── LibDeflate/
│
└── Bridge/                             # Web App (Next.js/TypeScript)
    │
    ├── package.json                    # ✅ Dependencies defined
    ├── next.config.js                  # ✅ Standalone output for Vercel
    ├── tsconfig.json                   # ✅ TypeScript config
    ├── tailwind.config.js              # ✅ Tailwind CSS
    ├── postcss.config.js               # ✅ PostCSS
    │
    ├── app/
    │   ├── layout.tsx                  # ✅ Root layout
    │   ├── globals.css                 # ✅ Tailwind imports
    │   └── page.tsx                    # ⚠️  Demo UI with mock data
    │
    └── lib/
        ├── types.ts                    # ✅ TypeScript type definitions
        ├── embedParser.ts              # ✅ Parse Raid-Helper Discord embeds
        └── importGenerator.ts          # ✅ Generate compressed import strings
```

**Legend:** ✅ Complete | ⚠️ Partial/Demo | ❌ Not implemented

---

## Core Features

### 1. CC Assignment System

**Goal:** Define CC rules once, addon auto-whispers players when mobs are marked.

**Flow:**
```
Template Rule                    Event Signups                  Resolved
─────────────────────────────────────────────────────────────────────────
Square → 1st Mage (poly)    +   Frostbolt (Mage)          =   Square → Frostbolt
         2nd Warlock (banish)    Icyveins (Mage)               (poly, then banish
                                 Dotmaster (Warlock)            if Demon)
```

**Mob Type Detection:**
- Addon checks `UnitCreatureType(unit)` when marker applied
- Matches against valid CC types (Humanoid → poly works, Demon → banish)
- Whispers appropriate player: `/w Frostbolt CC Square - Moroes Guest`

**Key Files:**
- `Addon/CCManager.lua` - Event handling, whisper logic
- `Addon/Data/CCAbilities.lua` - CC definitions by class
- `Bridge/lib/importGenerator.ts` - `resolveCCAssignments()` function

### 2. Group Optimisation

**Goal:** Sort raid groups for optimal buff coverage.

**TBC Buff Groups:**
```
Group 1 (Melee):    Windfury Totem + Battle Shout + Leader of the Pack
Group 2 (Casters):  Totem of Wrath + Moonkin Aura + Shadow Priest (VT)
Group 3 (Healers):  Mana Tide + Tree of Life + Mana Spring
Group 4 (Hunters):  Ferocious Inspiration + LotP + Windfury
```

**Key Files:**
- `Addon/GroupManager.lua` - `CalculateGroups()`, `ApplyGroupLayout()`
- `Addon/Data/BuffProviders.lua` - All TBC raid buffs with class/spec requirements

### 3. Automated Invites

**Goal:** One command to invite all event signups.

**Flow:**
```
/rhb invite → Get event players → Filter already in raid → Queue invites → Send with 0.5s delay
```

**Key Files:**
- `Addon/InviteManager.lua` - Invite queue, throttling, status tracking

---

## Data Flow

### Import String Format

```
!RHB!<base64-encoded-deflate-compressed-json>
```

**Payload Structure:**
```typescript
interface ImportPayload {
  version: number;              // Schema version (currently 1)
  eventId: string;              // Raid-Helper event ID
  eventName: string;            // "Karazhan Thursday"
  eventTime: number;            // Unix timestamp
  players: {
    name: string;               // WoW character name
    class: WowClass;            // "MAGE", "WARRIOR", etc.
    role: RaidRole;             // "tank", "healer", "mdps", "rdps"
    spec?: string;              // "frost", "holy", etc.
  }[];
  ccTemplate?: CCTemplate;      // Optional template definition
  ccAssignments?: {             // Pre-resolved assignments
    marker: 1-8;
    assignments: {
      ccType: string;
      playerName: string;
    }[];
  }[];
  groupTemplates?: GroupTemplate[];
}
```

### Addon Saved Variables

```lua
-- Global (shared across characters)
RaidHelperBridgeDB = {
    ccTemplates = {},           -- Saved CC templates
    groupTemplates = {},        -- Saved group templates  
    characterMappings = {},     -- Discord name → WoW character
}

-- Per-character
RaidHelperBridgeCharDB = {
    currentEvent = nil,         -- Currently loaded event data
    autoWhisper = true,         -- Send CC whispers automatically
    whisperCooldown = 30,       -- Seconds between whispers per player/marker
    debugMode = false,
}
```

---

## Raid-Helper Integration

### Option A: Official API (Preferred)

Raid-Helper has API docs at `https://raid-helper.dev/documentation/api`.

**Likely endpoints:**
```
GET /api/v2/events/{eventId}
GET /api/v2/servers/{serverId}/events
```

**Authentication:** Probably requires API key from Raid-Helper premium.

**Action needed:** Check their Discord or docs for API access.

### Option B: Discord Bot Embed Parsing (Fallback)

Run a Discord bot that reads Raid-Helper embed messages directly.

**Required permissions:**
- Read Messages
- Read Message History

**How it works:**
1. Bot watches for Raid-Helper bot messages (bot ID: `579155972115660803`)
2. Parses embed fields to extract signups
3. Maps role emoji → class/role

**Reference:** `https://github.com/henryprescott/raid-helper-sheets`

**Key File:** `Bridge/lib/embedParser.ts`

---

## Slash Commands

```
/rhb                    Show help
/rhb import             Open import dialog
/rhb status             Show current event info
/rhb cc                 Show CC assignments
/rhb groups             Preview group layout
/rhb invite             Send raid invites
/rhb sort               Apply group optimisation
/rhb debug              Toggle debug mode
/rhb clear              Clear current event
```

---

## TODO List

### High Priority

1. **Download Ace3 libraries** to `Addon/Libs/`
   - LibStub, CallbackHandler, AceAddon, AceEvent, AceConsole, AceTimer
   - LibDeflate for import string decompression

2. **Test addon loads** in TBC client
   - Copy to `Interface/AddOns/RaidHelperBridge`
   - Check `/rhb` works

3. **Implement Discord data fetch** in Bridge
   - Either Raid-Helper API integration
   - Or Discord bot with embed parsing

### Medium Priority

4. **Bridge UI improvements**
   - Discord OAuth login
   - Server/event selector
   - Interactive CC rule builder
   - Real-time preview

5. **Addon UI improvements**
   - Proper CC editor frame
   - Group template editor
   - Drag-drop support

6. **Character name mapping**
   - Handle Discord name ≠ WoW character name
   - Persist mappings per server

### Low Priority

7. **Additional features**
   - Loot council integration
   - Attendance tracking
   - Export raid logs
   - WeakAura integration for CC timers

---

## Development Setup

### Addon Development

```bash
# Symlink to WoW AddOns folder (Windows)
mklink /D "C:\Games\World of Warcraft\_classic_\Interface\AddOns\RaidHelperBridge" "C:\Users\russell\Documents\git\RaidHelperBridge\Addon"

# Or just copy the folder
xcopy /E /I Addon "path\to\Interface\AddOns\RaidHelperBridge"
```

**Testing:**
- Use `/reload` to reload addon
- `/rhb debug` enables verbose logging
- Test import with mock string from Bridge

### Bridge Development

```bash
cd Bridge
npm install
npm run dev
# Opens http://localhost:3000
```

**Deploy to Vercel:**
```bash
npm i -g vercel
vercel
```

---

## Key Code References

### Import String Parsing (Lua)

```lua
-- Addon/Import.lua
function addon:ParseImportString(importStr)
    -- 1. Validate !RHB! prefix
    -- 2. Base64 decode
    -- 3. LibDeflate decompress
    -- 4. JSON parse
    -- 5. Store in charDb.currentEvent
end
```

### CC Whisper Logic (Lua)

```lua
-- Addon/CCManager.lua
function CCManager:CheckUnit(unit)
    local marker = GetRaidTargetIndex(unit)
    local mobType = UnitCreatureType(unit)
    local assignment = self:GetAssignment(marker)
    local cc = self:GetCCForMobType(assignment, mobType)
    if cc then
        self:SendWhisper(cc.playerName, marker, mobName, cc.ccType)
    end
end
```

### Import Generation (TypeScript)

```typescript
// Bridge/lib/importGenerator.ts
export function generateImportString(payload: ImportPayload): string {
    const json = JSON.stringify(payload);
    const compressed = pako.deflate(json);
    const base64 = Buffer.from(compressed).toString('base64');
    return `!RHB!${base64}`;
}
```

---

## Testing Checklist

- [ ] Addon loads without errors
- [ ] `/rhb` shows help
- [ ] `/rhb import` opens dialog
- [ ] Paste mock import string works
- [ ] `/rhb status` shows event data
- [ ] `/rhb invite` sends invites (need raid)
- [ ] `/rhb sort` moves players (need raid assist)
- [ ] Marking mob whispers assigned player
- [ ] Whisper cooldown works
- [ ] Bridge generates valid import string
- [ ] Import string round-trips correctly

---

## Notes for Claude Code

When continuing this project:

1. **Start by downloading libraries** - The addon won't load without Ace3/LibDeflate
2. **Test incrementally** - Get basic `/rhb` working before testing complex features
3. **The JSON parser in Import.lua is simplified** - May need a proper JSON library for edge cases
4. **Check TBC API compatibility** - Some functions differ from retail
5. **Raid-Helper API needs investigation** - Their docs require JS, couldn't scrape details

Good luck! 🎮

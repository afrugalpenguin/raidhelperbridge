# Raidr.gg

It's a match. Now summon.

## Overview

A system that bridges Discord Raid-Helper signups with in-game WoW TBC raid management.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Raid-Helper    │ ──► │  Bridge Web App  │ ──► │  WoW Addon      │
│  (Discord Bot)  │     │  (Next.js)       │     │  (In-Game)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ▼
                         Import String
                         (copy/paste)
```

WoW addons can't make HTTP requests directly (Blizzard's sandbox), so we use a web bridge that:
1. Pulls signup data from Discord (via Raid-Helper API or embed parsing)
2. Generates a compressed import string
3. Raid leader pastes the string into the addon

## Features

### Raid-Helper Integration
- Import event signups with class/role/spec info
- Map Discord usernames to WoW character names

### Automatic CC Callouts
- Define CC rules per raid: "Square = 1st Mage poly, Moon = 2nd Mage poly, Triangle = Warlock banish"
- When you mark a mob, the addon whispers the assigned player
- Auto-detects mob type (Humanoid, Demon, Beast, etc.) and validates CC compatibility

### Smart Group Sorting
- Define group templates based on buff coverage
- Example: Melee group gets Windfury + Battle Shout + Leader of the Pack
- One-click `/rhb sort` to optimise raid groups

### Automated Invites
- Import event, then `/rhb invite` to send raid invites to all signups
- Handles throttling (0.5s between invites) to avoid rate-limiting

## Project Structure

```
RaidHelperBridge/
├── Addon/                    # WoW Addon (Lua)
│   ├── RaidHelperBridge.toc
│   ├── Core.lua              # Main addon, slash commands, event dispatcher
│   ├── Import.lua            # Import string parsing + dialog UI
│   ├── CCManager.lua         # CC assignments, auto-whispers
│   ├── GroupManager.lua      # Buff-based group sorting
│   ├── InviteManager.lua     # Automated raid invites
│   ├── Data/
│   │   ├── CCAbilities.lua   # 14 TBC CC types with mob-type restrictions
│   │   ├── BuffProviders.lua # ~30 TBC raid buffs with class/spec info
│   │   └── MarkerInfo.lua    # Raid markers 1-8
│   ├── UI/
│   │   ├── MainFrame.lua     # Minimap button
│   │   └── CCFrame.lua       # CC assignment display frames
│   └── Libs/
│       ├── LibStub/          # Library registration (included)
│       └── LibDeflate/       # Decompression (included)
│
└── Bridge/                   # Web App (Next.js/TypeScript)
    ├── package.json
    ├── app/                  # Next.js pages
    ├── lib/
    │   ├── types.ts          # Shared type definitions
    │   ├── embedParser.ts    # Raid-Helper Discord embed parser
    │   ├── importGenerator.ts # Import string compression/generation
    │   └── mockData.ts       # Mock Karazhan raid for testing
    └── scripts/
        └── generate-mock.ts  # CLI: generate a test import string
```

## Installation

### WoW Addon

1. Copy the `Addon` folder to your WoW addons directory:
   ```
   World of Warcraft/_classic_/Interface/AddOns/RaidHelperBridge
   ```

2. Libraries (LibStub and LibDeflate) are included in `Addon/Libs/` — no extra downloads needed.

3. Restart WoW or `/reload`

### Bridge Web App

```bash
cd Bridge
npm install
npm run dev
```

### Generate a Test Import String

```bash
cd Bridge
npx tsx scripts/generate-mock.ts
```

This outputs an `!RHB!...` string you can paste into the addon's import dialog, or use `/rhb mock` in-game to load test data without the Bridge.

## Usage

### Slash Commands

```
/rhb              Show help
/rhb import       Open import dialog (paste string from web app)
/rhb status       Show current event info
/rhb cc           Show CC assignments
/rhb callout #    Announce CC for marker # in raid chat
/rhb whisper      Toggle auto-whisper on/off
/rhb groups       Preview group layout
/rhb buffs        Show available raid buffs
/rhb sort         Apply optimal group sorting
/rhb invite       Send raid invites to event signups
/rhb cancel       Cancel pending invites
/rhb who          Check which event players are in the raid
/rhb mycc         Show your CC assignments (draggable frame)
/rhb ccframe      Show all CC assignments (leader view)
/rhb mock         Load mock event for testing (no Bridge needed)
/rhb debug        Toggle debug messages
/rhb clear        Clear current event data
```

### Workflow

1. **Create event** in Raid-Helper on Discord
2. **Wait for signups**
3. **Open Bridge web app**, select your server and event
4. **Configure CC rules** (e.g., Square = poly, Triangle = shackle)
5. **Generate import string** and copy it
6. **In WoW**: `/rhb import` and paste the string
7. **Send invites**: `/rhb invite`
8. **Sort groups**: `/rhb sort`
9. **During raid**: Mark mobs with raid markers — assigned players get whispered automatically

## How CC Assignment Works

The Bridge resolves generic rules like "1st Mage" into actual player names from the signup list:

```lua
-- Template rule: Square marker
{ marker = 6, priority = {
    { ccType = "polymorph", classOrder = 1 },  -- "1st Mage"
    { ccType = "banish", classOrder = 1 },     -- "1st Warlock"
}}

-- With signups: Frostbolt (Mage), Icyveins (Mage), Dotmaster (Warlock)
-- Resolves to: Square -> Frostbolt (polymorph), fallback Dotmaster (banish)
```

When you mark a mob as Square in-game:
1. Addon detects the raid marker
2. Checks mob type (Humanoid, Demon, Undead, etc.)
3. Finds a valid CC (Humanoid -> poly works, Demon -> poly doesn't, try banish)
4. Whispers the assigned player: "CC {Square} - Moroes Guest"

## Import String Format

```
!RHB!<base64-deflate-json>
```

Decompressed JSON payload:
```json
{
  "version": 1,
  "eventId": "abc123",
  "eventName": "Karazhan Thursday",
  "eventTime": 1706644800,
  "players": [
    { "name": "Tankman", "class": "WARRIOR", "role": "tank" },
    { "name": "Healbot", "class": "PRIEST", "role": "healer" }
  ],
  "ccAssignments": [
    {
      "marker": 6,
      "assignments": [
        { "ccType": "polymorph", "playerName": "Frostbolt" }
      ]
    }
  ],
  "groupTemplates": []
}
```

## Development

### Tech Stack
- **Addon**: Lua 5.1 (WoW TBC 2.5.4, Interface 20504), raw WoW API (no Ace3), LibDeflate for decompression
- **Bridge**: Next.js 14, TypeScript, pako for compression

### Testing Without the Bridge

Use `/rhb mock` in-game to load a 10-player Karazhan raid with CC assignments. This lets you test all addon features without needing the web app running.

### Raid-Helper Data Access

**Option 1: Raid-Helper API (preferred)** — API docs at `raid-helper.dev/documentation/api`. May require premium.

**Option 2: Discord embed parsing (fallback)** — A Discord bot reads Raid-Helper embed messages and extracts signup data. Needs Read Messages + Read Message History permissions.

## TODO

- [x] Raid-Helper API integration
- [x] Bridge web app UI (event selector, name mapping, import string generator)
- [x] CC assignment display frames (player + leader views)
- [ ] Full in-game CC template editor UI
- [ ] Full in-game group template editor UI
- [ ] Minimap button with proper LDB positioning
- [ ] Character name mapping persistence (Discord name -> WoW name)
- [ ] Bridge CC rule builder UI
- [ ] End-to-end in-game testing

## License

MIT

# Raid Helper Bridge

A system that bridges Discord Raid-Helper signups with in-game WoW TBC raid management.

## Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Raid-Helper    │ ──► │  Bridge Web App  │ ──► │  WoW Addon      │
│  (Discord Bot)  │     │  (Vercel/Railway)│     │  (In-Game)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ▼
                         Import String
                         (copy/paste)
```

WoW addons can't make HTTP requests directly (Blizzard's sandbox), so we use a web bridge that:
1. Pulls signup data from Discord (either via Raid-Helper API or by parsing embeds)
2. Generates a compressed import string
3. Raid leader pastes string into addon

## Features

### 1. Raid-Helper Integration
- Import event signups with class/role info
- Map Discord usernames to WoW character names

### 2. Automatic CC Callouts
- Define CC rules once per raid: "Triangle → 1st Mage poly, 2nd Warlock banish"
- When you mark a mob, addon whispers the assigned player
- Auto-detects mob type to pick appropriate CC

### 3. Smart Group Sorting
- Define group templates based on buff coverage
- Example: Melee group gets Windfury + Battle Shout + LotP
- One-click to sort raid groups optimally

### 4. Automated Invites
- Import event → click invite → all signups get raid invites
- Handles throttling automatically

## Project Structure

```
RaidHelperBridge/
├── Addon/                    # WoW Addon (Lua)
│   ├── RaidHelperBridge.toc
│   ├── Core.lua              # Main addon, slash commands
│   ├── Import.lua            # Import string parsing
│   ├── CCManager.lua         # CC assignments, auto-whispers
│   ├── GroupManager.lua      # Buff-based group sorting
│   ├── InviteManager.lua     # Automated raid invites
│   ├── Data/
│   │   ├── CCAbilities.lua   # TBC CC definitions
│   │   ├── BuffProviders.lua # Class/spec buff info
│   │   └── MarkerInfo.lua    # Raid marker data
│   ├── UI/
│   │   ├── MainFrame.lua
│   │   ├── ImportDialog.lua
│   │   ├── CCEditor.lua
│   │   └── GroupEditor.lua
│   └── Libs/                 # Required libraries (see below)
│
└── Bridge/                   # Web App (Node.js/Next.js)
    ├── package.json
    └── lib/
        ├── types.ts          # TypeScript definitions
        ├── embedParser.ts    # Parse Raid-Helper Discord embeds
        └── importGenerator.ts # Generate addon import strings
```

## Installation

### WoW Addon

1. Copy the `Addon` folder to your WoW addons directory:
   ```
   World of Warcraft/_classic_/Interface/AddOns/RaidHelperBridge
   ```

2. Download required libraries to `Addon/Libs/`:
   - [LibStub](https://www.curseforge.com/wow/addons/libstub)
   - [CallbackHandler-1.0](https://www.curseforge.com/wow/addons/callbackhandler)
   - [AceAddon-3.0](https://www.curseforge.com/wow/addons/ace3)
   - [AceEvent-3.0](https://www.curseforge.com/wow/addons/ace3)
   - [AceConsole-3.0](https://www.curseforge.com/wow/addons/ace3)
   - [AceTimer-3.0](https://www.curseforge.com/wow/addons/ace3)
   - [AceComm-3.0](https://www.curseforge.com/wow/addons/ace3)
   - [AceSerializer-3.0](https://www.curseforge.com/wow/addons/ace3)
   - [LibDeflate](https://www.curseforge.com/wow/addons/libdeflate)

   Or use the [BigWigs packager](https://github.com/BigWigsMods/packager) to auto-fetch.

3. Restart WoW or `/reload`

### Bridge Web App

```bash
cd Bridge
npm install
npm run dev
```

For production deployment on Vercel:
```bash
npm i -g vercel
vercel
```

## Usage

### Slash Commands

```
/rhb import     - Open import dialog (paste string from web app)
/rhb cc         - Show CC assignments
/rhb groups     - Preview group layout
/rhb invite     - Send raid invites to event signups
/rhb sort       - Apply optimal group sorting
/rhb status     - Show current event info
/rhb debug      - Toggle debug messages
/rhb clear      - Clear current event data
```

### Workflow

1. **Create event** in Raid-Helper on Discord
2. **Wait for signups** 
3. **Open Bridge web app**, select your server/event
4. **Configure CC rules** (e.g., Square = poly, Triangle = shackle)
5. **Generate import string**
6. **In WoW**: `/rhb import` and paste the string
7. **Send invites**: `/rhb invite`
8. **Sort groups**: `/rhb sort`
9. **During raid**: Mark mobs → assigned players get whispers

## CC Assignment Logic

The addon resolves "1st Mage" to actual player names based on who signed up:

```lua
-- Template rule
{ marker = 6, priority = {
    { ccType = "polymorph", classOrder = 1 },  -- "1st Mage"
    { ccType = "banish", classOrder = 1 },     -- "1st Warlock"
}}

-- If event has signups: Frostbolt (Mage), Icyveins (Mage), Dotmaster (Warlock)
-- Resolves to:
--   Square → Frostbolt (polymorph) → Dotmaster (banish)
```

When you mark a mob as Square:
1. Addon detects the marker
2. Checks mob type (Humanoid, Demon, etc.)
3. Finds valid CC (Humanoid → poly works, Demon → poly doesn't)
4. Whispers appropriate player: `/w Frostbolt CC Square - Moroes Guest`

## Raid-Helper Data Access

### Option 1: Raid-Helper API (Preferred)
Raid-Helper has an API at `raid-helper.dev/documentation/api`. Likely requires premium.

### Option 2: Discord Bot Parsing (Fallback)
Run a Discord bot that reads Raid-Helper embed messages:
- Bot needs: Read Messages, Read Message History
- Parses the embed fields to extract signups
- Similar approach used by [raid-helper-sheets](https://github.com/henryprescott/raid-helper-sheets)

## Import String Format

```
!RHB!<base64-deflate-json>
```

JSON payload:
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
  "groupTemplates": [...]
}
```

## Development Notes

### TBC Anniversary Considerations
- Interface version: 20504
- No C_AddOns (use IsAddOnLoaded)
- Classic API differences from retail

### Missing Features (TODO)
- [ ] Full in-game CC template editor
- [ ] Full in-game group template editor  
- [ ] LDB/minimap button with proper positioning
- [ ] Character name mapping persistence
- [ ] Web app frontend UI
- [ ] Raid-Helper API integration (needs API key investigation)

## License

MIT

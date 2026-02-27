# Changelog

**v1.0.4**

- Fixed group assignments — now fetches explicit group data from the Raid-Helper raidplan API instead of inferring from signup position

**v1.0.3**

- Detect Raid-Helper lineup positions and auto-assign groups based on raidplan layout
- Save/load group templates via localStorage for recurring raid setups
- Role count summary (Tank/Healer/Melee DPS/Ranged DPS) shown above raid groups
- CC row buttons pushed to far right for cleaner layout
- Vercel Analytics added

**v1.0.2**

- Rewrote group drag-and-drop — drop on a group to move, drop on a player to swap
- Both source and target players highlight during swap hover
- Groups allow overfill with red counter when >5 players
- Simplified groups to numbered buckets (removed role/class template logic)
- CC assignments laid out as single rows (marker, CC type, player inline)
- Narrowed CC player dropdown to fixed width
- Moon CC auto-assign now prefers sap over polymorph
- Fixed faded player persisting after group reset
- BigWigs packager GitHub Actions for CurseForge deployment
- Added .pkgmeta for addon packaging

**v1.0.1**

- Fixed tanks not being detected — Raid-Helper returns `className=Tank` instead of the actual WoW class; now infers class from spec name
- Added row numbers to the roster table
- Accept `/raidplan/` URLs in the event input (not just `/event/` and `/events/`)
- Updated placeholder text to show a raidplan URL example
- Added `[fallback]` labels to CC assignment summary
- Removed dead code from importGenerator (old CC resolver and default templates)
- Updated website subtitle text

**v1.0.0**

- Bridge web app with 5-step workflow: fetch event, map names, CC rules, group builder, generate import
- CC rule builder UI — assign markers to players with class-filtered CC abilities and fallback assignments
- Group template builder — drag-and-drop group assignment with TBC-10 and TBC-25 presets
- Character name persistence — Discord-to-WoW name mappings saved in browser localStorage
- Vitest test suite — 26 tests across importGenerator, ccResolver, groupSolver, characterMappings
- Deployed to Vercel

- Raid-Helper API integration — fetch event signups by URL or numeric ID
- Import string generator — compressed `!RHB!` format with pako deflateRaw / LibDeflate
- Rate-limited API route (30 req/min per IP)

- WoW addon with slash commands: import, status, cc, groups, buffs, sort, invite, mock
- CC assignment display frames (player and leader views)
- LibDataBroker minimap button with left-click status, shift-click CC frame, right-click import
- Buff-based group sorting with template or concrete assignment support
- Automated raid invites with throttling
- Mock event scenarios (kara, ssc, nocc, empty) for testing without Bridge

- rxi/json.lua for JSON parsing (replaced hand-rolled parser)
- LibStub, LibDeflate, LibDataBroker-1.1, LibDBIcon-1.0, CallbackHandler-1.0 bundled

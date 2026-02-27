# Changelog

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

# Changelog

**v1.0.9**

- Buff optimiser — green Optimise button runs a greedy swap algorithm to maximise total buff coverage across all groups (undoable with Ctrl+Z)
- Drag buff hints — green +N badge on group cards while dragging shows how many new buffs a player would bring to that group
- Collapsible missing buff warnings — amber bar shows which groups are missing buffs that exist elsewhere in the raid; only warns about buffs with available providers
- Shareable group layout URL — Share button encodes groups + buff overrides into a compressed URL hash; co-leads open it to auto-fetch the event and see the exact group setup
- Buff mutual exclusions — toggling Sanctity Aura on a paladin removes their Devotion Aura count; same for Windfury/Wrath of Air on shamans
- Undo/redo for group builder — Ctrl+Z / Ctrl+Y or header buttons; tracks all group and buff override changes
- Buff coverage summary row above group cards showing icon + count per buff across all groups
- Buff overrides persist with saved group templates
- Party buff icons under each group card — 14 buffs (Bloodlust, Windfury, Wrath of Air, Mana Spring, Trueshot, Battle Shout, Devotion Aura, Moonkin, Leader of the Pack, Unleashed Rage, Totem of Wrath, Vampiric Touch, Ferocious Inspiration, Sanctity Aura)
- Buff icons are clickable to manually toggle — overrides follow the player when dragged between groups
- Popover picker when multiple candidates exist (e.g., two paladins — pick which one has the buff)
- Sanctity Aura is manual-only since talent builds can't be inferred from spec data
- Screen-edge tab for quick-action buttons — small chevron at top-left expands on mouseover to show Status, Import, CC View, My CC, Groups, Invite, Sort
- Tab is draggable horizontally along top edge with position persistence
- Fixed CC frames crashing on TBC Anniversary client (SetMinResize → SetResizeBounds)

**v1.0.8**

- Fixed tentative/bench/late/absent players being placed into groups from raidplan data — they now correctly appear only in their status pools

**v1.0.7**

- Incomplete groups highlighted amber with warning icon next to player count

**v1.0.6**

- Tentative, bench, late, and absent signups now shown in separate pool boxes below raid groups — drag them into groups without refetching
- Players not in the raidplan appear in Unassigned pool instead of being auto-stuffed into groups
- Fixed dragged player staying dark after drop

**v1.0.5**

- Fixed class detection for specs shared between classes — Protection1 now correctly maps to Paladin (not Warrior), Holy1 to Paladin, Restoration to Druid, Restoration1 to Shaman

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

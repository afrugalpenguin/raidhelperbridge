# RaidHelperBridge Polish Pass — Design

## Scope

Take the working MVP to production quality. All configuration happens in the Bridge web app; the addon stays lean. Data structures support future v2 in-game editors.

## Architecture Split

**Bridge (web app):** Full configuration hub. 5-step flow:
1. Fetch event (exists)
2. Map character names (exists, add localStorage persistence)
3. Configure CC rules (new)
4. Configure group templates (new)
5. Generate import string (exists, now includes CC + group data)

**Addon:** Receives, stores, and acts on imported data. Additions:
- LDB minimap button (LibDataBroker + LibDBIcon)
- Store CC templates and group templates in saved vars (not just passthrough)
- Import merges into saved vars so future v2 editors write to the same store

## Bridge: CC Rule Builder (Step 3)

- One row per raid marker (Star through Skull, marker icons)
- Each row: priority list of CC assignments (CC type + player dropdown)
- Player dropdowns filtered by class CC capability
- "+" button for fallback CCs per marker, drag to reorder
- Pre-populated with DEFAULT_CC_TEMPLATE resolved against actual roster
- Output: resolved `ccAssignments` array + abstract template rules in payload

## Bridge: Group Template Builder (Step 4)

- Visual layout of raid groups 1–5 (max 25 players, TBC Anniversary)
- Preset selector: "TBC Karazhan (10-man)", "TBC 25-man", "Custom"
- Each group: card with 5 player slots, class-colored names, label field
- Priority buffs selector per group (from available roster buffs)
- Drag players between groups to adjust
- Unassigned players in sidebar pool
- Auto-calculates initial layout using existing template logic
- Output: concrete group assignments + abstract templates in payload

## Bridge: Character Name Persistence

- Store discordId -> wowName mappings in browser localStorage
- Pre-fill the name mapping table on subsequent imports
- Keyed by Discord user ID for cross-event reuse

## Addon: LDB Minimap Button

- Replace hardcoded minimap button with LibDataBroker + LibDBIcon
- Left-click: show status / toggle CC frame
- Right-click: dropdown menu (Import, Sort Groups, Invite, CC Assignments)
- Position saved automatically by LibDBIcon

## Addon: Data Storage for v2

- `RaidHelperBridgeDB.ccTemplates`: stored CC template rules (abstract)
- `RaidHelperBridgeDB.groupTemplates`: stored group template rules (abstract)
- `RaidHelperBridgeDB.characterMappings`: Discord ID -> WoW name
- Import writes to these; current event references them
- Future v2 in-game editors modify the same saved vars

## Import Payload Changes

Add to existing `ImportPayload`:
- `ccTemplate`: abstract rules (classOrder-based) — already in types.ts
- `groupAssignments`: concrete player -> group number mapping (new)
- `groupTemplates`: abstract buff priority rules — already in types.ts
- `characterMappings`: discordId -> wowName map (new, for addon persistence)

## Testing

**Bridge (Vitest):**
- importGenerator.ts: round-trip encode/decode
- CC resolution: template + roster -> assignments
- API route: mock Raid-Helper responses, rate limiting, error cases

**Addon:**
- Expand /rhb mock with scenarios: no CC, empty roster, 25 players
- Manual in-game testing checklist

## Out of Scope (v2)

- In-game CC template editor UI
- In-game group template editor UI
- In-game re-resolution of CC/groups when roster changes
- Discord bot integration (embed parser path)

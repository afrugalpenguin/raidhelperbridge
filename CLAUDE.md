# RaidHelperBridge

WoW TBC Classic addon + Next.js web app for bridging Discord Raid-Helper signups with in-game raid management.

<!-- ============================================================
     STANDARD WOW ADDON FRAMEWORK
     Everything below this line (until the addon-specific section)
     can be copied to any new WoW addon repo as-is.
     ============================================================ -->

## New Addon Setup Checklist

When creating a new addon repo from this template:

1. **Replace addon identity** — Update the `# Title` and description at the top of this file.
2. **Create `.toc` file** — Use the TOC template below, filling in your addon name, description, saved variables, and file list.
3. **Create `.pkgmeta`** — Use the template below, setting `package-as` to your addon folder name.
4. **Create `.luacheckrc`** — Copy from an existing addon and update the `globals` table for your addon's global names.
5. **Create GitHub Actions workflows** — Copy `.github/workflows/release.yml` and `.github/workflows/luacheck.yml` from an existing addon. Update the CurseForge project ID in the release workflow.
6. **Create `RELEASE.md`** — Copy from an existing addon, update addon-specific file references.
7. **Set up CurseForge** — Create the project on CurseForge, note the project ID, and add `CF_API_KEY` as a GitHub repo secret.
8. **Add addon-specific sections** — Add architecture, file structure, conventions, and patterns sections specific to this addon at the bottom of this file.

### TOC Template

```toc
## Interface: 20505
## Title: YourAddonName
## Notes: Short description of what this addon does
## Author: YourName
## Version: @project-version@
## SavedVariables: YourAddonNameDB
## OptionalDeps: Masque
## IconTexture: Interface\Icons\Your_Icon

Core.lua
```

- `Interface: 20505` is for TBC Anniversary Classic. Do NOT use BCC (Burning Crusade Classic) interface numbers.
- `@project-version@` is replaced by BigWigs packager at build time from the git tag.

### .pkgmeta Template

```yaml
package-as: YourAddonName

manual-changelog:
  filename: CHANGELOG.md
  markup-type: markdown

ignore:
  - images
  - README.md
  - CHANGELOG.md
  - .gitignore
  - .pkgmeta
  - .github
  - "*.svg"
  - "*.png"
  - docs
  - tests
  - .luacheckrc
```

### GitHub Actions: Release Workflow

`.github/workflows/release.yml` — triggers on version tags, packages and uploads to CurseForge + GitHub Releases:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Package and Release
        uses: BigWigsMods/packager@v2
        with:
          args: -p YOUR_CURSEFORGE_PROJECT_ID
        env:
          CF_API_KEY: ${{ secrets.CF_API_KEY }}
          GITHUB_OAUTH: ${{ secrets.GITHUB_TOKEN }}
```

- Replace `YOUR_CURSEFORGE_PROJECT_ID` with the numeric ID from your CurseForge project page.
- `CF_API_KEY` must be set as a GitHub repository secret (Settings > Secrets > Actions).
- `GITHUB_TOKEN` is provided automatically by GitHub Actions.

### GitHub Actions: Luacheck Workflow

`.github/workflows/luacheck.yml` — runs luacheck on push and PR to main:

```yaml
name: Luacheck

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  luacheck:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Lua
        uses: leafo/gh-actions-lua@v10
        with:
          luaVersion: "5.1"

      - name: Install LuaRocks
        uses: leafo/gh-actions-luarocks@v4

      - name: Install luacheck
        run: luarocks install luacheck

      - name: Run luacheck
        run: luacheck .
```

### .luacheckrc Template

```lua
-- Luacheck configuration for WoW addon
std = "lua51"
max_line_length = false

-- Your addon globals (writable)
globals = {
    "YourAddonName",
    "YourAddonNameDB",
    "SLASH_YOURADDON1",
    "SLASH_YOURADDON2",
    "SlashCmdList",
}

read_globals = {
    -- WoW Frame API
    "CreateFrame", "UIParent", "WorldFrame", "GameTooltip",
    "DEFAULT_CHAT_FRAME", "StaticPopup_Show", "StaticPopupDialogs",
    "InterfaceOptionsFrame_OpenToCategory", "InterfaceOptions_AddCategory",
    "InterfaceOptionsFrame", "SettingsPanel", "Settings",
    "hooksecurefunc", "BackdropTemplateMixin", "ColorPickerFrame",

    -- WoW Unit API
    "UnitClass", "UnitName", "UnitExists", "UnitIsPlayer", "UnitIsUnit",
    "UnitIsDeadOrGhost", "UnitDebuff", "UnitBuff", "UnitGUID",
    "UnitAffectingCombat", "UnitPower", "UnitPowerMax", "UnitPowerType",
    "UnitCastingInfo", "UnitChannelInfo", "UnitAttackSpeed", "UnitRangedDamage",
    "UnitRace", "UnitPosition", "UnitMana", "CheckInteractDistance",

    -- WoW Game State
    "GetTime", "GetRealmName", "GetScreenWidth", "GetScreenHeight",
    "GetCursorPosition", "GetSpellInfo", "GetSpellSubtext", "GetSpellTexture",
    "GetSpellCooldown", "GetSpellBonusDamage", "IsSpellKnown", "IsPlayerSpell",
    "GetShapeshiftForm", "GetTotemInfo", "GetNumPartyMembers", "GetNumGroupMembers",
    "IsInRaid", "InCombatLockdown", "IsControlKeyDown", "IsShiftKeyDown",
    "GetNetStats", "GetInventoryItemLink", "GetInventoryItemID",
    "GetInventoryItemCooldown", "GetInventoryItemTexture", "GetItemSpell",
    "GetWeaponEnchantInfo", "GetRangedCritChance", "GetCritChance",
    "IsCurrentSpell", "IsAutoRepeatSpell", "CombatLogGetCurrentEventInfo",
    "BOOKTYPE_SPELL",

    -- WoW Constants
    "RAID_CLASS_COLORS", "LE_PARTY_CATEGORY_HOME", "Enum",
    "COMBATLOG_OBJECT_TYPE_PLAYER", "COMBATLOG_OBJECT_AFFILIATION_MINE",

    -- WoW Timer API
    "C_Timer",

    -- Lua globals
    "strsplit", "strjoin", "tContains", "tinsert", "tremove", "wipe",
    "format", "date", "bit", "sqrt", "floor", "ceil", "abs", "min", "max",
    "random", "loadstring", "setfenv",

    -- WoW string functions
    "strtrim", "strmatch", "gsub", "strlen",

    -- UI Dropdown Menu
    "UIDropDownMenu_SetWidth", "UIDropDownMenu_SetText",
    "UIDropDownMenu_Initialize", "UIDropDownMenu_CreateInfo",
    "UIDropDownMenu_AddButton", "CloseDropDownMenus",

    -- Sound
    "PlaySound", "SOUNDKIT",

    -- Misc
    "GameFontHighlightSmall", "LibStub", "C_NamePlate",
    "CastingBarFrame", "Masque", "OpacitySliderFrame",
}

ignore = {
    "211",  -- Unused local variable
    "212",  -- Unused argument (common in WoW callbacks)
    "213",  -- Unused loop variable
    "311",  -- Value assigned to variable is unused
    "412",  -- Redefining local variable
    "421",  -- Shadowing local variable
    "431",  -- Shadowing upvalue (common with 'self' in nested callbacks)
    "432",  -- Shadowing upvalue argument
    "542",  -- Empty if branch
    "611",  -- Line contains only whitespace
}

exclude_files = {
    ".lua",
    ".luarocks",
    "lua_modules",
}

files["tests/**/*.lua"] = {
    std = "+busted",
}
```

### RELEASE.md Template

```markdown
# Release Checklist

Before each release:

- [ ] Update version in `Core.lua` (or your main file)
- [ ] Update `CHANGELOG.md` (use `**vX.Y.Z**` bold text, no `###` subheadings)
- [ ] Commit with message: `chore(release): bump version to X.Y.Z`
- [ ] Create and push tag: `git tag vX.Y.Z && git push origin vX.Y.Z`

## Version Tagging Rules

Follow [Semantic Versioning](https://semver.org/):

| Type | When to use | Example |
|------|-------------|---------|
| **Major** (X.0.0) | Breaking changes, major UI overhauls, saved variable resets | 2.0.0 → 3.0.0 |
| **Minor** (X.Y.0) | New features, new modules, significant enhancements | 3.1.0 → 3.2.0 |
| **Patch** (X.Y.Z) | Bug fixes, small tweaks, spell data updates | 3.1.5 → 3.1.6 |

## Tag Format

Always prefix with `v`: `v3.1.6`
```

### CHANGELOG.md Format

Use bold version headers with bullet points. No `###` subheadings — CurseForge renders them poorly:

```markdown
**vX.Y.Z**

- Description of new feature
- Description of fix

**vPrevious**

- Previous changes
```

---

## WoW Addon Development

- This is a TBC Anniversary Classic addon project. TBC Anniversary is NOT the same as BCC (Burning Crusade Classic). Do not assume they share the same APIs, TOC interfaces, or CurseForge flavour support.
- Use CraftFrame APIs (not TradeSkillFrame) for TBC Anniversary profession windows.
- Bindings.xml is NOT supported in TBC Classic Anniversary. Do not attempt XML keybinding approaches.
- For keybinds, use SetOverrideBindingClick instead of Bindings.xml or XML-based binding attributes.
- IsSpellKnown() may not work for all spells in TBC; verify with GetSpellInfo or test in-game before assuming.

### Lua / WoW API Guidelines

- GetSpellInfo does NOT return spell rank in TBC. Use GetSpellSubtext() for rank information.
- Always check if a spell ID is the talent ID, the buff ID, or the castable spell ID — they are often different.
- When implementing UI elements (sliders, checkboxes, frames), always verify callback functions actually fire and that dimension changes propagate to child elements.
- `SetMinResize`/`SetMaxResize` removed in TBC Anniversary — use `SetResizeBounds(minW, minH, maxW, maxH)` with a compatibility check: `if frame.SetResizeBounds then`.
- `C_PartyInfo.InviteUnit(name)` — NOT global `InviteUnit()`. Same for `UninviteUnit`.
- `ConvertToRaid()` — still a global, NOT on `C_PartyInfo`.

## Release Process

When asked to "do a release" or bump version, follow the checklist in `RELEASE.md`.

## Testing

- **Bridge tests**: Run `npm test` (or `npx vitest run`) from the `Bridge/` directory. 26 tests across 4 suites.
- **In-game**: Use `/rhb mock kara` to load test data without needing a real Raid-Helper event.

## Debugging Rules

- When the user reports a visual bug, ask clarifying questions about EXACTLY what they see before assuming the cause.
- When a fix causes a regression, revert immediately rather than iterating forward on a broken state.

## General Behaviour

### Session Continuations
- When resuming a session, do NOT re-explore the entire codebase. Assume prior context is valid unless the user says otherwise.
- Ask what changed since last session rather than reading every file again.

### Language
- Use British English in all user-facing text (optimise, maximise, colour, behaviour, etc.).

<!-- ============================================================
     ADDON-SPECIFIC SECTION
     Everything below is specific to THIS addon.
     Replace or remove when copying to a new repo.
     ============================================================ -->

## RaidHelperBridge Architecture

RaidHelperBridge has two components: a **Next.js web app** (Bridge) and a **WoW addon** (Addon). The web app fetches Discord Raid-Helper signups, lets raid leaders build groups/CC assignments, and generates a compressed import string. The addon imports that string and provides in-game tools for inviting, sorting, and displaying assignments.

### Data Flow

```
Raid-Helper API → Bridge web app → compressed import string → WoW addon
                  (groups, CC,       !RHB!<base64-deflateRaw>    (invite, sort,
                   buff setup)                                    CC display)
```

### Compression Format

- Bridge uses `pako.deflateRaw()` / `pako.inflateRaw()` (NOT `deflate`/`inflate`)
- Addon uses `LibDeflate:DecompressDeflate()` which expects **raw deflate** (no zlib wrapper)
- Import string format: `!RHB!<base64-of-raw-deflate-json>`

## RaidHelperBridge File Structure

```
Bridge/                         # Next.js 14 web app
  app/
    page.tsx                    # 5-step orchestrator (fetch, map, CC, groups, generate)
    api/event/route.ts          # Raid-Helper API proxy (rate-limited, 30 req/min)
  components/
    StepFetchEvent.tsx          # Step 1: event URL input
    StepMapNames.tsx            # Step 2: Discord → WoW name mapping
    StepCCRules.tsx             # Step 3: CC assignment builder
    StepGroupBuilder.tsx        # Step 4: group builder (drag-drop, buffs, optimiser)
    StepGenerateImport.tsx      # Step 5: generate import string
  lib/
    importGenerator.ts          # Payload builder + compress/decompress
    ccResolver.ts               # CC abilities, auto-assign logic
    groupSolver.ts              # Group assignment, templates (localStorage)
    groupBuffs.ts               # Party buff definitions + resolver with exclusions
    shareUrl.ts                 # Shareable group layout URL encode/decode
    characterMappings.ts        # localStorage persistence (discordId → wowName)
    constants.ts                # CLASS_COLORS, ROLE_LABELS
    rosterTypes.ts              # TypeScript interfaces
    types.ts                    # Shared types
  lib/__tests__/                # Vitest test suite (26 tests)

Addon/                          # WoW Lua addon
  Core.lua                      # Saved vars, event dispatcher, slash commands, utilities
  Import.lua                    # Base64 decode, LibDeflate decompress, JSON parse
  CCManager.lua                 # CC tracking, auto-whisper on marker, callouts
  GroupManager.lua              # Group calculation, raid sorting
  InviteManager.lua             # Bulk invites with throttling, who-check, kick
  Data/
    CCAbilities.lua             # TBC CC spell database (25 types)
    BuffProviders.lua           # Raid buff database + default group templates
    MarkerInfo.lua              # Marker names, textures, class colours
  UI/
    MainFrame.lua               # LibDataBroker minimap button
    CCFrame.lua                 # CC assignment display frames (player + leader)
    GroupFrame.lua              # Group preview frame with Sort button
    TabFrame.lua                # Screen-edge quick-action tab
  Libs/                         # Bundled libraries
    LibStub, LibDeflate, LibDataBroker-1.1, LibDBIcon-1.0,
    CallbackHandler-1.0, json.lua (rxi)
```

## RaidHelperBridge Key Patterns

### Addon UI Frame Pattern

All display frames (CCFrame, GroupFrame) follow the same pattern:

1. `CreateFrame("Frame", name, UIParent, "BackdropTemplate")` with dark background
2. Draggable title bar, close button, resize grip with `SetResizeBounds`
3. Position persistence via `addon.charDb[posKey]`
4. Lazy row creation with `GetRow(frame, index)` / `HideExtraRows(frame, startIndex)`
5. Auto-resize height based on content
6. Toggle function: create once, refresh on show
7. Auto-refresh on `GROUP_ROSTER_UPDATE` and after imports

### Addon Module Pattern

Modules communicate through the addon table (`addon`). Each module:
- Starts with `local addonName, addon = ...`
- Registers event handlers via `addon:RegisterModuleEvent(event, handler)`
- Exposes public methods on `addon` (e.g., `addon:ToggleGroupFrame()`)

### Bridge Group Buff System

- 14 party-only buffs defined in `groupBuffs.ts` with `match(class, spec)` functions
- `exclusionGroup` field for mutual exclusions (paladin auras, shaman air totems)
- Player-keyed overrides: `Set<string>` with `${playerName}_${buffId}` keys
- Sanctity Aura is manual-only (`match: () => false`) since talent builds can't be inferred

### Bridge Optimiser

Three-phase algorithm in `StepGroupBuilder.tsx`:
1. **Fill gaps** — place unassigned players where they add most buffs
2. **Greedy sweep** — exhaustive 2-player swaps accepting any improvement
3. **Simulated annealing** — 2000 iterations of random swaps (70%) and 3-player rotations (30%) with cooling schedule to escape local optima

### Raid-Helper API

- Event endpoint: `https://raid-helper.dev/api/v2/events/<id>` (no auth needed)
- Raidplan endpoint: `https://raid-helper.dev/api/raidplan/<id>` — has `slots[]` with `groupNumber`
- **className=Tank** — infer real class from `specName`
- **Spec suffixes:** `Protection`=Warrior, `Protection1`=Paladin, `Holy`=Priest, `Holy1`=Paladin, `Restoration`=Druid, `Restoration1`=Shaman

## RaidHelperBridge Conventions

- **Commit messages**: `type(scope): description` format, max 72 char subject. No Co-Authored-By lines.
- **Versions**: Keep `package.json`, `.toc ## Version:`, and git tags in sync. Tag format: `v1.0.10`.
- **British English**: All user-facing text uses British spelling (optimise, maximise, colour, behaviour).
- **CHANGELOG.md**: `**vX.Y.Z**` bold headers, bullet points, no subheadings.
- **Buff icons**: Zamimg CDN — `https://wow.zamimg.com/images/wow/icons/small/{name}.jpg`

## RaidHelperBridge Dependencies

### Bridge (npm)
- **next** ^14, **react** ^18, **react-dom** ^18
- **pako** — deflate compression for import strings and share URLs
- **@vercel/analytics** — usage tracking

### Addon (bundled Lua libs)
- **LibStub**, **CallbackHandler-1.0** — library framework
- **LibDeflate** — decompression for import strings
- **LibDataBroker-1.1**, **LibDBIcon-1.0** — minimap button
- **rxi/json.lua** — JSON parsing

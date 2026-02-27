local addonName, addon = ...

-- Create main addon frame
local RaidHelperBridge = CreateFrame("Frame", "RaidHelperBridge", UIParent)
RaidHelperBridge:RegisterEvent("ADDON_LOADED")
RaidHelperBridge:RegisterEvent("PLAYER_LOGIN")

-- Addon namespace
addon.name = addonName
addon.frame = RaidHelperBridge

-- Saved variables defaults
local defaults = {
    global = {
        ccTemplates = {},
        groupTemplates = {},
        characterMappings = {},  -- Discord name -> WoW character
    },
    char = {
        currentEvent = nil,
        autoWhisper = true,
        whisperCooldown = 30,
        debugMode = false,
    },
}

-- Initialize saved variables
local function InitializeSavedVars()
    if not RaidHelperBridgeDB then
        RaidHelperBridgeDB = CopyTable(defaults.global)
    end
    if not RaidHelperBridgeCharDB then
        RaidHelperBridgeCharDB = CopyTable(defaults.char)
    end
    
    addon.db = RaidHelperBridgeDB
    addon.charDb = RaidHelperBridgeCharDB
end

-- Print message to chat
function addon:Print(msg)
    print("|cFF00FF00[RHB]|r " .. tostring(msg))
end

-- Debug print
function addon:Debug(msg)
    if addon.charDb and addon.charDb.debugMode then
        print("|cFFFFFF00[RHB Debug]|r " .. tostring(msg))
    end
end

-- Check if player is raid leader or assistant
function addon:HasRaidAssist()
    if not IsInRaid() then return false end
    for i = 1, GetNumGroupMembers() do
        local name, rank = GetRaidRosterInfo(i)
        if name == UnitName("player") then
            return rank >= 1  -- 0 = member, 1 = assist, 2 = leader
        end
    end
    return false
end

-- Check if player is raid leader
function addon:IsRaidLeader()
    if not IsInRaid() then return false end
    for i = 1, GetNumGroupMembers() do
        local name, rank = GetRaidRosterInfo(i)
        if name == UnitName("player") then
            return rank == 2
        end
    end
    return false
end

-- Get raid member index by name
function addon:GetRaidIndex(playerName)
    for i = 1, GetNumGroupMembers() do
        local name = GetRaidRosterInfo(i)
        if name and (name == playerName or name:match("^" .. playerName .. "%-")) then
            return i
        end
    end
    return nil
end

-- Check if player is in the current raid
function addon:IsInRaid(playerName)
    return addon:GetRaidIndex(playerName) ~= nil
end

-- Get current raid roster as a table
function addon:GetRaidRoster()
    local roster = {}
    if not IsInRaid() then return roster end
    
    for i = 1, GetNumGroupMembers() do
        local name, rank, subgroup, level, class, fileName, zone, online, isDead, role, isML = GetRaidRosterInfo(i)
        if name then
            roster[name] = {
                index = i,
                rank = rank,
                subgroup = subgroup,
                level = level,
                class = fileName,  -- English class name
                zone = zone,
                online = online,
                isDead = isDead,
                role = role,
            }
        end
    end
    
    return roster
end

-- Slash command handler
local function SlashHandler(msg)
    local args = {}
    for word in msg:gmatch("%S+") do
        table.insert(args, word:lower())
    end

    local cmd = args[1] or "help"

    if cmd == "import" then
        addon:ShowImportDialog()
    elseif cmd == "cc" then
        addon:ShowCCAssignments()
    elseif cmd == "callout" then
        local marker = tonumber(args[2])
        addon:CalloutCC(marker)
    elseif cmd == "whisper" then
        addon:ToggleAutoWhisper()
    elseif cmd == "groups" then
        addon:PreviewGroupLayout()
    elseif cmd == "buffs" then
        addon:ShowBuffSummary()
    elseif cmd == "invite" then
        addon:SendRaidInvites()
    elseif cmd == "cancel" then
        addon:CancelInvites()
    elseif cmd == "sort" then
        addon:ApplyGroupLayout()
    elseif cmd == "status" then
        addon:ShowStatus()
    elseif cmd == "who" then
        addon:WhoCheck()
    elseif cmd == "kickcheck" then
        addon:KickNonEventPlayers()
    elseif cmd == "confirmkick" then
        addon:ConfirmKick()
    elseif cmd == "mycc" then
        addon:TogglePlayerCCFrame()
    elseif cmd == "ccframe" then
        addon:ToggleLeaderCCFrame()
    elseif cmd == "mock" then
        addon:LoadMockEvent()
    elseif cmd == "debug" then
        addon.charDb.debugMode = not addon.charDb.debugMode
        addon:Print("Debug mode: " .. (addon.charDb.debugMode and "ON" or "OFF"))
    elseif cmd == "clear" then
        addon.charDb.currentEvent = nil
        addon:Print("Event data cleared.")
    else
        addon:Print("Commands:")
        addon:Print("  /rhb import    - Import event from Raid-Helper")
        addon:Print("  /rhb status    - Show current event status")
        addon:Print("  /rhb cc        - Show CC assignments")
        addon:Print("  /rhb callout # - Announce CC for marker # in raid")
        addon:Print("  /rhb whisper   - Toggle auto-whisper on/off")
        addon:Print("  /rhb groups    - Preview group layout")
        addon:Print("  /rhb buffs     - Show available raid buffs")
        addon:Print("  /rhb sort      - Apply group optimisation")
        addon:Print("  /rhb invite    - Send raid invites")
        addon:Print("  /rhb cancel    - Cancel pending invites")
        addon:Print("  /rhb who       - Check event players' raid status")
        addon:Print("  /rhb mycc      - Toggle your CC assignments window")
        addon:Print("  /rhb ccframe   - Toggle leader CC assignments window")
        addon:Print("  /rhb mock      - Load mock event data (testing)")
        addon:Print("  /rhb debug     - Toggle debug mode")
        addon:Print("  /rhb clear     - Clear current event data")
    end
end

-- Central event dispatcher
-- Modules register handlers here instead of overwriting OnEvent
addon.eventHandlers = {}

function addon:RegisterModuleEvent(event, handler)
    if not addon.eventHandlers[event] then
        addon.eventHandlers[event] = {}
        addon.frame:RegisterEvent(event)
    end
    table.insert(addon.eventHandlers[event], handler)
end

-- Event handler
RaidHelperBridge:SetScript("OnEvent", function(self, event, arg1)
    if event == "ADDON_LOADED" and arg1 == addonName then
        InitializeSavedVars()
        
        -- Register slash commands
        SLASH_RAIDHELPBRIDGE1 = "/rhb"
        SLASH_RAIDHELPBRIDGE2 = "/raidhelperbridge"
        SlashCmdList["RAIDHELPBRIDGE"] = SlashHandler
        
        addon:Print("Loaded. Type /rhb for commands.")
        
    elseif event == "PLAYER_LOGIN" then
        -- Initialize modules
        if addon.InitCCManager then
            addon:InitCCManager()
        end
        if addon.InitGroupManager then
            addon:InitGroupManager()
        end
        if addon.InitInviteManager then
            addon:InitInviteManager()
        end
    end

    -- Dispatch to module handlers
    local handlers = addon.eventHandlers[event]
    if handlers then
        for _, handler in ipairs(handlers) do
            handler(event, arg1)
        end
    end
end)

-- Show current event status
function addon:ShowStatus()
    local event = addon.charDb.currentEvent
    if not event then
        addon:Print("No event loaded. Use /rhb import to load an event.")
        return
    end
    
    addon:Print("Current Event: " .. event.eventName)
    addon:Print("Event Time: " .. date("%Y-%m-%d %H:%M", event.eventTime))
    addon:Print("Players: " .. #event.players)
    
    -- Count by class
    local byClass = {}
    for _, player in ipairs(event.players) do
        byClass[player.class] = (byClass[player.class] or 0) + 1
    end
    
    local classStr = ""
    for class, count in pairs(byClass) do
        if classStr ~= "" then classStr = classStr .. ", " end
        classStr = classStr .. class .. ": " .. count
    end
    addon:Print("Roster: " .. classStr)
    
    -- CC assignments
    if event.ccAssignments and #event.ccAssignments > 0 then
        addon:Print("CC Assignments:")
        for _, assignment in ipairs(event.ccAssignments) do
            local markerName = addon.MARKER_NAMES[assignment.marker]
            for _, cc in ipairs(assignment.assignments) do
                addon:Print("  " .. markerName .. ": " .. cc.playerName .. " (" .. cc.ccType .. ")")
            end
        end
    end
end

-- Mock event for testing without Bridge
function addon:LoadMockEvent()
    addon.charDb.currentEvent = {
        version = 1,
        eventId = "mock-kara-001",
        eventName = "Karazhan Thursday (Mock)",
        eventTime = time() + 86400,
        players = {
            { name = "Tankadin", class = "PALADIN", role = "tank", spec = "protection" },
            { name = "Beartank", class = "DRUID", role = "tank", spec = "feral" },
            { name = "Frostbolt", class = "MAGE", role = "rdps", spec = "frost" },
            { name = "Icyveins", class = "MAGE", role = "rdps", spec = "frost" },
            { name = "Dotmaster", class = "WARLOCK", role = "rdps", spec = "affliction" },
            { name = "Backstab", class = "ROGUE", role = "mdps", spec = "combat" },
            { name = "Windrunner", class = "HUNTER", role = "rdps", spec = "beastmastery" },
            { name = "Holybolt", class = "PALADIN", role = "healer", spec = "holy" },
            { name = "Treeheals", class = "DRUID", role = "healer", spec = "restoration" },
            { name = "Spiritlink", class = "SHAMAN", role = "healer", spec = "restoration" },
        },
        ccAssignments = {
            { marker = 6, assignments = {{ ccType = "polymorph", playerName = "Frostbolt" }} },
            { marker = 5, assignments = {{ ccType = "polymorph", playerName = "Icyveins" }} },
            { marker = 4, assignments = {{ ccType = "banish", playerName = "Dotmaster" }} },
            { marker = 3, assignments = {{ ccType = "freezingtrap", playerName = "Windrunner" }} },
        },
    }
    addon:Print("Mock event loaded: Karazhan Thursday")
    addon:Print("Use /rhb status to see details")
end

-- Export addon table
_G.RaidHelperBridge = addon

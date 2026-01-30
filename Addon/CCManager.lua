local addonName, addon = ...

-- CC Manager Module
-- Handles CC assignments and automatic whispers when raid markers are applied

local CCManager = {}
addon.CCManager = CCManager

-- Cooldown tracking for whispers
local whisperCooldowns = {}

-- Mob type to CC mapping for auto-detection
local MOB_TYPE_CC = {
    Humanoid = { "polymorph", "sap", "freezingtrap", "shackle", "seduce", "repentance", "fear" },
    Beast = { "hibernate", "freezingtrap", "polymorph", "sap", "fear" },
    Demon = { "banish", "freezingtrap", "sap", "fear" },
    Dragonkin = { "hibernate", "freezingtrap", "sap" },
    Elemental = { "banish", "freezingtrap" },
    Undead = { "shackle", "freezingtrap", "turnundead" },
    Giant = { "freezingtrap" },
    Mechanical = { "freezingtrap" },
}

-- Initialize CC Manager
function addon:InitCCManager()
    addon:RegisterModuleEvent("RAID_TARGET_UPDATE", OnRaidTargetUpdate)
    addon:RegisterModuleEvent("PLAYER_TARGET_CHANGED", OnTargetChanged)
    addon:RegisterModuleEvent("UPDATE_MOUSEOVER_UNIT", OnMouseover)
    addon:Debug("CC Manager initialized")
end

-- Get CC assignment for a specific marker
function CCManager:GetAssignment(marker)
    local event = addon:GetCurrentEvent()
    if not event or not event.ccAssignments then
        return nil
    end
    
    for _, assignment in ipairs(event.ccAssignments) do
        if assignment.marker == marker then
            return assignment
        end
    end
    
    return nil
end

-- Get the appropriate CC for a mob type from an assignment
function CCManager:GetCCForMobType(assignment, mobType)
    if not assignment or not assignment.assignments then
        return nil
    end
    
    -- Get valid CC types for this mob type
    local validCC = MOB_TYPE_CC[mobType] or {}
    
    -- Find first assignment that matches
    for _, cc in ipairs(assignment.assignments) do
        for _, validType in ipairs(validCC) do
            if cc.ccType == validType then
                return cc
            end
        end
    end
    
    -- No valid CC for this mob type, return first assignment anyway
    -- (player will have to figure it out)
    return assignment.assignments[1]
end

-- Send CC whisper to player
function CCManager:SendWhisper(playerName, marker, mobName, ccType)
    if not addon.charDb.autoWhisper then
        return
    end
    
    -- Check cooldown
    local cooldownKey = playerName .. "_" .. marker
    local now = GetTime()
    if whisperCooldowns[cooldownKey] and (now - whisperCooldowns[cooldownKey]) < addon.charDb.whisperCooldown then
        addon:Debug("Whisper on cooldown for " .. playerName)
        return
    end
    
    -- Build message
    local markerName = addon.MARKER_NAMES[marker]
    local msg
    if mobName then
        msg = string.format("CC %s - %s", markerName, mobName)
    else
        msg = string.format("CC %s", markerName)
    end
    
    if ccType then
        msg = msg .. " (" .. ccType .. ")"
    end
    
    -- Send whisper
    SendChatMessage(msg, "WHISPER", nil, playerName)
    whisperCooldowns[cooldownKey] = now
    
    addon:Debug("Sent CC whisper to " .. playerName .. ": " .. msg)
end

-- Check a unit for raid marker and send whisper if needed
function CCManager:CheckUnit(unit)
    if not UnitExists(unit) then return end
    if UnitIsFriend("player", unit) then return end  -- Skip friendly units
    
    local marker = GetRaidTargetIndex(unit)
    if not marker then return end
    
    local assignment = CCManager:GetAssignment(marker)
    if not assignment then
        addon:Debug("No CC assignment for marker " .. marker)
        return
    end
    
    -- Get mob type
    local mobType = UnitCreatureType(unit)
    local mobName = UnitName(unit)
    
    -- Find appropriate CC
    local cc = CCManager:GetCCForMobType(assignment, mobType)
    if cc then
        CCManager:SendWhisper(cc.playerName, marker, mobName, cc.ccType)
    end
end

-- Check all raid member targets
function CCManager:CheckAllTargets()
    if not IsInRaid() then return end
    
    for i = 1, GetNumGroupMembers() do
        local unit = "raid" .. i .. "target"
        CCManager:CheckUnit(unit)
    end
end

-- Handle raid target update event
local function OnRaidTargetUpdate()
    -- Debounce - only check every 0.5 seconds
    if CCManager.lastCheck and (GetTime() - CCManager.lastCheck) < 0.5 then
        return
    end
    CCManager.lastCheck = GetTime()
    
    -- Check target and mouseover
    CCManager:CheckUnit("target")
    CCManager:CheckUnit("mouseover")
    
    -- Check all raid targets
    CCManager:CheckAllTargets()
end

-- Handle target change
local function OnTargetChanged()
    CCManager:CheckUnit("target")
end

-- Handle mouseover
local function OnMouseover()
    CCManager:CheckUnit("mouseover")
end


-- Manual CC callout command
function addon:CalloutCC(marker)
    if not marker or marker < 1 or marker > 8 then
        addon:Print("Usage: /rhb callout <marker number 1-8>")
        return
    end
    
    local assignment = CCManager:GetAssignment(marker)
    if not assignment then
        addon:Print("No CC assignment for marker " .. addon.MARKER_NAMES[marker])
        return
    end
    
    -- Announce in raid
    if IsInRaid() then
        for _, cc in ipairs(assignment.assignments) do
            local msg = string.format("%s -> %s (%s)", 
                addon.MARKER_NAMES[marker], 
                cc.playerName, 
                cc.ccType)
            SendChatMessage(msg, "RAID")
        end
    else
        for _, cc in ipairs(assignment.assignments) do
            addon:Print(string.format("%s -> %s (%s)", 
                addon.MARKER_NAMES[marker], 
                cc.playerName, 
                cc.ccType))
        end
    end
end

-- Show all CC assignments
function addon:ShowCCAssignments()
    local event = addon:GetCurrentEvent()
    if not event or not event.ccAssignments then
        addon:Print("No CC assignments loaded")
        return
    end
    
    addon:Print("CC Assignments:")
    for _, assignment in ipairs(event.ccAssignments) do
        local markerName = addon.MARKER_NAMES[assignment.marker]
        for _, cc in ipairs(assignment.assignments) do
            addon:Print(string.format("  %s: %s (%s)", markerName, cc.playerName, cc.ccType))
        end
    end
end

-- Toggle auto-whisper
function addon:ToggleAutoWhisper()
    addon.charDb.autoWhisper = not addon.charDb.autoWhisper
    addon:Print("Auto-whisper: " .. (addon.charDb.autoWhisper and "ON" or "OFF"))
end

-- Show CC editor (placeholder - would need full UI implementation)
function addon:ShowCCEditor()
    addon:Print("CC Editor not yet implemented. Current assignments:")
    addon:ShowCCAssignments()
end

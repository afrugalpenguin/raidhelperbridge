local addonName, addon = ...

-- Invite Manager Module
-- Handles automated raid invites based on event signups

local InviteManager = {}
addon.InviteManager = InviteManager

-- State tracking
local inviteQueue = {}
local inviteTimer = nil
local INVITE_DELAY = 0.5  -- Seconds between invites (to avoid throttling)

-- Initialize Invite Manager
function addon:InitInviteManager()
    addon.frame:RegisterEvent("GROUP_ROSTER_UPDATE")
    addon.frame:RegisterEvent("PARTY_INVITE_REQUEST")
    
    addon:Debug("Invite Manager initialized")
end

-- Get list of players who need invites
function InviteManager:GetInviteList()
    local event = addon:GetCurrentEvent()
    if not event then return {} end
    
    local roster = addon:GetRaidRoster()
    local toInvite = {}
    
    for _, player in ipairs(event.players) do
        local playerName = player.name
        local inRaid = false
        
        -- Check if already in raid (handle realm names)
        for rosterName, _ in pairs(roster) do
            if rosterName == playerName or rosterName:match("^" .. playerName .. "%-") then
                inRaid = true
                break
            end
        end
        
        -- Check if it's us
        if playerName == UnitName("player") then
            inRaid = true
        end
        
        if not inRaid then
            table.insert(toInvite, playerName)
        end
    end
    
    return toInvite
end

-- Process invite queue
local function ProcessInviteQueue()
    if #inviteQueue == 0 then
        if inviteTimer then
            inviteTimer:Cancel()
            inviteTimer = nil
        end
        addon:Print("All invites sent")
        return
    end
    
    local playerName = table.remove(inviteQueue, 1)
    
    -- Check if they're already in raid now
    if addon:IsInRaid(playerName) then
        addon:Debug(playerName .. " already in raid, skipping")
    else
        InviteUnit(playerName)
        addon:Debug("Invited " .. playerName)
    end
end

-- Send raid invites
function addon:SendRaidInvites()
    local event = addon:GetCurrentEvent()
    if not event then
        addon:Print("No event loaded. Use /rhb import first.")
        return
    end
    
    -- Make sure we're in a raid or can create one
    if not IsInRaid() then
        if IsInGroup() then
            ConvertToRaid()
            addon:Print("Converted to raid")
        else
            addon:Print("Please create a group first (invite someone or use /invite)")
            return
        end
    end
    
    -- Get list of players to invite
    inviteQueue = InviteManager:GetInviteList()
    
    if #inviteQueue == 0 then
        addon:Print("All players already in raid")
        return
    end
    
    addon:Print("Sending invites to " .. #inviteQueue .. " players...")
    
    -- Start invite timer
    if inviteTimer then
        inviteTimer:Cancel()
    end
    
    -- Process first invite immediately
    ProcessInviteQueue()
    
    -- Schedule remaining invites
    if #inviteQueue > 0 then
        inviteTimer = C_Timer.NewTicker(INVITE_DELAY, ProcessInviteQueue, #inviteQueue)
    end
end

-- Cancel pending invites
function addon:CancelInvites()
    if inviteTimer then
        inviteTimer:Cancel()
        inviteTimer = nil
    end
    local remaining = #inviteQueue
    inviteQueue = {}
    
    if remaining > 0 then
        addon:Print("Cancelled " .. remaining .. " pending invites")
    else
        addon:Print("No pending invites to cancel")
    end
end

-- Show invite status
function addon:ShowInviteStatus()
    local event = addon:GetCurrentEvent()
    if not event then
        addon:Print("No event loaded")
        return
    end
    
    local toInvite = InviteManager:GetInviteList()
    local roster = addon:GetRaidRoster()
    local rosterCount = 0
    for _ in pairs(roster) do rosterCount = rosterCount + 1 end
    
    addon:Print("Event: " .. event.eventName)
    addon:Print("Expected: " .. #event.players .. " | In Raid: " .. rosterCount .. " | Missing: " .. #toInvite)
    
    if #toInvite > 0 then
        addon:Print("Missing players: " .. table.concat(toInvite, ", "))
    end
end

-- Check who from event is online (requires /who or friends list)
function addon:WhoCheck()
    local event = addon:GetCurrentEvent()
    if not event then
        addon:Print("No event loaded")
        return
    end
    
    addon:Print("Use /who to check online status. Expected players:")
    
    for i, player in ipairs(event.players) do
        local inRaid = addon:IsInRaid(player.name)
        local status = inRaid and "|cFF00FF00[In Raid]|r" or "|cFFFFFF00[Not in Raid]|r"
        addon:Print("  " .. player.name .. " (" .. player.class .. ") " .. status)
    end
end

-- Mass kick players not in event (careful!)
function addon:KickNonEventPlayers()
    if not addon:IsRaidLeader() then
        addon:Print("You must be raid leader to kick players")
        return
    end
    
    local event = addon:GetCurrentEvent()
    if not event then
        addon:Print("No event loaded")
        return
    end
    
    -- Build set of expected players
    local expected = {}
    for _, player in ipairs(event.players) do
        expected[player.name:lower()] = true
    end
    
    local roster = addon:GetRaidRoster()
    local toKick = {}
    
    for name, data in pairs(roster) do
        local baseName = name:match("^([^%-]+)") or name
        if not expected[baseName:lower()] and baseName ~= UnitName("player") then
            table.insert(toKick, { name = name, index = data.index })
        end
    end
    
    if #toKick == 0 then
        addon:Print("No players to remove")
        return
    end
    
    addon:Print("Players not in event signup: " .. #toKick)
    for _, player in ipairs(toKick) do
        addon:Print("  " .. player.name)
    end
    addon:Print("Type /rhb confirmkick to remove these players")
    
    -- Store for confirmation
    addon.pendingKicks = toKick
end

function addon:ConfirmKick()
    if not addon.pendingKicks or #addon.pendingKicks == 0 then
        addon:Print("No pending kicks. Use /rhb kickcheck first.")
        return
    end
    
    if not addon:IsRaidLeader() then
        addon:Print("You must be raid leader to kick players")
        return
    end
    
    for _, player in ipairs(addon.pendingKicks) do
        UninviteUnit(player.name)
        addon:Print("Removed " .. player.name)
    end
    
    addon.pendingKicks = nil
end

-- Hook into addon's event handler for group updates
local originalOnEvent = addon.frame:GetScript("OnEvent")
addon.frame:SetScript("OnEvent", function(self, event, ...)
    if event == "GROUP_ROSTER_UPDATE" then
        -- Could auto-check for new joins here
    end
    
    if originalOnEvent then
        originalOnEvent(self, event, ...)
    end
end)

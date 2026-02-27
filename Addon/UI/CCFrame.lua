local addonName, addon = ...

-- CC Assignment Frames
-- Player frame: shows current player's own CC assignments
-- Leader frame: shows all CC assignments for the raid

local ROW_HEIGHT = 20
local ICON_SIZE = 16
local PADDING = 8
local TITLE_HEIGHT = 24

-- Shared: save frame position to charDb
local function SaveFramePosition(frame, key)
    local point, _, relPoint, x, y = frame:GetPoint()
    addon.charDb[key] = { point = point, relPoint = relPoint, x = x, y = y }
end

-- Shared: restore frame position from charDb
local function RestoreFramePosition(frame, key)
    local pos = addon.charDb and addon.charDb[key]
    if pos then
        frame:ClearAllPoints()
        frame:SetPoint(pos.point, UIParent, pos.relPoint, pos.x, pos.y)
    end
end

-- Shared: create a backdrop-styled frame
local function CreateCCFrame(name, title, width, height, posKey)
    local frame = CreateFrame("Frame", name, UIParent, "BackdropTemplate")
    frame:SetSize(width, height)
    frame:SetPoint("CENTER")
    frame:SetFrameStrata("MEDIUM")
    frame:SetBackdrop({
        bgFile = "Interface\\DialogFrame\\UI-DialogBox-Background",
        edgeFile = "Interface\\DialogFrame\\UI-DialogBox-Border",
        tile = true, tileSize = 32, edgeSize = 16,
        insets = { left = 4, right = 4, top = 4, bottom = 4 },
    })
    frame:SetBackdropColor(0, 0, 0, 0.85)

    -- Title bar
    local titleBar = CreateFrame("Frame", nil, frame)
    titleBar:SetHeight(TITLE_HEIGHT)
    titleBar:SetPoint("TOPLEFT", frame, "TOPLEFT", 4, -4)
    titleBar:SetPoint("TOPRIGHT", frame, "TOPRIGHT", -24, -4)

    local titleText = titleBar:CreateFontString(nil, "OVERLAY", "GameFontNormal")
    titleText:SetPoint("LEFT", titleBar, "LEFT", PADDING, 0)
    titleText:SetText(title)
    frame.titleText = titleText

    -- Make draggable via title bar
    frame:SetMovable(true)
    frame:SetClampedToScreen(true)
    titleBar:EnableMouse(true)
    titleBar:RegisterForDrag("LeftButton")
    titleBar:SetScript("OnDragStart", function() frame:StartMoving() end)
    titleBar:SetScript("OnDragStop", function()
        frame:StopMovingOrSizing()
        SaveFramePosition(frame, posKey)
    end)

    -- Close button
    local closeBtn = CreateFrame("Button", nil, frame, "UIPanelCloseButton")
    closeBtn:SetPoint("TOPRIGHT", frame, "TOPRIGHT", -2, -2)
    closeBtn:SetScript("OnClick", function() frame:Hide() end)

    -- Resize grip
    frame:SetResizable(true)
    if frame.SetResizeBounds then
        frame:SetResizeBounds(150, 60, 500, 600)
    else
        frame:SetMinResize(150, 60)
        frame:SetMaxResize(500, 600)
    end
    local grip = CreateFrame("Button", nil, frame)
    grip:SetSize(16, 16)
    grip:SetPoint("BOTTOMRIGHT", frame, "BOTTOMRIGHT", -2, 2)
    grip:SetNormalTexture("Interface\\ChatFrame\\UI-ChatIM-SizeGrabber-Up")
    grip:SetHighlightTexture("Interface\\ChatFrame\\UI-ChatIM-SizeGrabber-Highlight")
    grip:SetPushedTexture("Interface\\ChatFrame\\UI-ChatIM-SizeGrabber-Down")
    grip:SetScript("OnMouseDown", function() frame:StartSizing("BOTTOMRIGHT") end)
    grip:SetScript("OnMouseUp", function()
        frame:StopMovingOrSizing()
        SaveFramePosition(frame, posKey)
    end)

    -- Content area (rows go here)
    local content = CreateFrame("Frame", nil, frame)
    content:SetPoint("TOPLEFT", frame, "TOPLEFT", PADDING, -(TITLE_HEIGHT + PADDING))
    content:SetPoint("BOTTOMRIGHT", frame, "BOTTOMRIGHT", -PADDING, PADDING)
    frame.content = content
    frame.rows = {}

    -- Restore saved position
    RestoreFramePosition(frame, posKey)

    frame:Hide()
    return frame
end

-- Shared: create or reuse a row frame inside parent content area
local function GetRow(frame, index)
    if frame.rows[index] then
        frame.rows[index]:Show()
        return frame.rows[index]
    end

    local row = CreateFrame("Frame", nil, frame.content)
    row:SetHeight(ROW_HEIGHT)
    row:SetPoint("TOPLEFT", frame.content, "TOPLEFT", 0, -((index - 1) * ROW_HEIGHT))
    row:SetPoint("RIGHT", frame.content, "RIGHT", 0, 0)

    local icon = row:CreateTexture(nil, "ARTWORK")
    icon:SetSize(ICON_SIZE, ICON_SIZE)
    icon:SetPoint("LEFT", row, "LEFT", 0, 0)
    row.icon = icon

    local text = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
    text:SetPoint("LEFT", icon, "RIGHT", 6, 0)
    text:SetPoint("RIGHT", row, "RIGHT", 0, 0)
    text:SetJustifyH("LEFT")
    row.text = text

    frame.rows[index] = row
    return row
end

-- Shared: hide all rows from startIndex onward
local function HideExtraRows(frame, startIndex)
    for i = startIndex, #frame.rows do
        frame.rows[i]:Hide()
    end
end

-- Format class-colored player name
local function ClassColoredName(playerName, className)
    local color = addon.CLASS_COLORS[className]
    if color then
        return string.format("|cFF%02x%02x%02x%s|r",
            color.r * 255, color.g * 255, color.b * 255, playerName)
    end
    return playerName
end

-- Find class for a player name from event data
local function GetPlayerClass(playerName)
    local event = addon:GetCurrentEvent()
    if not event or not event.players then return nil end
    for _, p in ipairs(event.players) do
        if p.name == playerName then
            return p.class
        end
    end
    return nil
end

--------------------------------------------------------------------------------
-- Player CC Frame ("My CC")
--------------------------------------------------------------------------------

local playerFrame

local function CreatePlayerCCFrame()
    if playerFrame then return playerFrame end
    playerFrame = CreateCCFrame("RHBPlayerCCFrame", "My CC", 200, 120, "playerCCFramePos")
    return playerFrame
end

local function RefreshPlayerCCFrame()
    local frame = playerFrame
    if not frame then return end

    local event = addon:GetCurrentEvent()
    if not event or not event.ccAssignments then
        HideExtraRows(frame, 1)
        return
    end

    local myName = UnitName("player")
    local rowIdx = 0

    for _, assignment in ipairs(event.ccAssignments) do
        for _, cc in ipairs(assignment.assignments) do
            if cc.playerName == myName then
                rowIdx = rowIdx + 1
                local row = GetRow(frame, rowIdx)
                row.icon:SetTexture(addon.MARKER_ICONS[assignment.marker])
                local markerName = addon.MARKER_NAMES[assignment.marker] or "?"
                row.text:SetText(markerName .. " \226\128\148 " .. cc.ccType)
            end
        end
    end

    HideExtraRows(frame, rowIdx + 1)

    -- Auto-resize height to fit content
    local newHeight = TITLE_HEIGHT + PADDING + math.max(rowIdx, 1) * ROW_HEIGHT + PADDING
    frame:SetHeight(newHeight)

    if rowIdx == 0 then
        -- No assignments for this player — show a message
        local row = GetRow(frame, 1)
        row.icon:SetTexture(nil)
        row.text:SetText("|cFF888888No CC assignments|r")
        HideExtraRows(frame, 2)
        frame:SetHeight(TITLE_HEIGHT + PADDING + ROW_HEIGHT + PADDING)
    end
end

function addon:TogglePlayerCCFrame()
    local frame = CreatePlayerCCFrame()
    if frame:IsShown() then
        frame:Hide()
    else
        RefreshPlayerCCFrame()
        frame:Show()
    end
end

--------------------------------------------------------------------------------
-- Leader CC Frame ("CC Assignments")
--------------------------------------------------------------------------------

local leaderFrame

local function CreateLeaderCCFrame()
    if leaderFrame then return leaderFrame end
    leaderFrame = CreateCCFrame("RHBLeaderCCFrame", "CC Assignments", 280, 180, "leaderCCFramePos")
    return leaderFrame
end

local function RefreshLeaderCCFrame()
    local frame = leaderFrame
    if not frame then return end

    local event = addon:GetCurrentEvent()
    if not event or not event.ccAssignments then
        HideExtraRows(frame, 1)
        return
    end

    local rowIdx = 0

    for _, assignment in ipairs(event.ccAssignments) do
        local markerName = addon.MARKER_NAMES[assignment.marker] or "?"
        for _, cc in ipairs(assignment.assignments) do
            rowIdx = rowIdx + 1
            local row = GetRow(frame, rowIdx)
            row.icon:SetTexture(addon.MARKER_ICONS[assignment.marker])

            local className = GetPlayerClass(cc.playerName)
            local displayName = className and ClassColoredName(cc.playerName, className) or cc.playerName
            row.text:SetText(markerName .. " \226\128\148 " .. displayName .. " (" .. cc.ccType .. ")")
        end
    end

    HideExtraRows(frame, rowIdx + 1)

    -- Auto-resize height to fit content
    local newHeight = TITLE_HEIGHT + PADDING + math.max(rowIdx, 1) * ROW_HEIGHT + PADDING
    frame:SetHeight(newHeight)

    if rowIdx == 0 then
        local row = GetRow(frame, 1)
        row.icon:SetTexture(nil)
        row.text:SetText("|cFF888888No CC assignments|r")
        HideExtraRows(frame, 2)
        frame:SetHeight(TITLE_HEIGHT + PADDING + ROW_HEIGHT + PADDING)
    end
end

function addon:ToggleLeaderCCFrame()
    local frame = CreateLeaderCCFrame()
    if frame:IsShown() then
        frame:Hide()
    else
        RefreshLeaderCCFrame()
        frame:Show()
    end
end

--------------------------------------------------------------------------------
-- Refresh both frames (called after import, roster update, etc.)
--------------------------------------------------------------------------------

function addon:RefreshCCFrames()
    if playerFrame and playerFrame:IsShown() then
        RefreshPlayerCCFrame()
    end
    if leaderFrame and leaderFrame:IsShown() then
        RefreshLeaderCCFrame()
    end
end

-- Auto-refresh on group roster changes
addon:RegisterModuleEvent("GROUP_ROSTER_UPDATE", function()
    addon:RefreshCCFrames()
end)

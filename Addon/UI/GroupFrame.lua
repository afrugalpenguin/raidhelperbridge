local addonName, addon = ...

--------------------------------------------------------------------------------
-- Group Preview Frame — visual display of proposed group layout
--------------------------------------------------------------------------------

local ROW_HEIGHT = 20
local ICON_SIZE = 14
local PADDING = 8
local TITLE_HEIGHT = 24
local FRAME_WIDTH = 320
local BTN_HEIGHT = 26
local BTN_PADDING = 8

local groupFrame

-- Shared helpers (same pattern as CCFrame.lua)

local function SaveFramePosition(frame, key)
    local point, _, relPoint, x, y = frame:GetPoint()
    addon.charDb[key] = { point = point, relPoint = relPoint, x = x, y = y }
end

local function RestoreFramePosition(frame, key)
    local pos = addon.charDb and addon.charDb[key]
    if pos then
        frame:ClearAllPoints()
        frame:SetPoint(pos.point, UIParent, pos.relPoint, pos.x, pos.y)
    end
end

local function ClassColoredName(playerName, className)
    local color = addon.CLASS_COLORS[className]
    if color then
        return string.format("|cFF%02x%02x%02x%s|r",
            color.r * 255, color.g * 255, color.b * 255, playerName)
    end
    return playerName
end

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
-- Frame creation
--------------------------------------------------------------------------------

local function CreateGroupFrame()
    if groupFrame then return groupFrame end

    local frame = CreateFrame("Frame", "RHBGroupFrame", UIParent, "BackdropTemplate")
    frame:SetSize(FRAME_WIDTH, 200)
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
    titleText:SetText("Group Layout")
    frame.titleText = titleText

    -- Make draggable via title bar
    frame:SetMovable(true)
    frame:SetClampedToScreen(true)
    titleBar:EnableMouse(true)
    titleBar:RegisterForDrag("LeftButton")
    titleBar:SetScript("OnDragStart", function() frame:StartMoving() end)
    titleBar:SetScript("OnDragStop", function()
        frame:StopMovingOrSizing()
        SaveFramePosition(frame, "groupFramePos")
    end)

    -- Close button
    local closeBtn = CreateFrame("Button", nil, frame, "UIPanelCloseButton")
    closeBtn:SetPoint("TOPRIGHT", frame, "TOPRIGHT", -2, -2)
    closeBtn:SetScript("OnClick", function() frame:Hide() end)

    -- Resize grip
    frame:SetResizable(true)
    if frame.SetResizeBounds then
        frame:SetResizeBounds(200, 100, 500, 800)
    else
        frame:SetMinResize(200, 100)
        frame:SetMaxResize(500, 800)
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
        SaveFramePosition(frame, "groupFramePos")
    end)

    -- Content area
    local content = CreateFrame("Frame", nil, frame)
    content:SetPoint("TOPLEFT", frame, "TOPLEFT", PADDING, -(TITLE_HEIGHT + PADDING))
    content:SetPoint("RIGHT", frame, "RIGHT", -PADDING, 0)
    frame.content = content
    frame.rows = {}

    -- Sort button (anchored to bottom)
    local sortBtn = CreateFrame("Button", nil, frame, "UIPanelButtonTemplate")
    sortBtn:SetSize(120, BTN_HEIGHT)
    sortBtn:SetPoint("BOTTOM", frame, "BOTTOM", 0, BTN_PADDING)
    sortBtn:SetText("Sort Groups")
    sortBtn:SetScript("OnClick", function()
        addon:ApplyGroupLayout()
        -- Refresh to show updated state
        C_Timer.After(0.5, function()
            if groupFrame and groupFrame:IsShown() then
                RefreshGroupFrame()
            end
        end)
    end)
    frame.sortBtn = sortBtn

    -- Restore saved position
    RestoreFramePosition(frame, "groupFramePos")

    frame:Hide()
    groupFrame = frame
    return frame
end

--------------------------------------------------------------------------------
-- Row management
--------------------------------------------------------------------------------

local function GetRow(frame, index)
    if frame.rows[index] then
        frame.rows[index]:Show()
        return frame.rows[index]
    end

    local row = CreateFrame("Frame", nil, frame.content)
    row:SetHeight(ROW_HEIGHT)
    row:SetPoint("TOPLEFT", frame.content, "TOPLEFT", 0, -((index - 1) * ROW_HEIGHT))
    row:SetPoint("RIGHT", frame.content, "RIGHT", 0, 0)

    -- Left side: text (used for group headers and player names)
    local text = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
    text:SetPoint("LEFT", row, "LEFT", 0, 0)
    text:SetPoint("RIGHT", row, "RIGHT", 0, 0)
    text:SetJustifyH("LEFT")
    row.text = text

    frame.rows[index] = row
    return row
end

local function HideExtraRows(frame, startIndex)
    for i = startIndex, #frame.rows do
        frame.rows[i]:Hide()
    end
end

--------------------------------------------------------------------------------
-- Refresh
--------------------------------------------------------------------------------

function RefreshGroupFrame()
    local frame = groupFrame
    if not frame then return end

    local groups = addon.GroupManager:CalculateGroups()
    if not groups then
        HideExtraRows(frame, 1)
        return
    end

    local rowIdx = 0
    local contentWidth = FRAME_WIDTH - (PADDING * 2)
    -- Approximate characters that fit in a row (rough estimate for player name layout)
    local NAMES_PER_ROW = 3

    for groupNum, members in ipairs(groups) do
        if #members > 0 then
            -- Group header row
            rowIdx = rowIdx + 1
            local headerRow = GetRow(frame, rowIdx)
            headerRow.text:SetText("|cFFFFD100Group " .. groupNum .. "|r  |cFF888888(" .. #members .. ")|r")

            -- Player rows: pack 2-3 names per row
            local nameBuffer = {}
            for _, playerName in ipairs(members) do
                local className = GetPlayerClass(playerName)
                local colored = className and ClassColoredName(playerName, className) or playerName
                table.insert(nameBuffer, colored)

                if #nameBuffer >= NAMES_PER_ROW then
                    rowIdx = rowIdx + 1
                    local playerRow = GetRow(frame, rowIdx)
                    playerRow.text:SetText("  " .. table.concat(nameBuffer, "  "))
                    nameBuffer = {}
                end
            end

            -- Remaining names in buffer
            if #nameBuffer > 0 then
                rowIdx = rowIdx + 1
                local playerRow = GetRow(frame, rowIdx)
                playerRow.text:SetText("  " .. table.concat(nameBuffer, "  "))
            end

            -- Spacer row between groups
            rowIdx = rowIdx + 1
            local spacer = GetRow(frame, rowIdx)
            spacer.text:SetText("")
        end
    end

    HideExtraRows(frame, rowIdx + 1)

    -- Auto-resize height to fit content + button
    local contentHeight = rowIdx * ROW_HEIGHT
    local totalHeight = TITLE_HEIGHT + PADDING + contentHeight + BTN_PADDING + BTN_HEIGHT + BTN_PADDING
    frame:SetHeight(totalHeight)

    -- Update sort button state
    if frame.sortBtn then
        if addon:HasRaidAssist() then
            frame.sortBtn:Enable()
            frame.sortBtn:SetText("Sort Groups")
        elseif IsInRaid() then
            frame.sortBtn:Disable()
            frame.sortBtn:SetText("Need Assist")
        else
            frame.sortBtn:Disable()
            frame.sortBtn:SetText("Not in Raid")
        end
    end

    if rowIdx == 0 then
        rowIdx = 1
        local row = GetRow(frame, 1)
        row.text:SetText("|cFF888888No group data|r")
        HideExtraRows(frame, 2)
        frame:SetHeight(TITLE_HEIGHT + PADDING + ROW_HEIGHT + BTN_PADDING + BTN_HEIGHT + BTN_PADDING)
    end
end

--------------------------------------------------------------------------------
-- Public API
--------------------------------------------------------------------------------

function addon:ToggleGroupFrame()
    local frame = CreateGroupFrame()
    if frame:IsShown() then
        frame:Hide()
    else
        RefreshGroupFrame()
        frame:Show()
    end
end

function addon:RefreshGroupFrame()
    if groupFrame and groupFrame:IsShown() then
        RefreshGroupFrame()
    end
end

-- Auto-refresh on group roster changes
addon:RegisterModuleEvent("GROUP_ROSTER_UPDATE", function()
    addon:RefreshGroupFrame()
end)

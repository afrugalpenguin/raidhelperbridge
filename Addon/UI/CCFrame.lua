local addonName, addon = ...

-- CC Assignment Frames
-- Player frame: shows current player's own CC assignments
-- Leader frame: shows all CC assignments for the raid

local ROW_HEIGHT = 20
local LEADER_ROW_HEIGHT = 24
local ICON_SIZE = 16
local PADDING = 8
local TITLE_HEIGHT = 24
local DROPDOWN_WIDTH = 120
local REMOVE_BTN_SIZE = 16
local ADD_BTN_HEIGHT = 24

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
-- Leader CC Frame ("CC Assignments") — editable
--------------------------------------------------------------------------------

local leaderFrame

-- Dropdown frames (created once, reused)
local ccDropdownFrame = CreateFrame("Frame", "RHBCCDropdown", UIParent, "UIDropDownMenuTemplate")
ccDropdownFrame:Hide()
local addCCDropdownFrame = CreateFrame("Frame", "RHBCCAddDropdown", UIParent, "UIDropDownMenuTemplate")
addCCDropdownFrame:Hide()

-- Forward declaration
local RefreshLeaderCCFrame

local function CreateLeaderCCFrame()
    if leaderFrame then return leaderFrame end
    leaderFrame = CreateCCFrame("RHBLeaderCCFrame", "CC Assignments", 340, 180, "leaderCCFramePos")
    if leaderFrame.SetResizeBounds then
        leaderFrame:SetResizeBounds(300, 60, 500, 600)
    end
    return leaderFrame
end

-- Create or reuse an editable leader row
local function GetLeaderRow(frame, index)
    if frame.rows[index] then
        frame.rows[index]:Show()
        return frame.rows[index]
    end

    local row = CreateFrame("Frame", nil, frame.content)
    row:SetHeight(LEADER_ROW_HEIGHT)
    row:SetPoint("TOPLEFT", frame.content, "TOPLEFT", 0, -((index - 1) * LEADER_ROW_HEIGHT))
    row:SetPoint("RIGHT", frame.content, "RIGHT", 0, 0)

    -- Marker icon button (click to mark target + whisper)
    local btn = CreateFrame("Button", nil, row)
    btn:SetSize(ICON_SIZE, ICON_SIZE)
    btn:SetPoint("LEFT", row, "LEFT", 0, 0)
    btn:SetHighlightTexture("Interface\\Buttons\\ButtonHilight-Square", "ADD")
    btn:SetScript("OnEnter", function(self)
        GameTooltip:SetOwner(self, "ANCHOR_RIGHT")
        GameTooltip:SetText("Click to mark target and whisper")
        GameTooltip:Show()
    end)
    btn:SetScript("OnLeave", function() GameTooltip:Hide() end)
    row.btn = btn
    row.icon = btn

    -- Marker name label
    local markerLabel = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
    markerLabel:SetPoint("LEFT", btn, "RIGHT", 4, 0)
    markerLabel:SetWidth(50)
    markerLabel:SetJustifyH("LEFT")
    row.markerLabel = markerLabel

    -- Player name button (clickable, opens dropdown)
    local playerBtn = CreateFrame("Button", nil, row)
    playerBtn:SetSize(DROPDOWN_WIDTH, LEADER_ROW_HEIGHT - 4)
    playerBtn:SetPoint("LEFT", markerLabel, "RIGHT", 2, 0)
    playerBtn:SetHighlightTexture("Interface\\QuestFrame\\UI-QuestTitleHighlight", "ADD")

    local playerText = playerBtn:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
    playerText:SetPoint("LEFT", playerBtn, "LEFT", 2, 0)
    playerText:SetPoint("RIGHT", playerBtn, "RIGHT", -2, 0)
    playerText:SetJustifyH("LEFT")
    row.playerBtn = playerBtn
    row.playerText = playerText

    -- CC type button (clickable, opens dropdown)
    local ccBtn = CreateFrame("Button", nil, row)
    ccBtn:SetSize(100, LEADER_ROW_HEIGHT - 4)
    ccBtn:SetPoint("LEFT", playerBtn, "RIGHT", 2, 0)
    ccBtn:SetHighlightTexture("Interface\\QuestFrame\\UI-QuestTitleHighlight", "ADD")

    local ccLabel = ccBtn:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
    ccLabel:SetPoint("LEFT", ccBtn, "LEFT", 2, 0)
    ccLabel:SetPoint("RIGHT", ccBtn, "RIGHT", -2, 0)
    ccLabel:SetJustifyH("LEFT")
    ccLabel:SetTextColor(0.6, 0.6, 0.6)
    row.ccBtn = ccBtn
    row.ccLabel = ccLabel

    -- Remove button (X)
    local removeBtn = CreateFrame("Button", nil, row)
    removeBtn:SetSize(REMOVE_BTN_SIZE, REMOVE_BTN_SIZE)
    removeBtn:SetPoint("RIGHT", row, "RIGHT", 0, 0)
    removeBtn:SetNormalTexture("Interface\\Buttons\\UI-StopButton")
    removeBtn:SetHighlightTexture("Interface\\Buttons\\UI-StopButton", "ADD")
    removeBtn:SetScript("OnEnter", function(self)
        GameTooltip:SetOwner(self, "ANCHOR_RIGHT")
        GameTooltip:SetText("Remove this CC assignment")
        GameTooltip:Show()
    end)
    removeBtn:SetScript("OnLeave", function() GameTooltip:Hide() end)
    row.removeBtn = removeBtn

    frame.rows[index] = row
    return row
end

-- Remove a player from all CC assignments (one player = one marker)
local function RemovePlayerFromAllCC(playerName)
    local event = addon:GetCurrentEvent()
    if not event or not event.ccAssignments then return end

    for i = #event.ccAssignments, 1, -1 do
        local a = event.ccAssignments[i]
        for j = #a.assignments, 1, -1 do
            if a.assignments[j].playerName == playerName then
                table.remove(a.assignments, j)
            end
        end
        if #a.assignments == 0 then
            table.remove(event.ccAssignments, i)
        end
    end
end

-- Show player dropdown for a CC assignment row
local function ShowPlayerDropdown(row, assignmentIdx, markerAssignment)
    local cc = markerAssignment.assignments[assignmentIdx]
    local ccType = cc.ccType
    local requiredClass = addon.CC_ABILITIES[ccType] and addon.CC_ABILITIES[ccType].class

    UIDropDownMenu_Initialize(ccDropdownFrame, function()
        local event = addon:GetCurrentEvent()
        if not event or not event.players then return end

        local sorted = {}
        for _, p in ipairs(event.players) do
            tinsert(sorted, { name = p.name, class = p.class })
        end
        table.sort(sorted, function(a, b) return a.name < b.name end)

        for _, p in ipairs(sorted) do
            local info = UIDropDownMenu_CreateInfo()
            info.text = p.name
            info.notCheckable = true

            local color = addon.CLASS_COLORS[p.class]
            if color then
                info.colorCode = format("|cFF%02x%02x%02x", color.r * 255, color.g * 255, color.b * 255)
            end

            -- Amber warning if class can't do this CC
            local canDoCC = (requiredClass == nil) or (p.class == requiredClass)
            if not canDoCC then
                info.colorCode = "|cFFFF8800"
            end

            info.func = function()
                RemovePlayerFromAllCC(p.name)
                cc.playerName = p.name
                addon:RefreshCCFrames()
                CloseDropDownMenus()
            end
            UIDropDownMenu_AddButton(info)
        end
    end, "MENU")

    ToggleDropDownMenu(1, nil, ccDropdownFrame, row.playerBtn, 0, 0)
end

-- Show CC type dropdown for a CC assignment row
local function ShowCCTypeDropdown(row, assignmentIdx, markerAssignment)
    local cc = markerAssignment.assignments[assignmentIdx]

    UIDropDownMenu_Initialize(ccDropdownFrame, function()
        -- Sort CC types alphabetically
        local ccTypes = {}
        for ccType, data in pairs(addon.CC_ABILITIES) do
            if not data.soft and not data.aoe then
                tinsert(ccTypes, { id = ccType, data = data })
            end
        end
        table.sort(ccTypes, function(a, b) return a.id < b.id end)

        for _, entry in ipairs(ccTypes) do
            local info = UIDropDownMenu_CreateInfo()
            info.text = "|T" .. (entry.data.icon or "") .. ":14|t " .. entry.id
            info.notCheckable = true
            info.checked = (cc.ccType == entry.id)

            info.func = function()
                cc.ccType = entry.id
                addon:RefreshCCFrames()
                CloseDropDownMenus()
            end
            UIDropDownMenu_AddButton(info)
        end
    end, "MENU")

    ToggleDropDownMenu(1, nil, ccDropdownFrame, row.ccBtn, 0, 0)
end

-- Remove a single CC assignment; clean up empty markers
local function RemoveCCAssignment(markerAssignment, assignmentIdx)
    table.remove(markerAssignment.assignments, assignmentIdx)

    if #markerAssignment.assignments == 0 then
        local ccAssignments = addon.charDb.currentEvent.ccAssignments
        for i, a in ipairs(ccAssignments) do
            if a == markerAssignment then
                table.remove(ccAssignments, i)
                break
            end
        end
    end

    addon:RefreshCCFrames()
end

-- Remove a player from all CC assignments (one player = one marker)
-- Add a new CC assignment for a marker + ccType
local function AddNewCCAssignment(markerIdx, ccType)
    local event = addon:GetCurrentEvent()
    if not event then return end
    if not event.ccAssignments then
        event.ccAssignments = {}
    end

    local requiredClass = addon.CC_ABILITIES[ccType] and addon.CC_ABILITIES[ccType].class
    local playerName = "Unassigned"

    if event.players and requiredClass then
        for _, p in ipairs(event.players) do
            if p.class == requiredClass then
                local alreadyUsed = false
                for _, a in ipairs(event.ccAssignments) do
                    for _, cc in ipairs(a.assignments) do
                        if cc.playerName == p.name then
                            alreadyUsed = true
                            break
                        end
                    end
                    if alreadyUsed then break end
                end
                if not alreadyUsed then
                    playerName = p.name
                    break
                end
            end
        end
    end

    -- Find existing marker entry or create new one
    local existing
    for _, a in ipairs(event.ccAssignments) do
        if a.marker == markerIdx then
            existing = a
            break
        end
    end

    if existing then
        tinsert(existing.assignments, { ccType = ccType, playerName = playerName })
    else
        tinsert(event.ccAssignments, {
            marker = markerIdx,
            assignments = {{ ccType = ccType, playerName = playerName }},
        })
    end

    addon:RefreshCCFrames()
end

-- Show the add-marker menu (level 1: markers, level 2: CC types)
local function ShowAddCCMenu(anchorFrame)
    local function GetUsedMarkers()
        local used = {}
        local event = addon:GetCurrentEvent()
        if event and event.ccAssignments then
            for _, a in ipairs(event.ccAssignments) do
                used[a.marker] = true
            end
        end
        return used
    end

    UIDropDownMenu_Initialize(addCCDropdownFrame, function(_, level, menuList)
        level = level or 1

        if level == 1 then
            local used = GetUsedMarkers()
            for i = 1, 8 do
                local info = UIDropDownMenu_CreateInfo()
                local label = addon.MARKER_NAMES[i]
                if used[i] then
                    label = label .. " +"
                end
                info.text = "|T" .. addon.MARKER_ICONS[i] .. ":14|t " .. label
                info.notCheckable = true
                info.hasArrow = true
                info.menuList = i
                UIDropDownMenu_AddButton(info, level)
            end
        elseif level == 2 then
            local markerIdx = menuList
            -- Sort CC types alphabetically for consistency
            local ccTypes = {}
            for ccType, data in pairs(addon.CC_ABILITIES) do
                if not data.soft and not data.aoe then
                    tinsert(ccTypes, { id = ccType, data = data })
                end
            end
            table.sort(ccTypes, function(a, b) return a.id < b.id end)

            for _, entry in ipairs(ccTypes) do
                local info = UIDropDownMenu_CreateInfo()
                info.text = "|T" .. (entry.data.icon or "") .. ":14|t " .. entry.id
                info.notCheckable = true
                info.func = function()
                    AddNewCCAssignment(markerIdx, entry.id)
                    CloseDropDownMenus()
                end
                UIDropDownMenu_AddButton(info, level)
            end
        end
    end, "MENU")

    ToggleDropDownMenu(1, nil, addCCDropdownFrame, anchorFrame, 0, 0)
end

-- Ensure the "+ Add CC Assignment" button exists and is positioned
local function EnsureAddButton(frame, rowCount)
    if not frame.addBtn then
        local btn = CreateFrame("Button", nil, frame.content, "UIPanelButtonTemplate")
        btn:SetSize(160, ADD_BTN_HEIGHT)
        btn:SetText("+ Add marker")
        btn:SetScript("OnClick", function(self)
            ShowAddCCMenu(self)
        end)
        frame.addBtn = btn
    end

    frame.addBtn:ClearAllPoints()
    frame.addBtn:SetPoint("TOPLEFT", frame.content, "TOPLEFT", 0, -(rowCount * LEADER_ROW_HEIGHT + 4))
    frame.addBtn:Show()
end

RefreshLeaderCCFrame = function()
    local frame = leaderFrame
    if not frame then return end

    local event = addon:GetCurrentEvent()
    local rowIdx = 0

    if event and event.ccAssignments then
        for _, assignment in ipairs(event.ccAssignments) do
            local markerName = addon.MARKER_NAMES[assignment.marker] or "?"
            local markerIdx = assignment.marker
            for cIdx, cc in ipairs(assignment.assignments) do
                rowIdx = rowIdx + 1
                local row = GetLeaderRow(frame, rowIdx)
                row.btn:SetNormalTexture(addon.MARKER_ICONS[markerIdx])

                -- Wire click: mark target + whisper ALL players on this marker
                local capturedMarkerAssignment = assignment
                row.btn:SetScript("OnClick", function()
                    if UnitExists("target") then
                        SetRaidTarget("target", markerIdx)
                    end
                    local mobName = UnitExists("target") and UnitName("target") or nil
                    for _, a in ipairs(capturedMarkerAssignment.assignments) do
                        addon.CCManager:SendWhisper(a.playerName, markerIdx, mobName, a.ccType, true)
                    end
                end)

                -- Marker name
                row.markerLabel:SetText(markerName)

                -- Player name with class colour or amber warning
                local className = GetPlayerClass(cc.playerName)
                local requiredClass = addon.CC_ABILITIES[cc.ccType] and addon.CC_ABILITIES[cc.ccType].class
                local canDoCC = (requiredClass == nil) or (className == requiredClass)

                if className and canDoCC then
                    row.playerText:SetText(ClassColoredName(cc.playerName, className))
                elseif className and not canDoCC then
                    row.playerText:SetText("|cFFFF8800" .. cc.playerName .. "|r")
                else
                    row.playerText:SetText(cc.playerName)
                end

                -- Wire player dropdown
                local capturedAssignment = assignment
                local capturedCIdx = cIdx
                row.playerBtn:SetScript("OnClick", function()
                    ShowPlayerDropdown(row, capturedCIdx, capturedAssignment)
                end)

                -- CC type
                row.ccLabel:SetText("(" .. cc.ccType .. ")")

                -- Wire CC type dropdown
                row.ccBtn:SetScript("OnClick", function()
                    ShowCCTypeDropdown(row, capturedCIdx, capturedAssignment)
                end)

                -- Wire remove button
                row.removeBtn:SetScript("OnClick", function()
                    RemoveCCAssignment(capturedAssignment, capturedCIdx)
                end)
            end
        end
    end

    HideExtraRows(frame, rowIdx + 1)
    EnsureAddButton(frame, rowIdx)

    -- Auto-resize: rows + add button + padding
    local contentHeight = math.max(rowIdx, 0) * LEADER_ROW_HEIGHT + ADD_BTN_HEIGHT + 8
    local newHeight = TITLE_HEIGHT + PADDING + contentHeight + PADDING
    frame:SetHeight(newHeight)
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

local function RefreshMyCCButton()
    local btn = addon.tabButtons and addon.tabButtons["My CC"]
    if not btn or not btn.markerIcon then
        addon:Debug("My CC button: no button or markerIcon")
        return
    end

    local event = addon:GetCurrentEvent()
    if not event or not event.ccAssignments then
        addon:Debug("My CC button: no event or ccAssignments")
        btn.markerIcon:Hide()
        return
    end

    local myName = UnitName("player")
    addon:Debug("My CC button: looking for '" .. myName .. "' in " .. #event.ccAssignments .. " markers")
    for _, assignment in ipairs(event.ccAssignments) do
        for _, cc in ipairs(assignment.assignments) do
            addon:Debug("  checking: '" .. cc.playerName .. "'")
            if cc.playerName == myName then
                btn.markerIcon:SetTexture(addon.MARKER_ICONS[assignment.marker])
                btn.markerIcon:Show()
                return
            end
        end
    end

    btn.markerIcon:Hide()
end

function addon:RefreshCCFrames()
    if playerFrame and playerFrame:IsShown() then
        RefreshPlayerCCFrame()
    end
    if leaderFrame and leaderFrame:IsShown() then
        RefreshLeaderCCFrame()
    end
    RefreshMyCCButton()
end

-- Auto-refresh on group roster changes
addon:RegisterModuleEvent("GROUP_ROSTER_UPDATE", function()
    addon:RefreshCCFrames()
end)

-- Refresh My CC button on login (picks up saved assignment data)
addon:RegisterModuleEvent("PLAYER_LOGIN", function()
    RefreshMyCCButton()
end)

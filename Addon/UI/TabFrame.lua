local addonName, addon = ...

--------------------------------------------------------------------------------
-- Screen-edge Tab — HidingBar-style quick-action panel
--------------------------------------------------------------------------------

local TAB_WIDTH_COLLAPSED = 14
local TAB_WIDTH_EXPANDED = 40
local TAB_HEIGHT = 20
local BTN_WIDTH = 140
local BTN_HEIGHT = 22
local PANEL_PAD = 6
local ICON_SIZE = 16
local HIDE_DELAY = 0.2

-- Button definitions: label, method name, icon texture
local BUTTONS = {
    { label = "Status",   method = "ShowStatus",            icon = "Interface\\Icons\\INV_Misc_Note_05" },
    { label = "Import",   method = "ShowImportDialog",      icon = "Interface\\Icons\\INV_Letter_15" },
    { label = "CC View",  method = "ToggleLeaderCCFrame",   icon = "Interface\\Icons\\Spell_Nature_Polymorph" },
    { label = "My CC",    method = "TogglePlayerCCFrame",   icon = "Interface\\Icons\\Ability_Creature_Cursed_04" },
    { label = "Groups",   method = "ToggleGroupFrame",       icon = "Interface\\Icons\\Achievement_GuildPerk_EverybodysFriend" },
    { label = "Invite",   method = "SendRaidInvites",       icon = "Interface\\Icons\\INV_Letter_04" },
    { label = "Sort",     method = "ApplyGroupLayout",      icon = "Interface\\Icons\\INV_Misc_GroupNeedMore" },
}

local tab, panel
local hideTimer
local CollapseTab  -- forward reference

--------------------------------------------------------------------------------
-- Hide / show helpers
--------------------------------------------------------------------------------

local function CancelHideTimer()
    if hideTimer then
        hideTimer:Cancel()
        hideTimer = nil
    end
end

local function ScheduleHide()
    CancelHideTimer()
    hideTimer = C_Timer.NewTimer(HIDE_DELAY, function()
        hideTimer = nil
        if panel then panel:Hide() end
        if CollapseTab then CollapseTab() end
    end)
end

local function ShowPanel()
    CancelHideTimer()
    if panel then panel:Show() end
end

--------------------------------------------------------------------------------
-- Position persistence
--------------------------------------------------------------------------------

local function SaveTabPosition()
    local point, _, relPoint, x, y = tab:GetPoint()
    addon.charDb.tabFramePos = { point = point, relPoint = relPoint, x = x, y = y }
end

local function RestoreTabPosition()
    local pos = addon.charDb and addon.charDb.tabFramePos
    if pos then
        tab:ClearAllPoints()
        tab:SetPoint(pos.point, UIParent, pos.relPoint, pos.x, pos.y)
    end
end

--------------------------------------------------------------------------------
-- Build UI (called once on PLAYER_LOGIN)
--------------------------------------------------------------------------------

local function CreateTab()
    if tab then return end

    -- Collapsed tab ----------------------------------------------------------
    tab = CreateFrame("Frame", "RHBTab", UIParent, "BackdropTemplate")
    tab:SetSize(TAB_WIDTH_COLLAPSED, TAB_HEIGHT)
    tab:SetPoint("TOPLEFT", UIParent, "TOPLEFT", 0, -20)
    tab:SetFrameStrata("HIGH")
    tab:SetClampedToScreen(true)
    tab:SetMovable(true)
    tab:EnableMouse(true)
    tab:RegisterForDrag("LeftButton")
    tab:SetBackdrop({
        bgFile   = "Interface\\DialogFrame\\UI-DialogBox-Background",
        edgeFile = "Interface\\Tooltips\\UI-Tooltip-Border",
        tile = true, tileSize = 16, edgeSize = 12,
        insets = { left = 2, right = 2, top = 2, bottom = 2 },
    })
    tab:SetBackdropColor(0, 0, 0, 0.85)

    -- Chevron (visible when collapsed)
    local chevron = tab:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
    chevron:SetPoint("CENTER")
    chevron:SetText("|cFFFFD100>|r")

    -- Label (visible when expanded)
    local label = tab:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
    label:SetPoint("CENTER")
    label:SetText("|cFFFFD100RHB|r")
    label:Hide()

    local function ExpandTab()
        tab:SetWidth(TAB_WIDTH_EXPANDED)
        chevron:Hide()
        label:Show()
    end

    CollapseTab = function()
        tab:SetWidth(TAB_WIDTH_COLLAPSED)
        label:Hide()
        chevron:Show()
    end

    -- Drag: constrain to top edge
    tab:SetScript("OnDragStart", function(self) self:StartMoving() end)
    tab:SetScript("OnDragStop", function(self)
        self:StopMovingOrSizing()
        -- Snap back to top edge, keep horizontal position
        local _, _, _, x, _ = self:GetPoint()
        self:ClearAllPoints()
        self:SetPoint("TOPLEFT", UIParent, "TOPLEFT", math.max(0, x), -20)
        SaveTabPosition()
    end)

    -- Mouseover → expand tab + show panel
    tab:SetScript("OnEnter", function() ExpandTab(); ShowPanel() end)
    tab:SetScript("OnLeave", function() ScheduleHide() end)

    -- Expanded panel ---------------------------------------------------------
    local panelHeight = (#BUTTONS * BTN_HEIGHT) + (PANEL_PAD * 2)
    panel = CreateFrame("Frame", "RHBTabPanel", tab, "BackdropTemplate")
    panel:SetSize(BTN_WIDTH + PANEL_PAD * 2, panelHeight)
    panel:SetPoint("TOPLEFT", tab, "BOTTOMLEFT", 0, 0)
    panel:SetFrameStrata("HIGH")
    panel:EnableMouse(true)
    panel:SetBackdrop({
        bgFile   = "Interface\\DialogFrame\\UI-DialogBox-Background",
        edgeFile = "Interface\\Tooltips\\UI-Tooltip-Border",
        tile = true, tileSize = 16, edgeSize = 12,
        insets = { left = 2, right = 2, top = 2, bottom = 2 },
    })
    panel:SetBackdropColor(0, 0, 0, 0.85)

    panel:SetScript("OnEnter", function() CancelHideTimer() end)
    panel:SetScript("OnLeave", function() ScheduleHide() end)

    -- Buttons ----------------------------------------------------------------
    for i, info in ipairs(BUTTONS) do
        local btn = CreateFrame("Button", nil, panel)
        btn:SetSize(BTN_WIDTH, BTN_HEIGHT)
        btn:SetPoint("TOPLEFT", panel, "TOPLEFT", PANEL_PAD, -PANEL_PAD - (i - 1) * BTN_HEIGHT)

        -- Hover highlight
        local hl = btn:CreateTexture(nil, "HIGHLIGHT")
        hl:SetAllPoints()
        hl:SetColorTexture(1, 1, 1, 0.1)

        -- Icon
        local icon = btn:CreateTexture(nil, "ARTWORK")
        icon:SetSize(ICON_SIZE, ICON_SIZE)
        icon:SetPoint("LEFT", btn, "LEFT", 4, 0)
        icon:SetTexture(info.icon)

        -- Label
        local text = btn:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
        text:SetPoint("LEFT", icon, "RIGHT", 6, 0)
        text:SetText(info.label)
        text:SetJustifyH("LEFT")

        btn:SetScript("OnClick", function()
            if addon[info.method] then
                addon[info.method](addon)
            end
        end)

        -- Keep panel open while hovering a button
        btn:SetScript("OnEnter", function() CancelHideTimer() end)
        btn:SetScript("OnLeave", function() ScheduleHide() end)
    end

    panel:Hide()

    -- Restore saved position
    RestoreTabPosition()
end

-- Hook into PLAYER_LOGIN via the existing event dispatcher
addon:RegisterModuleEvent("PLAYER_LOGIN", function()
    CreateTab()
end)

local addonName, addon = ...

--------------------------------------------------------------------------------
-- Tutorial — step-through walkthrough for new users
--------------------------------------------------------------------------------

local tutorialActive = false
local stashedEvent = nil  -- holds real event data while tutorial is running

--------------------------------------------------------------------------------
-- Mock roster (25-man raid with CC assignments)
--------------------------------------------------------------------------------

local MOCK_EVENT = {
    version = 1,
    eventId = "tutorial-mock",
    eventName = "Tutorial Raid (Example)",
    eventTime = 0,
    players = {
        -- Group 1
        { name = "Thunderhorn",  class = "WARRIOR", role = "tank",   spec = "protection" },
        { name = "Brightheal",   class = "PALADIN", role = "healer", spec = "holy" },
        { name = "Moonfire",     class = "DRUID",   role = "rdps",   spec = "balance" },
        { name = "Frostweave",   class = "MAGE",    role = "rdps",   spec = "frost" },
        { name = "Shadowstab",   class = "ROGUE",   role = "mdps",   spec = "combat" },
        -- Group 2
        { name = "Earthtotem",   class = "SHAMAN",  role = "healer", spec = "restoration" },
        { name = "Holygrace",    class = "PRIEST",  role = "healer", spec = "holy" },
        { name = "Felblaze",     class = "WARLOCK", role = "rdps",   spec = "affliction" },
        { name = "Arcaneshot",   class = "HUNTER",  role = "rdps",   spec = "beastmastery" },
        { name = "Darkblade",    class = "ROGUE",   role = "mdps",   spec = "combat" },
        -- Group 3
        { name = "Ironshield",   class = "PALADIN", role = "tank",   spec = "protection" },
        { name = "Naturemend",   class = "DRUID",   role = "healer", spec = "restoration" },
        { name = "Pyroblast",    class = "MAGE",    role = "rdps",   spec = "fire" },
        { name = "Windrunner",   class = "HUNTER",  role = "rdps",   spec = "marksmanship" },
        { name = "Demonbolt",    class = "WARLOCK", role = "rdps",   spec = "demonology" },
        -- Group 4
        { name = "Stormcall",    class = "SHAMAN",  role = "rdps",   spec = "elemental" },
        { name = "Lightbringer", class = "PALADIN", role = "healer", spec = "holy" },
        { name = "Backstab",     class = "ROGUE",   role = "mdps",   spec = "combat" },
        { name = "Starfall",     class = "DRUID",   role = "rdps",   spec = "balance" },
        { name = "Soulrain",     class = "PRIEST",  role = "rdps",   spec = "shadow" },
        -- Group 5
        { name = "Bearwall",     class = "DRUID",   role = "tank",   spec = "feral" },
        { name = "Chainheal",    class = "SHAMAN",  role = "healer", spec = "restoration" },
        { name = "Icebarrage",   class = "MAGE",    role = "rdps",   spec = "frost" },
        { name = "Rapidfire",    class = "HUNTER",  role = "rdps",   spec = "marksmanship" },
        { name = "Chaosbolt",    class = "WARLOCK", role = "rdps",   spec = "destruction" },
    },
    groupAssignments = {
        { groupNumber = 1, players = { "Thunderhorn", "Brightheal", "Moonfire", "Frostweave", "Shadowstab" } },
        { groupNumber = 2, players = { "Earthtotem", "Holygrace", "Felblaze", "Arcaneshot", "Darkblade" } },
        { groupNumber = 3, players = { "Ironshield", "Naturemend", "Pyroblast", "Windrunner", "Demonbolt" } },
        { groupNumber = 4, players = { "Stormcall", "Lightbringer", "Backstab", "Starfall", "Soulrain" } },
        { groupNumber = 5, players = { "Bearwall", "Chainheal", "Icebarrage", "Rapidfire", "Chaosbolt" } },
    },
    ccAssignments = {
        { marker = 6, assignments = {{ ccType = "polymorph",    playerName = "Frostweave" }} },
        { marker = 5, assignments = {{ ccType = "sap",           playerName = "Darkblade" }} },
        { marker = 4, assignments = {{ ccType = "shackle",       playerName = "Holygrace" }} },
        { marker = 3, assignments = {{ ccType = "freezingtrap",  playerName = "Arcaneshot" }} },
    },
}

--------------------------------------------------------------------------------
-- Mock data lifecycle
--------------------------------------------------------------------------------

local function LoadMockData()
    stashedEvent = addon.charDb.currentEvent
    local mock = CopyTable(MOCK_EVENT)
    mock.eventTime = time() + 86400
    addon.charDb.currentEvent = mock
    addon:Debug("Tutorial: mock data loaded")
end

local function RestoreMockData()
    addon.charDb.currentEvent = stashedEvent
    stashedEvent = nil
    addon:Debug("Tutorial: original event data restored")
end

--------------------------------------------------------------------------------
-- Step definitions
--------------------------------------------------------------------------------

local steps = {
    {
        id = "welcome",
        title = "Welcome to RaidHelperBridge",
        description = "RaidHelperBridge connects your Discord Raid-Helper signups to the game. Build groups on the website, generate an import string, and paste it here to invite, sort, and manage CC assignments \226\128\148 all without leaving the game.",
        tip = "This tutorial uses example data so you can see each feature in action.",
    },
    {
        id = "tabframe",
        title = "The Tab Frame",
        description = "This small tab sits at the edge of your screen. Hover over it to reveal action buttons for importing, inviting, sorting, and more. You can drag it along the screen edge to reposition it.",
        getFrame = function() return _G["RHBTab"] end,
    },
    {
        id = "import",
        title = "Importing Data",
        description = "Visit the RaidHelperBridge website, paste your Raid-Helper event link, build your groups, then copy the import string. In-game, click the Import button on the tab or type /rhb import to paste it in.",
        tip = "You can also right-click the minimap button to open the import dialog.",
        getFrame = function() return _G["RHBTab"] end,
    },
    {
        id = "invite_sort",
        title = "Inviting & Sorting",
        description = "Once data is imported, click Invite to send raid invites to all event players. After everyone is in the raid, click Sort to move players into their assigned groups.",
        getFrame = function() return _G["RHBTab"] end,
    },
    {
        id = "cc",
        title = "CC Assignments",
        description = "The CC frame shows crowd control assignments. Each player sees their own assignment, and raid leaders can view everyone's assignments at a glance.",
        tip = "When you place a raid marker, the assigned player is automatically whispered their CC target.",
        getFrame = function() return _G["RHBLeaderCCFrame"] end,
        action = function()
            -- Ensure the CC frame is open so the user can see it
            if not (_G["RHBLeaderCCFrame"] and _G["RHBLeaderCCFrame"]:IsShown()) then
                addon:ToggleLeaderCCFrame()
            end
        end,
        cleanup = function()
            if _G["RHBLeaderCCFrame"] and _G["RHBLeaderCCFrame"]:IsShown() then
                _G["RHBLeaderCCFrame"]:Hide()
            end
        end,
    },
    {
        id = "groups",
        title = "Group Preview",
        description = "The Groups frame shows the planned group layout with class-coloured names. Use this to check assignments before sorting.",
        getFrame = function() return _G["RHBGroupFrame"] end,
        action = function()
            -- Ensure the group frame is open so the user can see it
            if not (_G["RHBGroupFrame"] and _G["RHBGroupFrame"]:IsShown()) then
                addon:ToggleGroupFrame()
            end
        end,
        cleanup = function()
            if _G["RHBGroupFrame"] and _G["RHBGroupFrame"]:IsShown() then
                _G["RHBGroupFrame"]:Hide()
            end
        end,
    },
    {
        id = "complete",
        title = "All Done!",
        description = "You're all set! Use /rhb help to see all available commands. Visit the website any time to set up a new event.",
        tip = "The tutorial can be replayed with /rhb tutorial.",
    },
}

--------------------------------------------------------------------------------
-- Highlight border (glowing blue border around target frame)
--------------------------------------------------------------------------------

local highlightFrame

local function CreateHighlightFrame()
    if highlightFrame then return highlightFrame end

    local frame = CreateFrame("Frame", "RHBTutorialHighlight", UIParent, "BackdropTemplate")
    frame:SetFrameStrata("FULLSCREEN_DIALOG")
    frame:SetFrameLevel(100)
    frame:SetBackdrop({
        edgeFile = "Interface\\Tooltips\\UI-Tooltip-Border",
        edgeSize = 16,
        insets = { left = 4, right = 4, top = 4, bottom = 4 },
    })
    frame:SetBackdropBorderColor(0.4, 0.8, 1, 1)

    -- Pulse animation via OnUpdate
    local elapsed = 0
    frame:SetScript("OnUpdate", function(self, delta)
        elapsed = (elapsed + delta) % 100
        local alpha = math.sin(elapsed * 3) * 0.3 + 0.7
        self:SetBackdropBorderColor(0.4, 0.8, 1, alpha)
    end)

    frame:Hide()
    highlightFrame = frame
    return frame
end

local function ShowHighlight(targetFrame)
    if not targetFrame then
        if highlightFrame then highlightFrame:Hide() end
        return
    end

    local hl = CreateHighlightFrame()
    local pad = 6
    hl:ClearAllPoints()
    hl:SetPoint("TOPLEFT", targetFrame, "TOPLEFT", -pad, pad)
    hl:SetPoint("BOTTOMRIGHT", targetFrame, "BOTTOMRIGHT", pad, -pad)
    hl:Show()
end

local function HideHighlight()
    if highlightFrame then highlightFrame:Hide() end
end

--------------------------------------------------------------------------------
-- Tutorial panel (main explanation frame)
--------------------------------------------------------------------------------

local PANEL_WIDTH = 400
local PANEL_HEIGHT = 220
local PANEL_PAD = 12
local tutorialPanel
local currentStep = 1

-- Forward declaration
local ShowStep

local function CreateTutorialPanel()
    if tutorialPanel then return tutorialPanel end

    local frame = CreateFrame("Frame", "RHBTutorialPanel", UIParent, "BackdropTemplate")
    frame:SetSize(PANEL_WIDTH, PANEL_HEIGHT)
    frame:SetPoint("TOP", UIParent, "TOP", 0, -80)
    frame:SetFrameStrata("FULLSCREEN_DIALOG")
    frame:SetFrameLevel(101)
    frame:SetBackdrop({
        bgFile   = "Interface\\DialogFrame\\UI-DialogBox-Background",
        edgeFile = "Interface\\DialogFrame\\UI-DialogBox-Border",
        tile = true, tileSize = 32, edgeSize = 16,
        insets = { left = 4, right = 4, top = 4, bottom = 4 },
    })
    frame:SetBackdropColor(0, 0, 0, 0.92)

    -- Make draggable
    frame:SetMovable(true)
    frame:SetClampedToScreen(true)
    frame:EnableMouse(true)
    frame:RegisterForDrag("LeftButton")
    frame:SetScript("OnDragStart", function(self) self:StartMoving() end)
    frame:SetScript("OnDragStop", function(self) self:StopMovingOrSizing() end)

    -- Step counter (top-left)
    local stepCounter = frame:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
    stepCounter:SetPoint("TOPLEFT", frame, "TOPLEFT", PANEL_PAD, -PANEL_PAD)
    stepCounter:SetTextColor(0.6, 0.6, 0.6)
    frame.stepCounter = stepCounter

    -- Title (below counter)
    local title = frame:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge")
    title:SetPoint("TOPLEFT", stepCounter, "BOTTOMLEFT", 0, -4)
    title:SetPoint("RIGHT", frame, "RIGHT", -PANEL_PAD, 0)
    title:SetTextColor(1, 0.82, 0)
    title:SetJustifyH("LEFT")
    frame.title = title

    -- Description (below title, above tip area)
    local desc = frame:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
    desc:SetPoint("TOPLEFT", title, "BOTTOMLEFT", 0, -8)
    desc:SetPoint("RIGHT", frame, "RIGHT", -PANEL_PAD, 0)
    desc:SetMaxLines(6)
    desc:SetJustifyH("LEFT")
    desc:SetWordWrap(true)
    desc:SetSpacing(2)
    frame.desc = desc

    -- Tip (above buttons, yellow)
    local tip = frame:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
    tip:SetPoint("BOTTOMLEFT", frame, "BOTTOMLEFT", PANEL_PAD, 44)
    tip:SetPoint("RIGHT", frame, "RIGHT", -PANEL_PAD, 0)
    tip:SetTextColor(1, 0.82, 0, 0.9)
    tip:SetJustifyH("LEFT")
    tip:SetWordWrap(true)
    frame.tip = tip

    -- Back button (bottom-left)
    local backBtn = CreateFrame("Button", nil, frame, "UIPanelButtonTemplate")
    backBtn:SetSize(80, 22)
    backBtn:SetPoint("BOTTOMLEFT", frame, "BOTTOMLEFT", PANEL_PAD, PANEL_PAD)
    backBtn:SetText("Back")
    backBtn:SetScript("OnClick", function()
        if currentStep > 1 then
            ShowStep(currentStep - 1)
        end
    end)
    frame.backBtn = backBtn

    -- Skip button (bottom-centre)
    local skipBtn = CreateFrame("Button", nil, frame, "UIPanelButtonTemplate")
    skipBtn:SetSize(100, 22)
    skipBtn:SetPoint("BOTTOM", frame, "BOTTOM", 0, PANEL_PAD)
    skipBtn:SetText("Skip Tutorial")
    skipBtn:SetScript("OnClick", function()
        addon:EndTutorial()
    end)
    frame.skipBtn = skipBtn

    -- Next button (bottom-right)
    local nextBtn = CreateFrame("Button", nil, frame, "UIPanelButtonTemplate")
    nextBtn:SetSize(80, 22)
    nextBtn:SetPoint("BOTTOMRIGHT", frame, "BOTTOMRIGHT", -PANEL_PAD, PANEL_PAD)
    nextBtn:SetText("Next")
    nextBtn:SetScript("OnClick", function()
        if currentStep < #steps then
            ShowStep(currentStep + 1)
        else
            addon:EndTutorial()
        end
    end)
    frame.nextBtn = nextBtn

    frame:Hide()
    tutorialPanel = frame
    return frame
end

--------------------------------------------------------------------------------
-- Navigation
--------------------------------------------------------------------------------

ShowStep = function(stepNum)
    local step = steps[stepNum]
    if not step then return end

    -- Clean up previous step
    local prevStep = steps[currentStep]
    if prevStep and prevStep.cleanup then
        prevStep.cleanup()
    end

    currentStep = stepNum

    local panel = CreateTutorialPanel()

    -- Update content
    panel.stepCounter:SetText("Step " .. stepNum .. " of " .. #steps)
    panel.title:SetText(step.title)
    panel.desc:SetText(step.description)

    if step.tip then
        panel.tip:SetText("Tip: " .. step.tip)
        panel.tip:Show()
    else
        panel.tip:SetText("")
        panel.tip:Hide()
    end

    -- Button visibility
    if stepNum <= 1 then
        panel.backBtn:Hide()
    else
        panel.backBtn:Show()
    end

    if stepNum >= #steps then
        panel.nextBtn:SetText("Finish")
    else
        panel.nextBtn:SetText("Next")
    end

    -- Run step action (e.g., open a frame)
    if step.action then
        step.action()
    end

    -- Highlight target frame
    local targetFrame = step.getFrame and step.getFrame()
    ShowHighlight(targetFrame)

    panel:Show()
end

--------------------------------------------------------------------------------
-- Public API
--------------------------------------------------------------------------------

function addon:StartTutorial()
    if tutorialActive then
        ShowStep(currentStep)
        return
    end
    LoadMockData()
    tutorialActive = true
    currentStep = 1
    ShowStep(1)
    addon:Print("Tutorial started. Follow the steps to learn the basics!")
end

function addon:EndTutorial()
    -- Clean up current step
    local step = steps[currentStep]
    if step and step.cleanup then
        step.cleanup()
    end

    HideHighlight()
    if tutorialPanel then tutorialPanel:Hide() end

    RestoreMockData()
    tutorialActive = false
    addon.charDb.tutorialComplete = true
    addon:Print("Tutorial complete! Use /rhb help for all commands.")
end

function addon:IsTutorialActive()
    return tutorialActive
end

--------------------------------------------------------------------------------
-- Auto-start on first login
--------------------------------------------------------------------------------

function addon:InitTutorial()
    if not addon.charDb.tutorialComplete then
        C_Timer.After(2, function()
            addon:StartTutorial()
        end)
    end
end

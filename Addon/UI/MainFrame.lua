local addonName, addon = ...

local LDB = LibStub("LibDataBroker-1.1")
local LDBIcon = LibStub("LibDBIcon-1.0")

local dataObj = LDB:NewDataObject("RaidHelperBridge", {
    type = "launcher",
    text = "RHB",
    icon = "Interface\\Icons\\INV_Misc_GroupLooking",
    OnClick = function(self, button)
        if button == "LeftButton" then
            if IsShiftKeyDown() then
                addon:ToggleLeaderCCFrame()
            else
                addon:ShowStatus()
            end
        elseif button == "RightButton" then
            addon:ShowImportDialog()
        end
    end,
    OnTooltipShow = function(tooltip)
        tooltip:AddLine("Raid Helper Bridge")
        local event = addon:GetCurrentEvent()
        if event then
            tooltip:AddLine(event.eventName, 1, 1, 1)
            tooltip:AddLine(#event.players .. " players", 0.7, 0.7, 0.7)
        else
            tooltip:AddLine("No event loaded", 0.7, 0.7, 0.7)
        end
        tooltip:AddLine(" ")
        tooltip:AddLine("Left-click: Status", 0, 1, 0)
        tooltip:AddLine("Shift-click: CC Assignments", 0, 1, 0)
        tooltip:AddLine("Right-click: Import", 0, 1, 0)
    end,
})

addon.frame:HookScript("OnEvent", function(self, event, arg1)
    if event == "PLAYER_LOGIN" then
        LDBIcon:Register("RaidHelperBridge", dataObj, addon.db.minimap)
    end
end)

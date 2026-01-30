local addonName, addon = ...

-- Main UI Frame (placeholder)
-- Full implementation would include:
-- - Minimap button
-- - Main configuration panel
-- - Event overview

-- Create minimap button (basic implementation)
local function CreateMinimapButton()
    local button = CreateFrame("Button", "RHBMinimapButton", Minimap)
    button:SetSize(32, 32)
    button:SetFrameStrata("MEDIUM")
    button:SetPoint("TOPLEFT", Minimap, "TOPLEFT", 0, 0)
    
    button:SetNormalTexture("Interface\\Icons\\INV_Misc_GroupLooking")
    button:SetHighlightTexture("Interface\\Minimap\\UI-Minimap-ZoomButton-Highlight")
    
    button:SetScript("OnClick", function(self, btn)
        if btn == "LeftButton" then
            addon:ShowStatus()
        elseif btn == "RightButton" then
            addon:ShowImportDialog()
        end
    end)
    
    button:SetScript("OnEnter", function(self)
        GameTooltip:SetOwner(self, "ANCHOR_LEFT")
        GameTooltip:AddLine("Raid Helper Bridge")
        GameTooltip:AddLine("Left-click: Show status", 1, 1, 1)
        GameTooltip:AddLine("Right-click: Import event", 1, 1, 1)
        GameTooltip:Show()
    end)
    
    button:SetScript("OnLeave", function()
        GameTooltip:Hide()
    end)
    
    return button
end

-- Initialize UI on load
addon.frame:HookScript("OnEvent", function(self, event, arg1)
    if event == "PLAYER_LOGIN" then
        CreateMinimapButton()
    end
end)

local addonName, addon = ...

-- Import string parsing
-- Format: !RHB!<base64-deflate-compressed-json>

-- Base64 decoding
local b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
local function base64decode(data)
    data = data:gsub('[^'..b64chars..'=]', '')
    return (data:gsub('.', function(x)
        if x == '=' then return '' end
        local r, f = '', (b64chars:find(x) - 1)
        for i = 6, 1, -1 do
            r = r .. (f % 2^i - f % 2^(i-1) > 0 and '1' or '0')
        end
        return r
    end):gsub('%d%d%d?%d?%d?%d?%d?%d?', function(x)
        if #x ~= 8 then return '' end
        local c = 0
        for i = 1, 8 do
            c = c + (x:sub(i, i) == '1' and 2^(8 - i) or 0)
        end
        return string.char(c)
    end))
end

-- Simple JSON parser (subset needed for our format)
-- For a real addon, you'd use a proper JSON library
local function parseJSON(str)
    -- This is a simplified parser - in production use a real JSON library
    -- like json.lua from rxi/json.lua
    
    local pos = 1
    local function skipWhitespace()
        while pos <= #str and str:sub(pos, pos):match("%s") do
            pos = pos + 1
        end
    end
    
    local function parseValue()
        skipWhitespace()
        local char = str:sub(pos, pos)
        
        if char == '"' then
            -- String
            pos = pos + 1
            local startPos = pos
            while pos <= #str and str:sub(pos, pos) ~= '"' do
                if str:sub(pos, pos) == '\\' then
                    pos = pos + 1
                end
                pos = pos + 1
            end
            local value = str:sub(startPos, pos - 1)
            pos = pos + 1
            -- Handle escape sequences
            value = value:gsub("\\n", "\n"):gsub("\\r", "\r"):gsub("\\t", "\t"):gsub('\\"', '"'):gsub("\\\\", "\\")
            return value
            
        elseif char == '{' then
            -- Object
            pos = pos + 1
            local obj = {}
            skipWhitespace()
            while str:sub(pos, pos) ~= '}' do
                skipWhitespace()
                -- Parse key
                if str:sub(pos, pos) ~= '"' then
                    break
                end
                pos = pos + 1
                local keyStart = pos
                while str:sub(pos, pos) ~= '"' do
                    pos = pos + 1
                end
                local key = str:sub(keyStart, pos - 1)
                pos = pos + 1
                
                skipWhitespace()
                pos = pos + 1 -- skip ':'
                
                obj[key] = parseValue()
                
                skipWhitespace()
                if str:sub(pos, pos) == ',' then
                    pos = pos + 1
                end
            end
            pos = pos + 1
            return obj
            
        elseif char == '[' then
            -- Array
            pos = pos + 1
            local arr = {}
            skipWhitespace()
            while str:sub(pos, pos) ~= ']' do
                table.insert(arr, parseValue())
                skipWhitespace()
                if str:sub(pos, pos) == ',' then
                    pos = pos + 1
                end
            end
            pos = pos + 1
            return arr
            
        elseif char:match("[%d%-]") then
            -- Number
            local startPos = pos
            if str:sub(pos, pos) == '-' then
                pos = pos + 1
            end
            while pos <= #str and str:sub(pos, pos):match("[%d%.eE%+%-]") do
                pos = pos + 1
            end
            return tonumber(str:sub(startPos, pos - 1))
            
        elseif str:sub(pos, pos + 3) == "true" then
            pos = pos + 4
            return true
            
        elseif str:sub(pos, pos + 4) == "false" then
            pos = pos + 5
            return false
            
        elseif str:sub(pos, pos + 3) == "null" then
            pos = pos + 4
            return nil
        end
        
        return nil
    end
    
    return parseValue()
end

-- Parse import string
function addon:ParseImportString(importStr)
    -- Validate prefix
    if not importStr:match("^!RHB!") then
        addon:Print("Invalid import string: must start with !RHB!")
        return nil
    end
    
    local base64Data = importStr:sub(6)
    
    -- Decode base64
    local compressed = base64decode(base64Data)
    if not compressed or compressed == "" then
        addon:Print("Failed to decode base64 data")
        return nil
    end
    
    -- Decompress
    local json
    local LibDeflate = _G.LibDeflate
    if LibDeflate then
        json = LibDeflate:DecompressDeflate(compressed)
    else
        addon:Debug("LibDeflate not found, trying uncompressed")
        json = compressed
    end
    
    if not json then
        addon:Print("Failed to decompress data")
        return nil
    end
    
    -- Parse JSON
    local data = parseJSON(json)
    if not data then
        addon:Print("Failed to parse JSON data")
        return nil
    end
    
    -- Validate required fields
    if not data.version or not data.eventId or not data.players then
        addon:Print("Invalid import data: missing required fields")
        return nil
    end
    
    addon:Debug("Parsed import: " .. (data.eventName or "Unknown") .. " with " .. #data.players .. " players")
    
    return data
end

-- Import event data
function addon:ImportEvent(importStr)
    local data = addon:ParseImportString(importStr)
    if not data then
        return false
    end
    
    -- Store in saved variables
    addon.charDb.currentEvent = data
    
    addon:Print("Imported event: " .. data.eventName)
    addon:Print("Players: " .. #data.players)
    
    if data.ccAssignments and #data.ccAssignments > 0 then
        addon:Print("CC assignments loaded")
    end
    
    if data.groupTemplates and #data.groupTemplates > 0 then
        addon:Print("Group templates loaded")
    end
    
    return true
end

-- Show import dialog
function addon:ShowImportDialog()
    -- Create dialog frame if it doesn't exist
    if not addon.importFrame then
        local frame = CreateFrame("Frame", "RHBImportFrame", UIParent, "BasicFrameTemplateWithInset")
        frame:SetSize(500, 200)
        frame:SetPoint("CENTER")
        frame:SetMovable(true)
        frame:EnableMouse(true)
        frame:RegisterForDrag("LeftButton")
        frame:SetScript("OnDragStart", frame.StartMoving)
        frame:SetScript("OnDragStop", frame.StopMovingOrSizing)
        frame:SetFrameStrata("DIALOG")
        frame:Hide()
        
        frame.title = frame:CreateFontString(nil, "OVERLAY")
        frame.title:SetFontObject("GameFontHighlight")
        frame.title:SetPoint("TOP", frame.TitleBg, "TOP", 0, -3)
        frame.title:SetText("Raid Helper Bridge - Import")
        
        -- Instructions
        local instructions = frame:CreateFontString(nil, "OVERLAY", "GameFontNormal")
        instructions:SetPoint("TOPLEFT", frame, "TOPLEFT", 15, -35)
        instructions:SetText("Paste your import string below:")
        
        -- Edit box with scroll frame
        local scrollFrame = CreateFrame("ScrollFrame", nil, frame, "UIPanelScrollFrameTemplate")
        scrollFrame:SetPoint("TOPLEFT", frame, "TOPLEFT", 15, -55)
        scrollFrame:SetPoint("BOTTOMRIGHT", frame, "BOTTOMRIGHT", -35, 45)
        
        local editBox = CreateFrame("EditBox", nil, scrollFrame)
        editBox:SetMultiLine(true)
        editBox:SetFontObject("ChatFontNormal")
        editBox:SetWidth(scrollFrame:GetWidth())
        editBox:SetAutoFocus(false)
        editBox:SetScript("OnEscapePressed", function(self) self:ClearFocus() end)
        scrollFrame:SetScrollChild(editBox)
        
        frame.editBox = editBox
        
        -- Import button
        local importBtn = CreateFrame("Button", nil, frame, "GameMenuButtonTemplate")
        importBtn:SetPoint("BOTTOMRIGHT", frame, "BOTTOMRIGHT", -10, 10)
        importBtn:SetSize(100, 25)
        importBtn:SetText("Import")
        importBtn:SetScript("OnClick", function()
            local text = editBox:GetText()
            if text and text ~= "" then
                if addon:ImportEvent(text) then
                    frame:Hide()
                end
            else
                addon:Print("Please paste an import string")
            end
        end)
        
        -- Cancel button
        local cancelBtn = CreateFrame("Button", nil, frame, "GameMenuButtonTemplate")
        cancelBtn:SetPoint("RIGHT", importBtn, "LEFT", -10, 0)
        cancelBtn:SetSize(100, 25)
        cancelBtn:SetText("Cancel")
        cancelBtn:SetScript("OnClick", function()
            frame:Hide()
        end)
        
        addon.importFrame = frame
    end
    
    -- Clear and show
    addon.importFrame.editBox:SetText("")
    addon.importFrame:Show()
    addon.importFrame.editBox:SetFocus()
end

-- Get current event data
function addon:GetCurrentEvent()
    return addon.charDb.currentEvent
end

-- Get player from current event by name
function addon:GetEventPlayer(playerName)
    local event = addon:GetCurrentEvent()
    if not event or not event.players then return nil end
    
    for _, player in ipairs(event.players) do
        if player.name == playerName then
            return player
        end
    end
    
    return nil
end

-- Get all players of a specific class from current event
function addon:GetEventPlayersByClass(className)
    local event = addon:GetCurrentEvent()
    if not event or not event.players then return {} end
    
    local players = {}
    for _, player in ipairs(event.players) do
        if player.class == className then
            table.insert(players, player)
        end
    end
    
    return players
end

local addonName, addon = ...

-- Group Manager Module
-- Handles raid group optimisation based on buff coverage

local GroupManager = {}
addon.GroupManager = GroupManager

-- Initialize Group Manager
function addon:InitGroupManager()
    addon:Debug("Group Manager initialized")
end

-- Get players providing a specific buff
function GroupManager:GetBuffProviders(buffName)
    local event = addon:GetCurrentEvent()
    if not event then return {} end
    
    local providers = {}
    local buffInfo = addon.BUFF_PROVIDERS[buffName]
    
    if not buffInfo then return {} end
    
    for _, player in ipairs(event.players) do
        if player.class == buffInfo.class then
            -- Check spec requirement if any
            if buffInfo.spec then
                if player.spec and tContains(buffInfo.spec, player.spec:lower()) then
                    table.insert(providers, player.name)
                end
            else
                table.insert(providers, player.name)
            end
        end
    end
    
    return providers
end

-- Calculate optimal group assignments
function GroupManager:CalculateGroups()
    local event = addon:GetCurrentEvent()
    if not event then
        addon:Print("No event loaded")
        return nil
    end

    -- Prefer concrete group assignments from import
    if event.groupAssignments and #event.groupAssignments > 0 then
        local groups = { {}, {}, {}, {}, {}, {}, {}, {} }
        for _, ga in ipairs(event.groupAssignments) do
            if ga.groupNumber >= 1 and ga.groupNumber <= 8 then
                groups[ga.groupNumber] = ga.players or {}
            end
        end
        return groups
    end

    -- Fall back to template-based calculation
    local groups = { {}, {}, {}, {}, {}, {}, {}, {} }
    local assigned = {}  -- Track assigned players
    
    local templates = event.groupTemplates or addon.DEFAULT_GROUP_TEMPLATES
    
    -- Step 1: Assign buff providers to appropriate groups
    for groupNum, template in ipairs(templates) do
        if groupNum > 8 then break end
        
        -- Find providers for priority buffs
        for _, buffName in ipairs(template.priorityBuffs) do
            local providers = GroupManager:GetBuffProviders(buffName)
            for _, providerName in ipairs(providers) do
                if not assigned[providerName] and #groups[groupNum] < 5 then
                    table.insert(groups[groupNum], providerName)
                    assigned[providerName] = groupNum
                    break  -- Only need one provider per buff
                end
            end
        end
        
        -- Fill with preferred classes/roles
        for _, player in ipairs(event.players) do
            if not assigned[player.name] and #groups[groupNum] < 5 then
                local classMatch = tContains(template.preferredClasses, player.class)
                local roleMatch = tContains(template.preferredRoles, player.role)
                
                if classMatch or roleMatch then
                    table.insert(groups[groupNum], player.name)
                    assigned[player.name] = groupNum
                end
            end
        end
    end
    
    -- Step 2: Fill remaining players into any group with space
    for _, player in ipairs(event.players) do
        if not assigned[player.name] then
            for groupNum = 1, 8 do
                if #groups[groupNum] < 5 then
                    table.insert(groups[groupNum], player.name)
                    assigned[player.name] = groupNum
                    break
                end
            end
        end
    end
    
    return groups
end

-- Apply group layout to current raid
function addon:ApplyGroupLayout()
    if not addon:HasRaidAssist() then
        addon:Print("You need raid leader or assistant to rearrange groups")
        return
    end
    
    local groups = GroupManager:CalculateGroups()
    if not groups then return end
    
    local roster = addon:GetRaidRoster()
    local moved = 0
    
    for groupNum, members in ipairs(groups) do
        for _, playerName in ipairs(members) do
            -- Find player in roster (handle realm names)
            local rosterEntry = nil
            local rosterName = nil
            for name, data in pairs(roster) do
                if name == playerName or name:match("^" .. playerName .. "%-") then
                    rosterEntry = data
                    rosterName = name
                    break
                end
            end
            
            if rosterEntry and rosterEntry.subgroup ~= groupNum then
                SetRaidSubgroup(rosterEntry.index, groupNum)
                moved = moved + 1
                addon:Debug("Moved " .. rosterName .. " to group " .. groupNum)
            end
        end
    end
    
    addon:Print("Group optimisation complete. Moved " .. moved .. " players.")
end

-- Preview group layout (without applying)
function addon:PreviewGroupLayout()
    local groups = GroupManager:CalculateGroups()
    if not groups then return end
    
    addon:Print("Proposed Group Layout:")
    for groupNum, members in ipairs(groups) do
        if #members > 0 then
            local memberList = table.concat(members, ", ")
            addon:Print("  Group " .. groupNum .. ": " .. memberList)
        end
    end
end

-- Show group editor (placeholder)
function addon:ShowGroupEditor()
    addon:Print("Group Editor not yet implemented. Preview:")
    addon:PreviewGroupLayout()
end

-- Get buff summary for current event
function addon:ShowBuffSummary()
    local event = addon:GetCurrentEvent()
    if not event then
        addon:Print("No event loaded")
        return
    end
    
    addon:Print("Available Buffs:")
    
    local buffsFound = {}
    
    for buffName, buffInfo in pairs(addon.BUFF_PROVIDERS or {}) do
        local providers = GroupManager:GetBuffProviders(buffName)
        if #providers > 0 then
            buffsFound[buffName] = providers
        end
    end
    
    -- Group by benefit type
    local byBenefit = {}
    for buffName, providers in pairs(buffsFound) do
        local buffInfo = addon.BUFF_PROVIDERS[buffName]
        local benefit = buffInfo.groupBenefit or "general"
        if not byBenefit[benefit] then
            byBenefit[benefit] = {}
        end
        table.insert(byBenefit[benefit], {
            name = buffName,
            description = buffInfo.description,
            providers = providers,
        })
    end
    
    for benefit, buffs in pairs(byBenefit) do
        addon:Print("  " .. benefit:upper() .. ":")
        for _, buff in ipairs(buffs) do
            local providerStr = table.concat(buff.providers, ", ")
            addon:Print("    " .. buff.name .. ": " .. providerStr)
        end
    end
end

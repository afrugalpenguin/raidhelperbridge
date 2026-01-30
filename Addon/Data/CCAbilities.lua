local addonName, addon = ...

-- CC abilities available in TBC, mapped to classes and valid mob types
addon.CC_ABILITIES = {
    polymorph = {
        class = "MAGE",
        spellId = 118,
        mobTypes = { "Humanoid", "Beast", "Critter" },
        duration = 50,
        breakOnDamage = true,
        icon = "Interface\\Icons\\Spell_Nature_Polymorph",
    },
    banish = {
        class = "WARLOCK",
        spellId = 710,
        mobTypes = { "Demon", "Elemental" },
        duration = 30,
        breakOnDamage = false,
        icon = "Interface\\Icons\\Spell_Shadow_Cripple",
    },
    fear = {
        class = "WARLOCK",
        spellId = 5782,
        mobTypes = { "Humanoid", "Beast" },
        duration = 20,
        breakOnDamage = true,
        fleeing = true,  -- mob runs around
        icon = "Interface\\Icons\\Spell_Shadow_Possession",
    },
    seduce = {
        class = "WARLOCK",
        spellId = 6358,  -- Succubus ability
        mobTypes = { "Humanoid" },
        duration = 15,
        breakOnDamage = true,
        requiresPet = "succubus",
        icon = "Interface\\Icons\\Spell_Shadow_MindSteal",
    },
    shackle = {
        class = "PRIEST",
        spellId = 9484,
        mobTypes = { "Undead" },
        duration = 50,
        breakOnDamage = true,
        icon = "Interface\\Icons\\Spell_Nature_Slow",
    },
    mindcontrol = {
        class = "PRIEST",
        spellId = 605,
        mobTypes = { "Humanoid" },
        duration = 60,
        breakOnDamage = false,
        channeled = true,
        icon = "Interface\\Icons\\Spell_Shadow_ShadowWordDominate",
    },
    hibernate = {
        class = "DRUID",
        spellId = 2637,
        mobTypes = { "Beast", "Dragonkin" },
        duration = 40,
        breakOnDamage = true,
        icon = "Interface\\Icons\\Spell_Nature_Sleep",
    },
    cyclone = {
        class = "DRUID",
        spellId = 33786,
        mobTypes = { "Humanoid", "Beast", "Demon", "Dragonkin", "Elemental", "Giant", "Mechanical", "Undead" },
        duration = 6,
        breakOnDamage = false,
        diminishingReturns = true,
        icon = "Interface\\Icons\\Spell_Nature_EarthBind",
    },
    sap = {
        class = "ROGUE",
        spellId = 6770,
        mobTypes = { "Humanoid", "Beast", "Demon", "Dragonkin" },  -- TBC added more types
        duration = 45,
        breakOnDamage = true,
        requiresStealth = true,
        prePullOnly = true,
        icon = "Interface\\Icons\\Ability_Sap",
    },
    freezingtrap = {
        class = "HUNTER",
        spellId = 14311,
        mobTypes = { "Humanoid", "Beast", "Demon", "Dragonkin", "Elemental", "Giant", "Mechanical", "Undead" },
        duration = 20,  -- 26 with talents
        breakOnDamage = true,
        trap = true,
        icon = "Interface\\Icons\\Spell_Frost_ChainsOfIce",
    },
    wyvern = {
        class = "HUNTER",
        spellId = 19386,
        mobTypes = { "Humanoid", "Beast", "Demon", "Dragonkin", "Elemental", "Giant", "Mechanical", "Undead" },
        duration = 12,
        breakOnDamage = true,
        requiresSpec = "survival",
        icon = "Interface\\Icons\\INV_Spear_02",
    },
    turnundead = {
        class = "PALADIN",
        spellId = 10326,
        mobTypes = { "Undead" },
        duration = 20,
        breakOnDamage = true,
        fleeing = true,
        icon = "Interface\\Icons\\Spell_Holy_TurnUndead",
    },
    repentance = {
        class = "PALADIN",
        spellId = 20066,
        mobTypes = { "Humanoid", "Demon", "Dragonkin", "Giant", "Undead" },
        duration = 6,
        breakOnDamage = true,
        requiresSpec = "retribution",
        icon = "Interface\\Icons\\Spell_Holy_PrayerOfHealing",
    },
    earthbind = {
        class = "SHAMAN",
        spellId = 2484,
        mobTypes = { "all" },  -- Slow, not hard CC
        duration = 45,
        soft = true,  -- Slow, not incapacitate
        aoe = true,
        icon = "Interface\\Icons\\Spell_Nature_StrengthOfEarthTotem02",
    },
}

-- Priority order for each CC type (higher = preferred)
-- Used when multiple classes can CC the same mob type
addon.CC_PRIORITY = {
    Humanoid = { "polymorph", "sap", "freezingtrap", "shackle", "seduce", "repentance", "fear" },
    Beast = { "hibernate", "freezingtrap", "polymorph", "sap", "fear" },
    Demon = { "banish", "freezingtrap", "sap", "fear", "enslave" },
    Dragonkin = { "hibernate", "freezingtrap", "sap" },
    Elemental = { "banish", "freezingtrap" },
    Undead = { "shackle", "freezingtrap", "turnundead" },
    Giant = { "freezingtrap" },
    Mechanical = { "freezingtrap" },
}

-- Reverse lookup: class -> available CC types
addon.CLASS_CC = {}
for ccType, data in pairs(addon.CC_ABILITIES) do
    local class = data.class
    if not addon.CLASS_CC[class] then
        addon.CLASS_CC[class] = {}
    end
    table.insert(addon.CLASS_CC[class], ccType)
end

local addonName, addon = ...

-- TBC Raid buff providers for group optimisation
-- Buffs are group-wide (5 players) unless noted otherwise

addon.BUFF_PROVIDERS = {
    -- Shaman Totems (group only)
    windfury = {
        class = "SHAMAN",
        spec = { "enhancement" },  -- Enhancement typically drops WF
        spellId = 25587,
        description = "Windfury Totem - melee attack bonus",
        groupBenefit = "melee",
        icon = "Interface\\Icons\\Spell_Nature_Windfury",
    },
    graceofair = {
        class = "SHAMAN",
        spec = { "restoration", "elemental" },  -- Non-enhance typically
        spellId = 25359,
        description = "Grace of Air Totem - agility",
        groupBenefit = "physical",
        icon = "Interface\\Icons\\Spell_Nature_InvisibilityTotem",
    },
    wrathofair = {
        class = "SHAMAN",
        spec = { "elemental" },
        spellId = 3738,
        description = "Wrath of Air Totem - spell haste/crit",
        groupBenefit = "caster",
        icon = "Interface\\Icons\\Spell_Nature_SlowingTotem",
    },
    totemofwrath = {
        class = "SHAMAN",
        spec = { "elemental" },
        spellId = 30706,
        description = "Totem of Wrath - spell hit/crit (raid wide)",
        groupBenefit = "caster",
        raidWide = true,
        icon = "Interface\\Icons\\Spell_Fire_TotemOfWrath",
    },
    manaspring = {
        class = "SHAMAN",
        spellId = 25570,
        description = "Mana Spring Totem - mana regen",
        groupBenefit = "healer",
        icon = "Interface\\Icons\\Spell_Nature_ManaRegenTotem",
    },
    manatide = {
        class = "SHAMAN",
        spec = { "restoration" },
        spellId = 16190,
        description = "Mana Tide Totem - burst mana",
        groupBenefit = "healer",
        cooldown = true,
        icon = "Interface\\Icons\\Spell_Frost_SummonWaterElemental",
    },
    strengthofearth = {
        class = "SHAMAN",
        spellId = 25528,
        description = "Strength of Earth Totem - strength/agility",
        groupBenefit = "melee",
        icon = "Interface\\Icons\\Spell_Nature_EarthBindTotem",
    },

    -- Paladin Auras/Blessings
    sanctityaura = {
        class = "PALADIN",
        spec = { "retribution" },
        spellId = 20218,
        description = "Sanctity Aura - holy damage bonus",
        groupBenefit = "caster",
        icon = "Interface\\Icons\\Spell_Holy_MindVision",
    },
    devotionaura = {
        class = "PALADIN",
        spellId = 27149,
        description = "Devotion Aura - armor bonus",
        groupBenefit = "tank",
        icon = "Interface\\Icons\\Spell_Holy_DevotionAura",
    },
    retributionaura = {
        class = "PALADIN",
        spellId = 27150,
        description = "Retribution Aura - damage reflect",
        groupBenefit = "tank",
        icon = "Interface\\Icons\\Spell_Holy_AuraOfLight",
    },
    improvedblessingofmight = {
        class = "PALADIN",
        spec = { "retribution" },
        spellId = 20045,
        description = "Improved Blessing of Might",
        groupBenefit = "melee",
        blessing = true,
        icon = "Interface\\Icons\\Spell_Holy_FistOfJustice",
    },
    improvedblessingofwisdom = {
        class = "PALADIN",
        spec = { "holy" },
        spellId = 20245,
        description = "Improved Blessing of Wisdom",
        groupBenefit = "caster",
        blessing = true,
        icon = "Interface\\Icons\\Spell_Holy_SealOfWisdom",
    },

    -- Druid
    moonkinaura = {
        class = "DRUID",
        spec = { "balance" },
        spellId = 24907,
        description = "Moonkin Aura - 5% spell crit",
        groupBenefit = "caster",
        icon = "Interface\\Icons\\Spell_Nature_MoonkinForm",
    },
    leaderofthepack = {
        class = "DRUID",
        spec = { "feral" },
        spellId = 17007,
        description = "Leader of the Pack - 5% melee crit",
        groupBenefit = "melee",
        icon = "Interface\\Icons\\Spell_Nature_UnyeildingStamina",
    },
    improvedleaderofthepack = {
        class = "DRUID",
        spec = { "feral" },
        spellId = 34300,
        description = "Improved LotP - heal on crit",
        groupBenefit = "melee",
        icon = "Interface\\Icons\\Spell_Nature_UnyeildingStamina",
    },
    treeoflife = {
        class = "DRUID",
        spec = { "restoration" },
        spellId = 33891,
        description = "Tree of Life Aura - healing bonus",
        groupBenefit = "healer",
        icon = "Interface\\Icons\\Ability_Druid_TreeofLife",
    },
    innervate = {
        class = "DRUID",
        spellId = 29166,
        description = "Innervate - mana regen cooldown",
        groupBenefit = "healer",
        cooldown = true,
        icon = "Interface\\Icons\\Spell_Nature_Lightning",
    },

    -- Warrior
    battleshout = {
        class = "WARRIOR",
        spellId = 2048,
        description = "Battle Shout - attack power",
        groupBenefit = "melee",
        icon = "Interface\\Icons\\Ability_Warrior_BattleShout",
    },
    commandingshout = {
        class = "WARRIOR",
        spellId = 469,
        description = "Commanding Shout - stamina",
        groupBenefit = "tank",
        icon = "Interface\\Icons\\Ability_Warrior_RallyingCry",
    },
    rampage = {
        class = "WARRIOR",
        spec = { "fury" },
        spellId = 30033,
        description = "Rampage - 5% melee crit",
        groupBenefit = "melee",
        icon = "Interface\\Icons\\Ability_Warrior_Rampage",
    },
    bloodfrenzy = {
        class = "WARRIOR",
        spec = { "arms" },
        spellId = 29859,
        description = "Blood Frenzy - 4% physical damage",
        groupBenefit = "melee",
        debuff = true,  -- Goes on target
        raidWide = true,
        icon = "Interface\\Icons\\Ability_Warrior_Bloodfrenzy",
    },

    -- Hunter
    ferociousinspiration = {
        class = "HUNTER",
        spec = { "beastmastery" },
        spellId = 34460,
        description = "Ferocious Inspiration - 3% damage",
        groupBenefit = "all",
        icon = "Interface\\Icons\\Ability_Hunter_FerociousInspiration",
    },
    trueshotaura = {
        class = "HUNTER",
        spec = { "marksmanship" },
        spellId = 27066,
        description = "Trueshot Aura - attack power",
        groupBenefit = "physical",
        raidWide = true,
        icon = "Interface\\Icons\\Ability_TrueShot",
    },
    exposeweakness = {
        class = "HUNTER",
        spec = { "survival" },
        spellId = 34503,
        description = "Expose Weakness - attack power debuff",
        groupBenefit = "physical",
        debuff = true,
        raidWide = true,
        icon = "Interface\\Icons\\Ability_Rogue_FindWeakness",
    },

    -- Priest
    shadowweaving = {
        class = "PRIEST",
        spec = { "shadow" },
        spellId = 15334,
        description = "Shadow Weaving - 10% shadow damage",
        groupBenefit = "caster",
        debuff = true,
        raidWide = true,
        icon = "Interface\\Icons\\Spell_Shadow_BlackPlague",
    },
    misery = {
        class = "PRIEST",
        spec = { "shadow" },
        spellId = 33198,
        description = "Misery - 5% spell hit on target",
        groupBenefit = "caster",
        debuff = true,
        raidWide = true,
        icon = "Interface\\Icons\\Spell_Shadow_Misery",
    },
    vampirictouch = {
        class = "PRIEST",
        spec = { "shadow" },
        spellId = 34917,
        description = "Vampiric Touch - mana return",
        groupBenefit = "caster",
        icon = "Interface\\Icons\\Spell_Holy_Stoicism",
    },
    inspiringpresence = {
        class = "PRIEST",
        spec = { "discipline" },
        spellId = 14893,
        description = "Inspiration - armor bonus on heal crit",
        groupBenefit = "tank",
        icon = "Interface\\Icons\\Spell_Holy_LayOnHands",
    },

    -- Warlock
    curseoftheelements = {
        class = "WARLOCK",
        spellId = 27228,
        description = "Curse of Elements - spell damage taken",
        groupBenefit = "caster",
        debuff = true,
        raidWide = true,
        icon = "Interface\\Icons\\Spell_Shadow_ChillTouch",
    },
    curseofweakness = {
        class = "WARLOCK",
        spellId = 27224,
        description = "Curse of Weakness - attack power reduction",
        groupBenefit = "tank",
        debuff = true,
        raidWide = true,
        icon = "Interface\\Icons\\Spell_Shadow_CurseOfMannoroth",
    },
    bloodpact = {
        class = "WARLOCK",
        spellId = 27268,
        description = "Blood Pact (Imp) - stamina",
        groupBenefit = "all",
        icon = "Interface\\Icons\\Spell_Shadow_BloodBoil",
    },

    -- Mage
    arcaneintellect = {
        class = "MAGE",
        spellId = 27127,
        description = "Arcane Intellect - intellect",
        groupBenefit = "caster",
        raidWide = true,
        icon = "Interface\\Icons\\Spell_Holy_MagicalSentry",
    },

    -- Rogue
    improvedexposearmor = {
        class = "ROGUE",
        spec = { "combat" },
        spellId = 14169,
        description = "Improved Expose Armor",
        groupBenefit = "physical",
        debuff = true,
        raidWide = true,
        icon = "Interface\\Icons\\Ability_Warrior_Riposte",
    },
}

-- Group templates for common TBC raid compositions
-- Numeric array so ipairs() in GroupManager iterates correctly
addon.DEFAULT_GROUP_TEMPLATES = {
    [1] = {
        name = "Melee DPS Group",
        description = "Windfury + Battle Shout + LotP",
        priorityBuffs = { "windfury", "battleshout", "leaderofthepack", "strengthofearth" },
        preferredClasses = { "WARRIOR", "ROGUE", "SHAMAN" },
        preferredRoles = { "mdps" },
    },
    [2] = {
        name = "Caster DPS Group",
        description = "Totem of Wrath + Moonkin + Shadow Priest",
        priorityBuffs = { "totemofwrath", "moonkinaura", "vampirictouch", "wrathofair" },
        preferredClasses = { "MAGE", "WARLOCK", "SHAMAN", "DRUID", "PRIEST" },
        preferredRoles = { "rdps" },
    },
    [3] = {
        name = "Healer Group",
        description = "Mana Tide + Tree of Life + Mana Spring",
        priorityBuffs = { "manatide", "treeoflife", "manaspring" },
        preferredClasses = { "PRIEST", "DRUID", "PALADIN", "SHAMAN" },
        preferredRoles = { "healer" },
    },
    [4] = {
        name = "Tank Group",
        description = "Tanks + dedicated support",
        priorityBuffs = { "devotionaura", "commandingshout" },
        preferredClasses = { "WARRIOR", "PALADIN", "DRUID" },
        preferredRoles = { "tank" },
    },
    [5] = {
        name = "Hunter Group",
        description = "BM Hunter + Feral + Enhance",
        priorityBuffs = { "ferociousinspiration", "leaderofthepack", "windfury" },
        preferredClasses = { "HUNTER", "SHAMAN", "DRUID" },
        preferredRoles = { "rdps", "mdps" },
    },
}

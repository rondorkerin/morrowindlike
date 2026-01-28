// Morrowind-style character stats, skills, and leveling system

export type AttributeName =
  | 'strength' | 'intelligence' | 'willpower' | 'agility'
  | 'speed' | 'endurance' | 'personality' | 'luck';

export type SkillName =
  // Combat
  | 'armorer' | 'athletics' | 'axe' | 'block' | 'bluntWeapon'
  | 'heavyArmor' | 'longBlade' | 'mediumArmor' | 'spear'
  // Magic
  | 'alchemy' | 'alteration' | 'conjuration' | 'destruction'
  | 'enchant' | 'illusion' | 'mysticism' | 'restoration' | 'unarmored'
  // Stealth
  | 'acrobatics' | 'handToHand' | 'lightArmor' | 'marksman'
  | 'mercantile' | 'security' | 'shortBlade' | 'sneak' | 'speechcraft';

export type Specialization = 'combat' | 'magic' | 'stealth';

export interface SkillDefinition {
  name: string;
  governingAttribute: AttributeName;
  specialization: Specialization;
}

export const SKILL_DEFINITIONS: Record<SkillName, SkillDefinition> = {
  // Combat skills
  armorer: { name: 'Armorer', governingAttribute: 'strength', specialization: 'combat' },
  athletics: { name: 'Athletics', governingAttribute: 'speed', specialization: 'combat' },
  axe: { name: 'Axe', governingAttribute: 'strength', specialization: 'combat' },
  block: { name: 'Block', governingAttribute: 'agility', specialization: 'combat' },
  bluntWeapon: { name: 'Blunt Weapon', governingAttribute: 'strength', specialization: 'combat' },
  heavyArmor: { name: 'Heavy Armor', governingAttribute: 'endurance', specialization: 'combat' },
  longBlade: { name: 'Long Blade', governingAttribute: 'strength', specialization: 'combat' },
  mediumArmor: { name: 'Medium Armor', governingAttribute: 'endurance', specialization: 'combat' },
  spear: { name: 'Spear', governingAttribute: 'endurance', specialization: 'combat' },
  // Magic skills
  alchemy: { name: 'Alchemy', governingAttribute: 'intelligence', specialization: 'magic' },
  alteration: { name: 'Alteration', governingAttribute: 'willpower', specialization: 'magic' },
  conjuration: { name: 'Conjuration', governingAttribute: 'intelligence', specialization: 'magic' },
  destruction: { name: 'Destruction', governingAttribute: 'willpower', specialization: 'magic' },
  enchant: { name: 'Enchant', governingAttribute: 'intelligence', specialization: 'magic' },
  illusion: { name: 'Illusion', governingAttribute: 'personality', specialization: 'magic' },
  mysticism: { name: 'Mysticism', governingAttribute: 'willpower', specialization: 'magic' },
  restoration: { name: 'Restoration', governingAttribute: 'willpower', specialization: 'magic' },
  unarmored: { name: 'Unarmored', governingAttribute: 'speed', specialization: 'magic' },
  // Stealth skills
  acrobatics: { name: 'Acrobatics', governingAttribute: 'strength', specialization: 'stealth' },
  handToHand: { name: 'Hand-to-hand', governingAttribute: 'speed', specialization: 'stealth' },
  lightArmor: { name: 'Light Armor', governingAttribute: 'agility', specialization: 'stealth' },
  marksman: { name: 'Marksman', governingAttribute: 'agility', specialization: 'stealth' },
  mercantile: { name: 'Mercantile', governingAttribute: 'personality', specialization: 'stealth' },
  security: { name: 'Security', governingAttribute: 'intelligence', specialization: 'stealth' },
  shortBlade: { name: 'Short Blade', governingAttribute: 'speed', specialization: 'stealth' },
  sneak: { name: 'Sneak', governingAttribute: 'agility', specialization: 'stealth' },
  speechcraft: { name: 'Speechcraft', governingAttribute: 'personality', specialization: 'stealth' },
};

export interface ClassDefinition {
  name: string;
  specialization: Specialization;
  favoredAttributes: [AttributeName, AttributeName];
  majorSkills: SkillName[];
  minorSkills: SkillName[];
}

export const WARRIOR_CLASS: ClassDefinition = {
  name: 'Warrior',
  specialization: 'combat',
  favoredAttributes: ['strength', 'endurance'],
  majorSkills: ['longBlade', 'mediumArmor', 'heavyArmor', 'athletics', 'block'],
  minorSkills: ['armorer', 'bluntWeapon', 'axe', 'spear', 'marksman'],
};

export const MAGE_CLASS: ClassDefinition = {
  name: 'Mage',
  specialization: 'magic',
  favoredAttributes: ['intelligence', 'willpower'],
  majorSkills: ['destruction', 'restoration', 'mysticism', 'alteration', 'conjuration'],
  minorSkills: ['enchant', 'alchemy', 'illusion', 'unarmored'],
};

export const ARCHER_CLASS: ClassDefinition = {
  name: 'Archer',
  specialization: 'stealth',
  favoredAttributes: ['agility', 'speed'],
  majorSkills: ['marksman', 'sneak', 'lightArmor', 'athletics', 'acrobatics'],
  minorSkills: ['shortBlade', 'security', 'mercantile', 'handToHand'],
};

export class CharacterStats {
  // Base attributes (before bonuses)
  attributes: Record<AttributeName, number> = {
    strength: 40,
    intelligence: 30,
    willpower: 30,
    agility: 30,
    speed: 30,
    endurance: 40,
    personality: 30,
    luck: 40,
  };

  // Skills
  skills: Record<SkillName, number>;

  // Class info
  class: ClassDefinition;
  majorSkills: Set<SkillName>;
  minorSkills: Set<SkillName>;

  // Leveling
  level = 1;
  skillIncreasesThisLevel = 0;
  skillIncreasesNeeded = 10;
  canLevelUp = false;

  // Track skill increases per attribute for level up bonuses
  attributeSkillIncreases: Record<AttributeName, number> = {
    strength: 0, intelligence: 0, willpower: 0, agility: 0,
    speed: 0, endurance: 0, personality: 0, luck: 0,
  };

  // Derived stats
  maxHealth: number;
  maxMagicka: number;
  maxFatigue: number;
  health: number;
  magicka: number;
  fatigue: number;

  // Experience tracking for individual skills
  skillProgress: Record<SkillName, number>;

  constructor(charClass: ClassDefinition = WARRIOR_CLASS) {
    this.class = charClass;
    this.majorSkills = new Set(charClass.majorSkills);
    this.minorSkills = new Set(charClass.minorSkills);

    // Apply favored attribute bonuses
    for (const attr of charClass.favoredAttributes) {
      this.attributes[attr] += 10;
    }

    // Initialize skills based on class
    this.skills = {} as Record<SkillName, number>;
    this.skillProgress = {} as Record<SkillName, number>;

    for (const skillName of Object.keys(SKILL_DEFINITIONS) as SkillName[]) {
      const def = SKILL_DEFINITIONS[skillName];
      let baseValue = 5;

      // Specialization bonus
      if (def.specialization === charClass.specialization) {
        baseValue += 5;
      }

      // Major skill bonus
      if (this.majorSkills.has(skillName)) {
        baseValue += 25;
      }
      // Minor skill bonus
      else if (this.minorSkills.has(skillName)) {
        baseValue += 10;
      }

      this.skills[skillName] = baseValue;
      this.skillProgress[skillName] = 0;
    }

    // Calculate derived stats
    this.maxHealth = this.calculateMaxHealth();
    this.maxMagicka = this.calculateMaxMagicka();
    this.maxFatigue = this.calculateMaxFatigue();
    this.health = this.maxHealth;
    this.magicka = this.maxMagicka;
    this.fatigue = this.maxFatigue;
  }

  calculateMaxHealth(): number {
    // Morrowind formula: (Strength + Endurance) / 2
    return Math.floor((this.attributes.strength + this.attributes.endurance) / 2);
  }

  calculateMaxMagicka(): number {
    // Morrowind formula: Intelligence * multiplier (1.0 for non-mage)
    return this.attributes.intelligence;
  }

  calculateMaxFatigue(): number {
    // Morrowind formula: Strength + Willpower + Agility + Endurance
    return this.attributes.strength + this.attributes.willpower +
           this.attributes.agility + this.attributes.endurance;
  }

  // Increase a skill and track for leveling
  increaseSkill(skillName: SkillName, amount = 1): boolean {
    const oldValue = this.skills[skillName];
    this.skills[skillName] = Math.min(100, oldValue + amount);

    if (this.skills[skillName] > oldValue) {
      // Track for leveling if major/minor skill
      if (this.majorSkills.has(skillName) || this.minorSkills.has(skillName)) {
        this.skillIncreasesThisLevel += amount;

        // Track governing attribute for level-up multiplier
        const governingAttr = SKILL_DEFINITIONS[skillName].governingAttribute;
        this.attributeSkillIncreases[governingAttr] += amount;

        if (this.skillIncreasesThisLevel >= this.skillIncreasesNeeded) {
          this.canLevelUp = true;
        }
      }
      return true;
    }
    return false;
  }

  // Add skill progress (like Morrowind's use-based advancement)
  addSkillProgress(skillName: SkillName, amount: number) {
    this.skillProgress[skillName] += amount;

    // Skill increases at 100 progress (simplified)
    const progressNeeded = 100;
    while (this.skillProgress[skillName] >= progressNeeded) {
      this.skillProgress[skillName] -= progressNeeded;
      this.increaseSkill(skillName, 1);
    }
  }

  // Get attribute increase multiplier based on skill increases
  getAttributeMultiplier(attr: AttributeName): number {
    const increases = this.attributeSkillIncreases[attr];
    if (increases >= 10) return 5;
    if (increases >= 8) return 4;
    if (increases >= 5) return 3;
    if (increases >= 1) return 2;
    return 1;
  }

  // Level up - player chooses 3 attributes to increase
  levelUp(chosenAttributes: [AttributeName, AttributeName, AttributeName]): boolean {
    if (!this.canLevelUp) return false;

    this.level++;

    // Increase chosen attributes with multipliers
    for (const attr of chosenAttributes) {
      const multiplier = this.getAttributeMultiplier(attr);
      this.attributes[attr] = Math.min(100, this.attributes[attr] + multiplier);
    }

    // Increase health based on endurance
    const healthGain = Math.floor(this.attributes.endurance / 10);
    this.maxHealth += healthGain;
    this.health = this.maxHealth;

    // Recalculate derived stats
    this.maxMagicka = this.calculateMaxMagicka();
    this.maxFatigue = this.calculateMaxFatigue();
    this.magicka = this.maxMagicka;
    this.fatigue = this.maxFatigue;

    // Reset level tracking
    this.skillIncreasesThisLevel = 0;
    this.canLevelUp = false;
    this.attributeSkillIncreases = {
      strength: 0, intelligence: 0, willpower: 0, agility: 0,
      speed: 0, endurance: 0, personality: 0, luck: 0,
    };

    return true;
  }

  // Get weapon damage based on skill and strength
  getWeaponDamage(baseDamage: number, skillName: SkillName): number {
    const skillBonus = 1 + (this.skills[skillName] / 100);
    const strBonus = 1 + (this.attributes.strength / 200);
    return Math.floor(baseDamage * skillBonus * strBonus);
  }

  // Get armor rating
  getArmorRating(baseArmor: number, skillName: SkillName): number {
    const skillBonus = 1 + (this.skills[skillName] / 100);
    return Math.floor(baseArmor * skillBonus);
  }

  // Restore health/magicka/fatigue
  rest(hours: number) {
    const healthRegen = hours * this.attributes.endurance / 10;
    const magickaRegen = hours * this.attributes.willpower / 10;
    const fatigueRegen = hours * 10;

    this.health = Math.min(this.maxHealth, this.health + healthRegen);
    this.magicka = Math.min(this.maxMagicka, this.magicka + magickaRegen);
    this.fatigue = Math.min(this.maxFatigue, this.fatigue + fatigueRegen);
  }
}

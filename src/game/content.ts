import type { Ability, Building, EnemyKind, EquipmentEffect, Rarity, Slot } from './types';
export const ENEMIES: Record<
  EnemyKind,
  { name: string; health: number; interval: number; armorScale: number }
> = {
  skeleton: { name: 'Restless Sentinel', health: 1, interval: 1.65, armorScale: 1 },
  hound: { name: 'Ashen Hound', health: 0.82, interval: 1.15, armorScale: 1 },
  wraith: { name: 'Veil Wraith', health: 0.92, interval: 2.05, armorScale: 0.5 },
  cultist: { name: 'Ember Acolyte', health: 0.88, interval: 1.9, armorScale: 0.6 },
  golem: { name: 'Obsidian Guardian', health: 1.2, interval: 2.25, armorScale: 1 },
  king: { name: 'The Hollow King', health: 1, interval: 1.65, armorScale: 1 },
};
export const EQUIPMENT_EFFECTS: Record<EquipmentEffect, { name: string; description: string }> = {
  siphon: {
    name: 'Soul Siphon',
    description: 'Heal for 3% of strike damage per relic (up to 9%).',
  },
  ember: {
    name: 'Emberforged',
    description: 'Basic strikes deal 8% more damage per relic (up to 24%).',
  },
  focus: {
    name: 'Arcane Focus',
    description: 'Abilities recharge 8% faster per relic (up to 24%).',
  },
  bulwark: { name: 'Oathguard', description: 'Take 4% less damage per relic (up to 12%).' },
};
export const STAGES = [
  {
    name: 'The Forgotten Crypt',
    region: 'The Sunken Keep',
    mood: 'Where the restless first stir.',
  },
  { name: 'Emberfall Passage', region: 'The Sunken Keep', mood: 'Old fires still remember.' },
  { name: 'The Bone Gallery', region: 'The Sunken Keep', mood: 'A thousand nameless sentinels.' },
  { name: 'Whispering Halls', region: 'The Veiled Depths', mood: 'Do not follow the voices.' },
  { name: 'The Violet Sanctum', region: 'The Veiled Depths', mood: 'Magic has a price.' },
  { name: 'Ashen Catacombs', region: 'The Veiled Depths', mood: 'Only the embers remain.' },
  { name: 'The Drowned Chapel', region: 'The Crownless Abyss', mood: 'No prayers reach this far.' },
  { name: 'The Obsidian Gate', region: 'The Crownless Abyss', mood: 'The dark is looking back.' },
  {
    name: 'Court of the Forsaken',
    region: 'The Crownless Abyss',
    mood: 'A kingdom without a dawn.',
  },
  {
    name: 'The Hollow Throne',
    region: 'The Crownless Abyss',
    mood: 'One last crown. One last descent.',
  },
];
export const RARITY: Record<Rarity, { color: string; label: string; multiplier: number }> = {
  common: { color: '#a7aaa5', label: 'Common', multiplier: 1 },
  uncommon: { color: '#80b995', label: 'Uncommon', multiplier: 1.3 },
  rare: { color: '#7cacf1', label: 'Rare', multiplier: 1.7 },
  epic: { color: '#bd8ce7', label: 'Epic', multiplier: 2.25 },
  legendary: { color: '#e5b65e', label: 'Legendary', multiplier: 3.1 },
};
export const SLOT_NAMES: Record<Slot, string> = {
  weapon: 'Weapon',
  head: 'Helm',
  chest: 'Armor',
  hands: 'Gauntlets',
  feet: 'Boots',
  amulet: 'Amulet',
};
export const BUILDINGS: Record<
  Building,
  { name: string; description: string; benefit: string; baseCost: number; icon: string }
> = {
  blacksmith: {
    name: 'Blacksmith',
    description: 'Steel tempered in the last living fire.',
    benefit: '+8% equipment stats per level',
    baseCost: 90,
    icon: 'anvil',
  },
  guild: {
    name: 'Guild Hall',
    description: 'Even the lost can find a brotherhood.',
    benefit: '+15% experience per level',
    baseCost: 110,
    icon: 'shield',
  },
  townhall: {
    name: 'Town Hall',
    description: 'A little hope, built one stone at a time.',
    benefit: '+15% gold & +12 max health per level',
    baseCost: 130,
    icon: 'town',
  },
};
export const ABILITIES: Record<
  Ability,
  { name: string; description: string; cooldown: number; icon: string }
> = {
  cleave: {
    name: 'Soul Cleave',
    description: 'Strike for 280% attack. Can critically hit.',
    cooldown: 9,
    icon: 'sword',
  },
  mend: {
    name: 'Crimson Mend',
    description: 'Restore 32% of your maximum health.',
    cooldown: 17,
    icon: 'heart',
  },
  ward: {
    name: 'Void Ward',
    description: 'Reduce incoming damage by 55% for 6 seconds.',
    cooldown: 21,
    icon: 'rune',
  },
};
export const xpNeeded = (level: number) => Math.floor(60 * Math.pow(level, 1.3));
export const upgradeCost = (building: Building, level: number) =>
  Math.floor(BUILDINGS[building].baseCost * Math.pow(1.7, level));

export const SLOTS = ['weapon', 'head', 'chest', 'hands', 'feet', 'amulet'] as const;
export type Slot = (typeof SLOTS)[number];
export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];
export type Stats = { attack: number; armor: number; health: number; crit: number };
export const EFFECTS = ['siphon', 'ember', 'focus', 'bulwark'] as const;
export type EquipmentEffect = (typeof EFFECTS)[number];
export type Item = {
  id: string;
  name: string;
  slot: Slot;
  rarity: Rarity;
  level: number;
  stats: Stats;
  value: number;
  effect?: EquipmentEffect;
};
export type Building = 'blacksmith' | 'guild' | 'townhall';
export type Settings = {
  paused: boolean;
  reducedMotion: boolean;
  autoAdvance: boolean;
  autoCast: boolean;
  sound: boolean;
  music: boolean;
};
export type SaveData = {
  version: 1;
  gold: number;
  level: number;
  xp: number;
  stage: number;
  unlocked: number;
  cleared: number[];
  kills: number;
  totalKills: number;
  bossDefeated: boolean;
  hp: number;
  equipment: Record<Slot, Item>;
  inventory: Item[];
  buildings: Record<Building, number>;
  settings: Settings;
  savedAt: number;
};
export type EnemyKind = 'skeleton' | 'hound' | 'wraith' | 'cultist' | 'golem' | 'king';
export type Enemy = {
  kind: EnemyKind;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  phase: 1 | 2;
};
export type Ability = 'cleave' | 'mend' | 'ward';
export type GameEvent =
  | { type: 'hit'; target: 'hero' | 'enemy'; amount: number; critical: boolean; magic: boolean }
  | { type: 'heal'; amount: number }
  | { type: 'loot'; item: Item }
  | { type: 'kill'; gold: number; xp: number }
  | { type: 'spawn' }
  | { type: 'phase' }
  | { type: 'telegraph'; name: string; duration: number }
  | { type: 'enemyAbility'; name: string }
  | { type: 'encounter'; name: string; text: string }
  | { type: 'level'; level: number }
  | { type: 'clear'; stage: number; first: boolean }
  | { type: 'death' }
  | { type: 'ability'; ability: Ability }
  | { type: 'notice'; text: string };

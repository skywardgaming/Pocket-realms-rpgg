import { RARITY } from './content';
import { EFFECTS, SLOTS } from './types';
import type { Item, Rarity, Slot, Stats } from './types';
let sequence = 0;
const names: Record<Slot, string[]> = {
  weapon: ['Cryptblade', 'Oathkeeper', 'Emberfang', 'Soulrender', 'Crownfall'],
  head: ['Watchman’s Helm', 'Ashen Visor', 'Gravewarden Helm', 'Veil of Dusk', 'Hollow Crown'],
  chest: ['Pilgrim’s Mail', 'Duskplate', 'Sentinel’s Cuirass', 'Wraithguard', 'Sovereign’s Mantle'],
  hands: ['Iron Grips', 'Ember Gauntlets', 'Gravewarden Grips', 'Voidtouch', 'Kingbreaker Grips'],
  feet: [
    'Worn Sabatons',
    'Ashwalker Boots',
    'Sentinel’s Treads',
    'Shadowsteps',
    'Sovereign’s Stride',
  ],
  amulet: [
    'Faded Talisman',
    'Ember Pendant',
    'Moonstone Charm',
    'Eye of the Void',
    'Heart of the King',
  ],
};
export function makeItem(
  stage: number,
  random: () => number = Math.random,
  forcedRarity?: Rarity,
  forcedSlot?: Slot,
): Item {
  const roll = random();
  const rarity: Rarity =
    forcedRarity ??
    (roll < 0.015
      ? 'legendary'
      : roll < 0.1
        ? 'epic'
        : roll < 0.31
          ? 'rare'
          : roll < 0.64
            ? 'uncommon'
            : 'common');
  const slot = forcedSlot ?? SLOTS[Math.floor(random() * SLOTS.length)];
  const index = ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(rarity);
  const power = (4 + stage * 2.7) * RARITY[rarity].multiplier * (0.9 + random() * 0.2);
  const stats: Stats = { attack: 0, armor: 0, health: 0, crit: 0 };
  if (slot === 'weapon') {
    stats.attack = Math.round(power * 1.4);
    stats.crit = index >= 2 ? 2 + index : 0;
  }
  if (slot === 'head') {
    stats.armor = Math.ceil(power * 0.35);
    stats.health = Math.round(power * 2);
  }
  if (slot === 'chest') {
    stats.armor = Math.ceil(power * 0.6);
    stats.health = Math.round(power * 4);
  }
  if (slot === 'hands') {
    stats.attack = Math.ceil(power * 0.45);
    stats.armor = Math.ceil(power * 0.2);
  }
  if (slot === 'feet') {
    stats.armor = Math.ceil(power * 0.3);
    stats.health = Math.round(power * 2.5);
  }
  if (slot === 'amulet') {
    stats.attack = Math.ceil(power * 0.35);
    stats.crit = Math.ceil(2 + index * 1.4);
    stats.health = Math.round(power);
  }
  return {
    id: `${Date.now().toString(36)}-${++sequence}-${Math.floor(random() * 1e6)}`,
    name: names[slot][index],
    slot,
    rarity,
    level: stage,
    stats,
    value: Math.round(8 + power * 2.6),
    ...(index >= 2 ? { effect: EFFECTS[Math.floor(random() * EFFECTS.length)] } : {}),
  };
}
/** Reproducible commissions, with fresh IDs assigned only when purchased. */
export function merchantItem(stage: number, slot: Slot): Item {
  const item = makeItem(stage, () => 0.5, stage >= 5 && slot === 'amulet' ? 'epic' : 'rare', slot);
  item.effect =
    slot === 'weapon'
      ? 'ember'
      : slot === 'chest'
        ? 'bulwark'
        : slot === 'amulet'
          ? 'focus'
          : 'siphon';
  return item;
}
export const merchantPrice = (item: Item) => item.value * 3;
export function itemScore(item: Item): number {
  return (
    item.stats.attack * 3 + item.stats.armor * 2 + item.stats.health * 0.25 + item.stats.crit * 2
  );
}

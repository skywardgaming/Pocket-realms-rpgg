import { RARITIES, SLOTS } from './types';
import type { Item, SaveData } from './types';
import { makeItem } from './loot';
export const SAVE_KEY = 'pocket-realms.save.v1';

// Combat emits several events during one reward transaction. Persist only after
// the transaction finishes, rather than storing intermediate encounter counts.
export function coalescedSave(write: () => void): () => void {
  let queued = false;
  return () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      write();
    });
  };
}
export function newSave(): SaveData {
  const equipment = Object.fromEntries(
    SLOTS.map((slot) => [slot, makeItem(1, () => 0.5, 'common', slot)]),
  ) as SaveData['equipment'];
  return {
    version: 1,
    gold: 120,
    level: 1,
    xp: 0,
    stage: 1,
    unlocked: 1,
    cleared: [],
    kills: 0,
    totalKills: 0,
    bossDefeated: false,
    hp: 999,
    equipment,
    inventory: [
      makeItem(1, () => 0.5, 'uncommon', 'weapon'),
      makeItem(1, () => 0.5, 'rare', 'amulet'),
    ],
    buildings: { blacksmith: 0, guild: 0, townhall: 0 },
    settings: { paused: false, reducedMotion: false, autoAdvance: false, autoCast: true },
    savedAt: Date.now(),
  };
}
const number = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
function validItem(item: unknown): item is Item {
  if (!item || typeof item !== 'object') return false;
  const i = item as Item;
  return (
    typeof i.id === 'string' &&
    i.id.length < 120 &&
    typeof i.name === 'string' &&
    i.name.length < 80 &&
    SLOTS.includes(i.slot) &&
    RARITIES.includes(i.rarity) &&
    number(i.level, 1, 10) &&
    number(i.value, 0, 1e6) &&
    !!i.stats &&
    ['attack', 'armor', 'health', 'crit'].every((key) =>
      number(i.stats[key as keyof Item['stats']], 0, 1e5),
    )
  );
}
export function parseSave(raw: string | null): SaveData | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as SaveData;
    if (
      s.version !== 1 ||
      !number(s.gold, 0, 1e12) ||
      !number(s.level, 1, 1000) ||
      !number(s.xp, 0, 1e9) ||
      !number(s.hp, 0, 1e8)
    )
      return null;
    if (
      ![s.stage, s.unlocked].every((n) => number(n, 1, 10) && Number.isInteger(n)) ||
      s.stage > s.unlocked
    )
      return null;
    if (
      !number(s.kills, 0, 3) ||
      !number(s.totalKills, 0, 1e9) ||
      typeof s.bossDefeated !== 'boolean'
    )
      return null;
    if (
      !Array.isArray(s.cleared) ||
      !s.cleared.every((n) => Number.isInteger(n) && n >= 1 && n <= 10)
    )
      return null;
    if (
      !s.equipment ||
      !SLOTS.every((slot) => validItem(s.equipment[slot]) && s.equipment[slot].slot === slot)
    )
      return null;
    if (!Array.isArray(s.inventory) || s.inventory.length > 60 || !s.inventory.every(validItem))
      return null;
    if (
      !s.buildings ||
      !['blacksmith', 'guild', 'townhall'].every(
        (k) =>
          number(s.buildings[k as keyof typeof s.buildings], 0, 10) &&
          Number.isInteger(s.buildings[k as keyof typeof s.buildings]),
      )
    )
      return null;
    if (
      !s.settings ||
      !['paused', 'reducedMotion', 'autoAdvance', 'autoCast'].every(
        (k) => typeof s.settings[k as keyof typeof s.settings] === 'boolean',
      )
    )
      return null;
    return s;
  } catch {
    return null;
  }
}
export class SaveStore {
  available = true;
  load(): SaveData | null {
    try {
      return parseSave(localStorage.getItem(SAVE_KEY));
    } catch {
      this.available = false;
      return null;
    }
  }
  save(data: SaveData): boolean {
    try {
      data.savedAt = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      this.available = true;
      return true;
    } catch {
      this.available = false;
      return false;
    }
  }
}

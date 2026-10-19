import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/game/engine';
import { coalescedSave, newSave, parseSave, SaveStore, SAVE_KEY } from '../src/game/save';
import { makeItem, itemScore } from '../src/game/loot';
import { upgradeCost, xpNeeded } from '../src/game/content';
import { RARITIES, SLOTS } from '../src/game/types';
import type { GameEvent } from '../src/game/types';
const random = () => 0.5;
function run(engine: GameEngine, seconds: number) {
  for (let t = 0; t < seconds; t += 0.1) engine.tick(0.1);
}
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function game() {
  return new GameEngine(newSave(), random);
}
describe('automatic combat and progression', () => {
  it('damages enemies automatically and awards gold, XP, and collected loot', () => {
    const e = game(),
      gold = e.state.gold;
    const events: GameEvent[] = [];
    e.on((event) => events.push(event));
    run(e, 12);
    expect(e.state.totalKills).toBeGreaterThan(0);
    expect(e.state.gold).toBeGreaterThan(gold);
    expect(events.some((x) => x.type === 'kill')).toBe(true);
    expect(events.some((x) => x.type === 'loot')).toBe(true);
  });
  it('pause freezes damage, recovery, and ability timers', () => {
    const e = game();
    e.state.settings.paused = true;
    const before = JSON.stringify([e.enemy, e.cooldowns, e.state]);
    run(e, 10);
    expect(JSON.stringify([e.enemy, e.cooldowns, e.state])).toBe(before);
  });
  it('ignores nonfinite or negative elapsed time', () => {
    const e = game(),
      before = JSON.stringify(e.state);
    e.tick(NaN);
    e.tick(-10);
    e.tick(Infinity);
    expect(JSON.stringify(e.state)).toBe(before);
  });
  it('unlocks the next stage after four kills and keeps farming by default', () => {
    const e = game();
    run(e, 70);
    expect(e.state.unlocked).toBe(2);
    expect(e.state.stage).toBe(1);
    expect(e.state.cleared).toEqual([1]);
  });
  it('can auto-advance and cannot travel to locked or invalid stages', () => {
    const e = game();
    expect(e.travel(2)).toBe(false);
    expect(e.travel(0)).toBe(false);
    expect(e.travel(1.5)).toBe(false);
    e.state.settings.autoAdvance = true;
    run(e, 25);
    expect(e.state.stage).toBeGreaterThan(1);
  });
  it('levels up using cumulative XP and increases base attributes', () => {
    const e = game(),
      attack = e.stats.attack;
    e.state.xp = xpNeeded(1) - 1;
    run(e, 5);
    expect(e.state.level).toBeGreaterThan(1);
    expect(e.stats.attack).toBeGreaterThan(attack);
    expect(e.state.hp).toBeLessThanOrEqual(e.stats.health);
  });
  it('recovers from defeat without losing gold, gear, or unlocks', () => {
    const e = game();
    e.state.settings.autoCast = false;
    e.state.hp = 1;
    e.enemy.attack = 10000;
    e.enemy.hp = 10000;
    const gold = e.state.gold;
    run(e, 2);
    expect(e.recovering).toBe(true);
    run(e, 4.5);
    expect(e.recovering).toBe(false);
    expect(e.state.hp).toBe(e.stats.health);
    expect(e.state.gold).toBe(gold);
  });
  it('spawns all three distinct normal enemy types', () => {
    const e = game();
    const kinds = new Set<string>();
    e.on((event) => {
      if (event.type === 'spawn') kinds.add(e.enemy.kind);
    });
    kinds.add(e.enemy.kind);
    run(e, 30);
    expect([...kinds].sort()).toEqual(['hound', 'skeleton', 'wraith']);
  });
});
describe('abilities and The Hollow King', () => {
  it('critical hits increase strike damage and emit critical combat events', () => {
    const e = new GameEngine(newSave(), () => 0);
    e.state.settings.autoCast = false;
    const events: GameEvent[] = [];
    e.on((event) => events.push(event));
    run(e, 1);
    const hit = events.find((event) => event.type === 'hit' && event.target === 'enemy');
    expect(hit?.type === 'hit' && hit.critical).toBe(true);
    expect(hit?.type === 'hit' && hit.amount).toBeGreaterThan(e.stats.attack);
  });
  it('hounds strike faster, while wraith magic bypasses half of armor', () => {
    const skeleton = game(),
      hound = game(),
      wraith = game();
    hound.state.unlocked = 3;
    hound.travel(2);
    wraith.state.unlocked = 3;
    wraith.travel(3);
    for (const e of [skeleton, hound, wraith]) {
      e.state.settings.autoCast = false;
      e.enemy.attack = 40;
      e.enemy.hp = 9999;
    }
    run(skeleton, 1.3);
    run(hound, 1.3);
    expect(hound.state.hp).toBeLessThan(skeleton.state.hp);
    run(skeleton, 0.8);
    run(wraith, 2.1);
    expect(wraith.state.hp).toBeLessThan(skeleton.state.hp);
  });
  it('uses manual cleave, blocks reuse, and respects pause', () => {
    const e = game();
    e.state.settings.autoCast = false;
    e.cooldowns.cleave = 0;
    const before = e.enemy.hp;
    expect(e.cast('cleave')).toBe(true);
    expect(e.enemy.hp).toBeLessThan(before);
    expect(e.cast('cleave')).toBe(false);
    e.cooldowns.cleave = 0;
    e.state.settings.paused = true;
    expect(e.cast('cleave')).toBe(false);
  });
  it('mends to a maximum of full health and avoids wasting healing at full HP', () => {
    const e = game();
    e.cooldowns.mend = 0;
    expect(e.cast('mend')).toBe(false);
    e.state.hp -= 10;
    expect(e.cast('mend')).toBe(true);
    expect(e.state.hp).toBe(e.stats.health);
  });
  it('ward reduces incoming damage for six seconds', () => {
    const a = game(),
      b = game();
    a.state.settings.autoCast = false;
    b.state.settings.autoCast = false;
    a.cooldowns.ward = 0;
    expect(a.cast('ward')).toBe(true);
    const start = a.state.hp;
    run(a, 1.7);
    run(b, 1.7);
    expect(start - a.state.hp).toBeLessThan(start - b.state.hp);
    expect(a.wardRemaining).toBeGreaterThan(4);
  });
  it('always enters phase two, then awards legendary loot on victory', () => {
    const e = game();
    e.state.unlocked = 10;
    e.travel(10);
    const events: GameEvent[] = [];
    e.on((event) => events.push(event));
    e.enemy.hp = e.enemy.maxHp * 0.5 + 1;
    e.cooldowns.cleave = 0;
    e.cast('cleave');
    expect(e.enemy.phase).toBe(2);
    expect(events.some((x) => x.type === 'phase')).toBe(true);
    e.enemy.hp = 1;
    run(e, 1);
    expect(e.state.bossDefeated).toBe(true);
    expect(e.state.inventory[0].rarity).toBe('legendary');
    expect(e.state.cleared).toContain(10);
  });
  it('preserves the second phase against an overpowered first-phase strike', () => {
    const e = game();
    e.state.unlocked = 10;
    e.travel(10);
    e.state.equipment.weapon.stats.attack = 100000;
    e.cooldowns.cleave = 0;
    e.cast('cleave');
    expect(e.enemy.phase).toBe(2);
    expect(e.enemy.hp).toBeGreaterThan(0);
    expect(e.state.bossDefeated).toBe(false);
  });
});
describe('equipment, economy, and town', () => {
  it('all six equipment slots change combat attributes', () => {
    for (const slot of SLOTS) {
      const e = game(),
        before = e.stats;
      const item = makeItem(5, random, 'legendary', slot);
      e.state.inventory.push(item);
      expect(e.equip(item.id)).toBe(true);
      expect(e.stats).not.toEqual(before);
      expect(e.state.inventory.some((i) => i.slot === slot)).toBe(true);
    }
  });
  it('equipping preserves health gained or lost through equipment', () => {
    const e = game(),
      item = makeItem(7, random, 'legendary', 'chest');
    e.state.inventory.push(item);
    e.equip(item.id);
    expect(e.state.hp).toBe(e.stats.health);
    const old = e.state.inventory.find((i) => i.slot === 'chest')!;
    e.equip(old.id);
    expect(e.state.hp).toBe(e.stats.health);
  });
  it('selling awards exact value once and cannot sell equipped gear', () => {
    const e = game(),
      item = e.state.inventory[0],
      gold = e.state.gold;
    expect(e.sell(item.id)).toBe(true);
    expect(e.state.gold).toBe(gold + item.value);
    expect(e.sell(item.id)).toBe(false);
    expect(e.sell(e.state.equipment.weapon.id)).toBe(false);
  });
  it('rarity and stage increase item power across the same slot', () => {
    for (const slot of SLOTS) {
      const powers = RARITIES.map((r) => itemScore(makeItem(4, random, r, slot)));
      expect(powers).toEqual([...powers].sort((a, b) => a - b));
      expect(itemScore(makeItem(9, random, 'rare', slot))).toBeGreaterThan(
        itemScore(makeItem(1, random, 'rare', slot)),
      );
    }
  });
  it('blacksmith improves equipment, guild improves XP, town hall improves health and gold', () => {
    const a = game(),
      b = game();
    a.state.gold = 10000;
    b.state.gold = 10000;
    const before = a.stats;
    for (const building of ['blacksmith', 'guild', 'townhall'] as const)
      expect(a.upgrade(building)).toBe(true);
    expect(a.stats.attack).toBeGreaterThan(before.attack);
    expect(a.stats.health).toBeGreaterThan(before.health);
    run(a, 5);
    run(b, 5);
    expect(a.state.xp).toBeGreaterThan(b.state.xp);
    const aKillGold = a.state.gold - (10000 - 90 - 110 - 130),
      bKillGold = b.state.gold - 10000;
    expect(aKillGold).toBeGreaterThan(bKillGold);
  });
  it('enforces upgrade costs, insufficient gold, and maximum building level', () => {
    const e = game();
    e.state.gold = 0;
    expect(e.upgrade('guild')).toBe(false);
    e.state.gold = 1e9;
    for (let i = 0; i < 10; i++) {
      const gold = e.state.gold,
        cost = upgradeCost('guild', i);
      expect(e.upgrade('guild')).toBe(true);
      expect(e.state.gold).toBe(gold - cost);
    }
    expect(e.upgrade('guild')).toBe(false);
    expect(e.state.buildings.guild).toBe(10);
  });
  it('automatically sells overflow loot without exceeding the 60-slot cap', () => {
    const e = game();
    while (e.state.inventory.length < 60) e.state.inventory.push(makeItem(1, random));
    const notices: GameEvent[] = [];
    e.on((event) => notices.push(event));
    run(e, 5);
    expect(e.state.inventory.length).toBe(60);
    expect(notices.some((x) => x.type === 'notice')).toBe(true);
  });
});
describe('persistent progression', () => {
  it('coalesces reward events into a complete, valid stage-clear save', async () => {
    const e = game();
    let writes = 0;
    let saved: string | null = null;
    const requestSave = coalescedSave(() => {
      writes++;
      saved = JSON.stringify(e.state);
    });
    e.on((event) => {
      if (['kill', 'loot', 'clear', 'level'].includes(event.type)) requestSave();
    });
    for (let i = 0; i < 1000 && e.state.unlocked === 1; i++) e.tick(0.1);
    expect(e.state.unlocked).toBe(2);
    expect(writes).toBe(0);
    await Promise.resolve();
    expect(writes).toBe(1);
    expect(parseSave(saved)?.unlocked).toBe(2);
    expect(parseSave(saved)?.kills).toBe(0);
  });
  it('round-trips equipment, buildings, settings, and unlocked stages', () => {
    const e = game();
    e.upgrade('blacksmith');
    e.equip(e.state.inventory[0].id);
    e.state.settings.reducedMotion = true;
    run(e, 35);
    const copy = parseSave(JSON.stringify(e.state));
    expect(copy).toEqual(e.state);
    expect(new GameEngine(copy!, random).stats).toEqual(e.stats);
  });
  it('rejects corrupt, incomplete, and out-of-bounds saves', () => {
    for (const raw of ['not json', 'null', '{}', '[]']) expect(parseSave(raw)).toBeNull();
    const mutations: ((s: ReturnType<typeof newSave>) => void)[] = [
      (s) => (s.stage = 11),
      (s) => (s.gold = -1),
      (s) => (s.inventory[0].stats.attack = -10),
      (s) => (s.buildings.guild = 100),
      (s) => (s.equipment.head.slot = 'weapon'),
      (s) => (s.settings.paused = 'yes' as unknown as boolean),
    ];
    for (const mutate of mutations) {
      const s = newSave();
      mutate(s);
      expect(parseSave(JSON.stringify(s))).toBeNull();
    }
  });
  it('handles blocked browser storage without crashing', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('storage denied');
      },
    });
    const store = new SaveStore();
    expect(store.load()).toBeNull();
    expect(store.save(newSave())).toBe(false);
    expect(store.available).toBe(false);
    Reflect.deleteProperty(globalThis, 'localStorage');
  });
  it('writes and reads the versioned localStorage key', () => {
    const data = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        setItem: (k: string, v: string) => data.set(k, v),
        getItem: (k: string) => data.get(k) ?? null,
      },
    });
    const store = new SaveStore(),
      s = newSave();
    expect(store.save(s)).toBe(true);
    expect(data.has(SAVE_KEY)).toBe(true);
    expect(store.load()).toEqual(s);
    Reflect.deleteProperty(globalThis, 'localStorage');
  });
  it('completes a seeded ten-stage campaign through loot and town investment', () => {
    const e = new GameEngine(newSave(), rng(1937));
    e.state.settings.autoAdvance = true;
    let elapsed = 0;
    while (!e.state.bossDefeated && elapsed < 7200) {
      run(e, 1);
      elapsed++;
      if (elapsed % 5 === 0) {
        for (const item of [...e.state.inventory]) {
          if (itemScore(item) > itemScore(e.state.equipment[item.slot])) e.equip(item.id);
        }
        for (const item of [...e.state.inventory]) e.sell(item.id);
        for (const building of ['blacksmith', 'guild', 'townhall'] as const)
          if (e.state.buildings[building] < 7) e.upgrade(building);
      }
      expect(e.state.hp).toBeGreaterThanOrEqual(0);
      expect(e.state.hp).toBeLessThanOrEqual(e.stats.health);
      expect(e.state.gold).toBeGreaterThanOrEqual(0);
    }
    expect(e.state.bossDefeated).toBe(true);
    expect(e.state.cleared).toHaveLength(10);
    expect(e.state.stage).toBe(10);
    expect(elapsed).toBeLessThan(3600);
  });
});

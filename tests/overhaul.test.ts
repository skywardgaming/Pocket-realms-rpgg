import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/game/engine';
import { makeItem, merchantItem, merchantPrice } from '../src/game/loot';
import { newSave, parseSave } from '../src/game/save';
import { EFFECTS, SLOTS } from '../src/game/types';
import type { EquipmentEffect, GameEvent } from '../src/game/types';
import { THEMES } from '../src/render/themes';

function game(stage = 1) {
  const state = newSave();
  state.unlocked = 10;
  state.settings.autoCast = false;
  state.equipment.chest.stats.health = 10000;
  const e = new GameEngine(state, () => 0.5);
  e.travel(stage);
  e.enemy.hp = e.enemy.maxHp = 1e6;
  return e;
}
function run(e: GameEngine, seconds: number) {
  for (let i = 0; i < Math.round(seconds * 20); i++) e.tick(0.05);
}
function windup(e: GameEngine) {
  for (let i = 0; i < 300 && !e.intent; i++) e.tick(0.05);
  expect(e.intent).not.toBeNull();
}
function effect(e: GameEngine, kind: EquipmentEffect, count = 1) {
  for (const slot of SLOTS.slice(0, count)) e.state.equipment[slot].effect = kind;
}
function kill(e: GameEngine) {
  e.enemy.hp = 1;
  e.cooldowns.cleave = 0;
  expect(e.cast('cleave')).toBe(true);
}

describe('new relic traits and meaningful equipment choices', () => {
  it('creates traits only on rare or better new loot, without changing old items', () => {
    for (const rarity of ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const) {
      const item = makeItem(5, () => 0.5, rarity);
      expect(!!item.effect).toBe(['rare', 'epic', 'legendary'].includes(rarity));
      if (item.effect) expect(EFFECTS).toContain(item.effect);
    }
  });
  it('caps trait stacking at three relics and updates immediately on equip', () => {
    const e = game();
    effect(e, 'focus', 6);
    expect(e.effects.focus).toBe(3);
    const item = makeItem(4, () => 0.5, 'rare', 'weapon');
    item.effect = 'siphon';
    e.state.inventory.push(item);
    e.equip(item.id);
    expect(e.effects.siphon).toBe(1);
    expect(e.effects.focus).toBe(3);
  });
  it('ember improves basic damage while preserving the stated cleave multiplier', () => {
    const a = game(),
      b = game();
    effect(a, 'ember', 3);
    run(a, 1);
    run(b, 1);
    expect(a.enemy.maxHp - a.enemy.hp).toBeGreaterThan(b.enemy.maxHp - b.enemy.hp);
    for (const e of [a, b]) e.cooldowns.cleave = 0;
    const beforeA = a.enemy.hp,
      beforeB = b.enemy.hp;
    a.cast('cleave');
    b.cast('cleave');
    expect(beforeA - a.enemy.hp).toBe(beforeB - b.enemy.hp);
  });
  it('siphon heals from dealt damage and cannot overheal or exploit overkill', () => {
    const e = game();
    effect(e, 'siphon', 3);
    e.state.hp -= 20;
    const before = e.state.hp;
    run(e, 1);
    expect(e.state.hp).toBeGreaterThan(before);
    e.state.hp = e.stats.health - 1;
    run(e, 0.95);
    expect(e.state.hp).toBeLessThanOrEqual(e.stats.health);
    const events: GameEvent[] = [];
    e.on((event) => events.push(event));
    e.state.hp -= 100;
    kill(e);
    expect(events.filter((event) => event.type === 'heal')).toHaveLength(0);
  });
  it('focus accelerates cooldowns and freezes them on pause', () => {
    const a = game(),
      b = game();
    effect(a, 'focus', 3);
    a.cooldowns.cleave = b.cooldowns.cleave = 9;
    run(a, 2);
    run(b, 2);
    expect(a.cooldowns.cleave).toBeCloseTo(6.52);
    expect(b.cooldowns.cleave).toBeCloseTo(7);
    a.state.settings.paused = true;
    run(a, 2);
    expect(a.cooldowns.cleave).toBeCloseTo(6.52);
  });
  it('oathguard reduces incoming damage and combines with Void Ward', () => {
    const a = game(),
      b = game(),
      c = game();
    effect(a, 'bulwark', 3);
    effect(c, 'bulwark', 3);
    c.cooldowns.ward = 0;
    c.cast('ward');
    for (const e of [a, b, c]) {
      e.enemy.attack = 100;
      run(e, 1.7);
    }
    const damage = (e: GameEngine) => e.stats.health - e.state.hp;
    expect(damage(a)).toBeLessThan(damage(b));
    expect(damage(c)).toBeLessThan(damage(a));
  });
});

describe('enemy wind-ups and the Hollow King', () => {
  it('adds acolytes and guardians after the opening stages', () => {
    expect(game(4).enemy.kind).toBe('cultist');
    expect(game(5).enemy.kind).toBe('golem');
    expect(game(1).enemy.kind).toBe('skeleton');
    expect(game(2).enemy.kind).toBe('hound');
    expect(game(3).enemy.kind).toBe('wraith');
  });
  it('warns before a heavy attack, then resolves it exactly once', () => {
    const e = game(10),
      events: GameEvent[] = [];
    e.on((event) => events.push(event));
    windup(e);
    expect(e.intent?.name).toBe('Royal Reckoning');
    const hp = e.state.hp;
    run(e, 0.5);
    expect(e.state.hp).toBe(hp);
    run(e, 1.3);
    expect(e.state.hp).toBeLessThan(hp);
    expect(events.filter((event) => event.type === 'enemyAbility')).toHaveLength(1);
  });
  it('lets a player time Ward against a telegraphed heavy attack', () => {
    const a = game(10),
      b = game(10);
    windup(a);
    windup(b);
    a.cooldowns.ward = 0;
    a.cast('ward');
    const hpA = a.state.hp,
      hpB = b.state.hp;
    run(a, 1.8);
    run(b, 1.8);
    expect(hpA - a.state.hp).toBeLessThan((hpB - b.state.hp) * 0.5);
  });
  it('pauses pending wind-ups and cancels them on travel or enemy death', () => {
    const e = game(2);
    windup(e);
    const remaining = e.intent?.remaining;
    e.state.settings.paused = true;
    run(e, 5);
    expect(e.intent?.remaining).toBe(remaining);
    e.state.settings.paused = false;
    e.travel(2);
    expect(e.intent).toBeNull();
    e.enemy.hp = e.enemy.maxHp = 1e6;
    windup(e);
    kill(e);
    expect(e.intent).toBeNull();
  });
  it('cancels an old wind-up on awakening and gives phase two its own attack', () => {
    const e = game(10);
    windup(e);
    e.enemy.hp = e.enemy.maxHp / 2 + 1;
    e.cooldowns.cleave = 0;
    e.cast('cleave');
    expect(e.enemy.phase).toBe(2);
    expect(e.intent).toBeNull();
    windup(e);
    expect(e.intent?.name).toBe('Crown of Ruin');
    expect(e.intent?.duration).toBe(1.2);
  });
  it('makes guardians resist normal strikes while cleave bypasses their shell', () => {
    const a = game(5),
      b = game(1);
    run(a, 1);
    run(b, 1);
    expect(a.enemy.maxHp - a.enemy.hp).toBeCloseTo((b.enemy.maxHp - b.enemy.hp) * 0.8);
    const before = a.enemy.hp;
    a.cooldowns.cleave = 0;
    a.cast('cleave');
    expect(before - a.enemy.hp).toBe(Math.round(a.stats.attack * 2.8));
  });
  it('gives acolytes a bounded siphon heal after their warning', () => {
    const e = game(4);
    e.enemy.hp = 900000;
    e.enemy.attack = 1000;
    windup(e);
    const hp = e.enemy.hp;
    run(e, 1.5);
    expect(e.enemy.hp).toBeGreaterThan(hp);
    expect(e.enemy.hp).toBeLessThanOrEqual(e.enemy.maxHp);
  });
});

describe('merchant, events, milestones, and compatible persistence', () => {
  it('commissions reproducible relics for exact gold and creates distinct item IDs', () => {
    const e = game();
    e.state.gold = 10000;
    const offer = merchantItem(10, 'amulet'),
      cost = merchantPrice(offer);
    expect(e.buy('amulet')).toBe(true);
    expect(e.state.gold).toBe(10000 - cost);
    expect(e.state.inventory[0].stats).toEqual(offer.stats);
    expect(e.state.inventory[0].rarity).toBe('epic');
    const first = e.state.inventory[0].id;
    e.buy('amulet');
    expect(e.state.inventory[0].id).not.toBe(first);
  });
  it('rejects unaffordable commissions, full packs, and invalid slots atomically', () => {
    const e = game();
    e.state.gold = 0;
    expect(e.buy('weapon')).toBe(false);
    e.state.gold = 10000;
    while (e.state.inventory.length < 60) e.state.inventory.push(makeItem(1));
    const before = JSON.stringify(e.state);
    expect(e.buy('chest')).toBe(false);
    expect(e.buy('invalid' as 'weapon')).toBe(false);
    expect(JSON.stringify(e.state)).toBe(before);
  });
  it('awards first-clear gold once and a guaranteed epic at the sixth milestone', () => {
    const e = game(6),
      events: GameEvent[] = [];
    e.on((event) => events.push(event));
    e.state.kills = 3;
    kill(e);
    expect(e.state.cleared).toContain(6);
    expect(e.state.inventory.some((i) => i.rarity === 'epic')).toBe(true);
    expect(
      events.filter((event) => event.type === 'encounter' && event.name === 'First light bounty'),
    ).toHaveLength(1);
    e.travel(6);
    e.state.kills = 3;
    kill(e);
    expect(
      events.filter((event) => event.type === 'encounter' && event.name === 'First light bounty'),
    ).toHaveLength(1);
  });
  it('rotates caches, cooldown shrines, and healing springs every five victories', () => {
    const names: string[] = [];
    for (const total of [4, 9, 14]) {
      const e = game();
      e.state.totalKills = total;
      e.on((event) => {
        if (event.type === 'encounter') names.push(event.name);
      });
      e.state.hp -= 100;
      e.cooldowns.mend = 10;
      kill(e);
      if (total === 9) expect(e.cooldowns.mend).toBe(6);
      expect(e.state.hp).toBeLessThanOrEqual(e.stats.health);
    }
    expect(names).toEqual(['Forgotten cache', 'Astral shrine', 'Crimson spring']);
  });
  it('loads actual legacy-shaped saves without changing gold, gear, health, or progress', () => {
    const legacy = newSave();
    legacy.gold = 12345;
    legacy.unlocked = 8;
    legacy.stage = 7;
    legacy.cleared = [1, 2, 3, 4, 5, 6];
    const raw = JSON.parse(JSON.stringify(legacy));
    delete raw.settings.sound;
    delete raw.settings.music;
    for (const item of [...Object.values(raw.equipment), ...raw.inventory])
      delete (item as { effect?: string }).effect;
    const loaded = parseSave(JSON.stringify(raw));
    expect(loaded).toEqual({ ...raw, settings: { ...raw.settings, sound: false, music: false } });
    expect(loaded?.equipment).toEqual(raw.equipment);
  });
  it('round trips all new traits and settings and rejects malformed additive fields', () => {
    const s = newSave();
    s.settings.sound = s.settings.music = true;
    s.equipment.weapon.effect = 'siphon';
    expect(parseSave(JSON.stringify(s))).toEqual(s);
    const bad = JSON.parse(JSON.stringify(s));
    bad.equipment.weapon.effect = 'infinite-power';
    expect(parseSave(JSON.stringify(bad))).toBeNull();
    bad.equipment.weapon.effect = 'focus';
    bad.settings.sound = 'yes';
    expect(parseSave(JSON.stringify(bad))).toBeNull();
  });
  it('provides ten distinct environment directions for the ten retained stages', () => {
    expect(THEMES).toHaveLength(10);
    expect(new Set(THEMES.map((theme) => theme.motif)).size).toBe(10);
  });
});

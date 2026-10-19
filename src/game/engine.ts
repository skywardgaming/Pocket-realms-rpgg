import { ABILITIES, ENEMIES, upgradeCost, xpNeeded } from './content';
import { makeItem } from './loot';
import type { Ability, Building, Enemy, GameEvent, SaveData, Stats } from './types';
export class GameEngine {
  enemy!: Enemy;
  cooldowns: Record<Ability, number> = { cleave: 2, mend: 5, ward: 8 };
  wardRemaining = 0;
  respawnRemaining = 0;
  recovering = false;
  private heroClock = 0;
  private enemyClock = 0;
  private listeners = new Set<(event: GameEvent) => void>();
  constructor(
    public state: SaveData,
    private random: () => number = Math.random,
  ) {
    this.state.hp = Math.min(this.state.hp, this.stats.health);
    if (this.state.hp <= 0) this.state.hp = this.stats.health;
    this.spawn();
  }
  get stats(): Stats {
    const boost = 1 + this.state.buildings.blacksmith * 0.08;
    const result: Stats = {
      attack: 11 + this.state.level * 2.6,
      armor: this.state.level,
      health: 150 + this.state.level * 19 + this.state.buildings.townhall * 12,
      crit: 8,
    };
    for (const item of Object.values(this.state.equipment))
      for (const key of ['attack', 'armor', 'health', 'crit'] as const)
        result[key] += item.stats[key] * boost;
    result.crit = Math.min(65, result.crit);
    for (const key of ['attack', 'armor', 'health'] as const) result[key] = Math.round(result[key]);
    return result;
  }
  on(listener: (event: GameEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private emit(event: GameEvent) {
    for (const listener of this.listeners) listener(event);
  }
  private spawn() {
    const stage = this.state.stage;
    const kind =
      stage === 10
        ? 'king'
        : (['skeleton', 'hound', 'wraith'] as const)[(stage + this.state.kills - 1) % 3];
    const archetype = ENEMIES[kind];
    const hp =
      stage === 10
        ? 2600
        : Math.round((53 + stage * 7) * Math.pow(1.36, stage - 1) * archetype.health);
    this.enemy = {
      kind,
      name: archetype.name,
      hp,
      maxHp: hp,
      attack: stage === 10 ? 54 : Math.round(7 * Math.pow(1.23, stage - 1)),
      phase: 1,
    };
    this.heroClock = 0;
    this.enemyClock = 0;
    this.emit({ type: 'spawn' });
  }
  tick(seconds: number) {
    if (this.state.settings.paused || !Number.isFinite(seconds) || seconds <= 0) return;
    const dt = Math.min(seconds, 0.25);
    for (const ability of Object.keys(this.cooldowns) as Ability[])
      this.cooldowns[ability] = Math.max(0, this.cooldowns[ability] - dt);
    this.wardRemaining = Math.max(0, this.wardRemaining - dt);
    if (this.respawnRemaining > 0) {
      this.respawnRemaining -= dt;
      if (this.respawnRemaining <= 0) {
        if (this.recovering) {
          this.state.hp = this.stats.health;
          this.recovering = false;
        }
        this.spawn();
      }
      return;
    }
    if (this.state.settings.autoCast) {
      if (this.cooldowns.cleave <= 0) this.cast('cleave');
      if (this.respawnRemaining > 0) return;
      if (this.state.hp < this.stats.health * 0.65) this.cast('mend');
      if (this.enemy.kind === 'king' || this.state.hp < this.stats.health * 0.5) this.cast('ward');
    }
    this.heroClock += dt;
    this.enemyClock += dt;
    if (this.heroClock >= 0.95) {
      this.heroClock -= 0.95;
      this.attackEnemy(1, false);
    }
    if (this.respawnRemaining > 0) return;
    if (this.enemyClock >= (this.enemy.phase === 2 ? 1.1 : ENEMIES[this.enemy.kind].interval)) {
      this.enemyClock = 0;
      const damage = Math.max(
        1,
        Math.round(
          this.enemy.attack *
            (this.enemy.phase === 2 ? 1.45 : 1) *
            (100 / (100 + this.stats.armor * 3 * ENEMIES[this.enemy.kind].armorScale)) *
            (this.wardRemaining > 0 ? 0.45 : 1),
        ),
      );
      this.state.hp = Math.max(0, this.state.hp - damage);
      this.emit({
        type: 'hit',
        target: 'hero',
        amount: damage,
        critical: false,
        magic: this.enemy.kind === 'wraith' || this.enemy.phase === 2,
      });
      if (this.state.hp <= 0) {
        this.recovering = true;
        this.respawnRemaining = 4;
        this.state.kills = 0;
        this.emit({ type: 'death' });
      }
    }
  }
  private attackEnemy(multiplier: number, magic: boolean) {
    if (this.enemy.hp <= 0) return;
    const critical = this.random() * 100 < this.stats.crit;
    const damage = Math.round(
      this.stats.attack * multiplier * (0.9 + this.random() * 0.2) * (critical ? 1.85 : 1),
    );
    this.enemy.hp = Math.max(0, this.enemy.hp - damage);
    this.emit({ type: 'hit', target: 'enemy', amount: damage, critical, magic });
    if (
      this.enemy.kind === 'king' &&
      this.enemy.phase === 1 &&
      this.enemy.hp <= this.enemy.maxHp * 0.5
    ) {
      // The king always enters phase two, even if a powerful strike crosses zero.
      this.enemy.phase = 2;
      this.enemy.hp = Math.max(this.enemy.hp, this.enemy.maxHp * 0.35);
      this.emit({ type: 'phase' });
    }
    if (this.enemy.hp <= 0) this.defeatEnemy();
  }
  cast(ability: Ability): boolean {
    if (
      !(ability in ABILITIES) ||
      this.state.settings.paused ||
      this.respawnRemaining > 0 ||
      this.cooldowns[ability] > 0
    )
      return false;
    if (ability === 'mend' && this.state.hp >= this.stats.health) return false;
    this.cooldowns[ability] = ABILITIES[ability].cooldown;
    this.emit({ type: 'ability', ability });
    if (ability === 'cleave') this.attackEnemy(2.8, true);
    if (ability === 'mend') {
      const amount = Math.min(
        this.stats.health - this.state.hp,
        Math.round(this.stats.health * 0.32),
      );
      this.state.hp += amount;
      this.emit({ type: 'heal', amount });
    }
    if (ability === 'ward') this.wardRemaining = 6;
    return true;
  }
  private defeatEnemy() {
    const s = this.state;
    const gold = Math.round(
      (15 + s.stage * 7) * (1 + s.buildings.townhall * 0.15) * (s.stage === 10 ? 8 : 1),
    );
    const xp = Math.round(
      (20 + s.stage * 9) * (1 + s.buildings.guild * 0.15) * (s.stage === 10 ? 5 : 1),
    );
    s.gold += gold;
    s.xp += xp;
    s.totalKills++;
    s.kills++;
    this.emit({ type: 'kill', gold, xp });
    while (s.level < 1000 && s.xp >= xpNeeded(s.level)) {
      s.xp -= xpNeeded(s.level);
      s.level++;
      s.hp = this.stats.health;
      this.emit({ type: 'level', level: s.level });
    }
    const cleared = s.kills >= 4 || s.stage === 10;
    if (this.random() < 0.72 || cleared) {
      const item = makeItem(s.stage, this.random, s.stage === 10 ? 'legendary' : undefined);
      if (s.inventory.length < 60) {
        s.inventory.unshift(item);
        this.emit({ type: 'loot', item });
      } else {
        s.gold += item.value;
        this.emit({ type: 'notice', text: `Pack full. ${item.name} sold for ${item.value} gold.` });
      }
    }
    if (cleared) {
      const first = !s.cleared.includes(s.stage);
      if (first) s.cleared.push(s.stage);
      s.unlocked = Math.max(s.unlocked, Math.min(10, s.stage + 1));
      if (s.stage === 10) s.bossDefeated = true;
      this.emit({ type: 'clear', stage: s.stage, first });
      s.kills = 0;
      if (s.settings.autoAdvance && s.stage < 10) s.stage++;
    }
    s.hp = Math.min(this.stats.health, s.hp + Math.round(this.stats.health * 0.09));
    this.respawnRemaining = 1.5;
  }
  travel(stage: number): boolean {
    if (!Number.isInteger(stage) || stage < 1 || stage > this.state.unlocked) return false;
    this.state.stage = stage;
    this.state.kills = 0;
    this.state.hp = this.stats.health;
    this.respawnRemaining = 0;
    this.recovering = false;
    this.cooldowns = { cleave: 2, mend: 5, ward: 8 };
    this.wardRemaining = 0;
    this.spawn();
    return true;
  }
  equip(id: string): boolean {
    const index = this.state.inventory.findIndex((i) => i.id === id);
    if (index === -1) return false;
    const oldMax = this.stats.health;
    const item = this.state.inventory[index];
    this.state.inventory[index] = this.state.equipment[item.slot];
    this.state.equipment[item.slot] = item;
    this.state.hp = Math.max(
      1,
      Math.min(this.stats.health, this.state.hp + this.stats.health - oldMax),
    );
    return true;
  }
  sell(id: string): boolean {
    const index = this.state.inventory.findIndex((i) => i.id === id);
    if (index < 0) return false;
    this.state.gold += this.state.inventory[index].value;
    this.state.inventory.splice(index, 1);
    return true;
  }
  upgrade(building: Building): boolean {
    if (!Object.hasOwn(this.state.buildings, building)) return false;
    const level = this.state.buildings[building];
    const cost = upgradeCost(building, level);
    if (level >= 10 || this.state.gold < cost) return false;
    const oldMax = this.stats.health;
    this.state.gold -= cost;
    this.state.buildings[building]++;
    this.state.hp += this.stats.health - oldMax;
    return true;
  }
}

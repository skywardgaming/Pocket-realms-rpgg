import Phaser from 'phaser';
import type { GameEngine } from '../game/engine';
import type { GameEvent } from '../game/types';
import { characterSheet, dungeonArt, seeded } from './art';
import { stageTheme } from './themes';
export class DungeonScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.Image;
  private hero!: Phaser.GameObjects.Sprite;
  private enemySprite!: Phaser.GameObjects.Sprite;
  private lighting: Phaser.GameObjects.Image[] = [];
  private renderedStage = 0;
  private worldTime = 0;
  private shadows!: Phaser.GameObjects.Graphics;
  private effects!: Phaser.GameObjects.Graphics;
  private motes: Phaser.GameObjects.Rectangle[] = [];
  private fog: Phaser.GameObjects.Ellipse[] = [];
  private bars!: Phaser.GameObjects.Graphics;
  private heroX = 0;
  private enemyX = 0;
  private ground = 0;
  private unsubscribe?: () => void;
  private ready = false;
  private visualKey = '';
  private announcement?: Phaser.GameObjects.Text;
  constructor(private engine: GameEngine) {
    super('dungeon');
  }
  create() {
    this.textures.addCanvas('dungeon', dungeonArt(this.engine.state.stage));
    this.renderedStage = this.engine.state.stage;
    for (const key of [
      'hero',
      'skeleton',
      'hound',
      'wraith',
      'cultist',
      'golem',
      'king',
    ] as const) {
      const { sheet, width, height } = characterSheet(key);
      const texture = this.textures.addCanvas(key, sheet)!;
      this.textures.addSpriteSheet('', texture, { frameWidth: width, frameHeight: height });
      this.anims.create({
        key: `${key}-idle`,
        frames: this.anims.generateFrameNumbers(key, { start: 0, end: 3 }),
        frameRate: key === 'hound' ? 6 : 4,
        repeat: -1,
      });
      this.anims.create({
        key: `${key}-attack`,
        frames: this.anims.generateFrameNumbers(key, { start: 4, end: 6 }),
        frameRate: 15,
      });
    }
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 64;
    glowCanvas.height = 64;
    const gc = glowCanvas.getContext('2d')!;
    const gradient = gc.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, '#ffffffa0');
    gradient.addColorStop(0.3, '#ffffff44');
    gradient.addColorStop(1, '#ffffff00');
    gc.fillStyle = gradient;
    gc.fillRect(0, 0, 64, 64);
    this.textures.addCanvas('glow', glowCanvas);
    this.background = this.add.image(0, 0, 'dungeon').setOrigin(0.5);
    this.shadows = this.add.graphics();
    for (let i = 0; i < 3; i++)
      this.lighting.push(
        this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(2).setAlpha(0.25),
      );
    this.hero = this.add.sprite(0, 0, 'hero').setOrigin(0.5, 1).setDepth(4);
    this.enemySprite = this.add.sprite(0, 0, this.engine.enemy.kind).setOrigin(0.5, 1).setDepth(4);
    this.hero.play('hero-idle');
    this.enemySprite.play(`${this.engine.enemy.kind}-idle`);
    for (const sprite of [this.hero, this.enemySprite])
      sprite.on('animationcomplete', () => sprite.play(`${sprite.texture.key}-idle`));
    this.effects = this.add.graphics().setDepth(3);
    this.bars = this.add.graphics().setDepth(6);
    const random = seeded(361);
    for (let i = 0; i < 23; i++)
      this.motes.push(
        this.add
          .rectangle(
            random() * this.scale.width,
            random() * this.scale.height,
            1 + (i % 2),
            1 + (i % 2),
            i % 3 ? 0xc38d52 : 0x9980c3,
            0.15 + random() * 0.5,
          )
          .setDepth(2),
      );
    for (let i = 0; i < 4; i++)
      this.fog.push(this.add.ellipse(0, 0, 250, 30, 0x9cafb4, 0.018).setDepth(5));
    this.scale.on('resize', this.layout, this);
    this.layout();
    this.unsubscribe = this.engine.on((event) => this.event(event));
    this.events.once('shutdown', () => {
      this.unsubscribe?.();
      this.scale.off('resize', this.layout, this);
    });
    this.ready = true;
  }
  private layout() {
    const w = this.scale.width,
      h = this.scale.height;
    if (this.announcement?.active)
      this.announcement.setPosition(w / 2, h * 0.35).setFontSize(w < 500 ? '15px' : '21px');
    const s = Math.max(w / 640, h / 360);
    this.background.setPosition(w / 2, h / 2).setScale(s);
    const theme = stageTheme(this.engine.state.stage);
    this.lighting.forEach((light, i) =>
      light
        .setPosition(w * [0.2, 0.5, 0.8][i], h * [0.43, 0.6, 0.43][i])
        .setDisplaySize(w * 0.65, h * 0.9)
        .setTint(Phaser.Display.Color.HexStringToColor(i === 1 ? theme.magic : theme.light).color),
    );
    this.heroX = w * 0.29;
    this.enemyX = w * 0.72;
    this.ground = h * 0.83;
    const cs = Phaser.Math.Clamp(w / 400, 1.35, 2.15);
    this.hero.setPosition(this.heroX, this.ground).setScale(cs);
    this.enemySprite
      .setPosition(this.enemyX, this.ground)
      .setScale(this.engine.enemy.kind === 'king' ? cs * 0.93 : cs);
    this.shadows
      .clear()
      .fillStyle(0x040a0e, 0.5)
      .fillEllipse(this.heroX, this.ground - 3, cs * 46, cs * 10)
      .fillEllipse(
        this.enemyX,
        this.ground - 3,
        cs * (this.engine.enemy.kind === 'king' ? 75 : 43),
        cs * 11,
      );
    this.fog.forEach((f, i) =>
      f.setPosition(w * (i * 0.32), h * 0.83 + i * 9).setDisplaySize(w * 0.8, 35),
    );
  }
  private event(event: GameEvent) {
    if (!this.ready) return;
    const reduced = this.engine.state.settings.reducedMotion;
    if (event.type === 'ability' && event.ability === 'cleave' && !reduced) {
      const trail = this.add.graphics().setDepth(6);
      for (let i = 0; i < 3; i++)
        trail
          .lineStyle(7 - i * 2, i === 2 ? 0xf0dfff : 0xb27bfa, 0.2 + i * 0.25)
          .lineBetween(
            this.heroX + 20,
            this.ground - 60 + i * 5,
            this.enemyX,
            this.ground - 45 + i * 5,
          );
      this.tweens.add({
        targets: trail,
        alpha: 0,
        duration: 350,
        onComplete: () => trail.destroy(),
      });
    }
    if (event.type === 'spawn') {
      this.tweens.killTweensOf(this.enemySprite);
      this.enemySprite.setTexture(this.engine.enemy.kind).clearTint().setAlpha(1);
      this.enemySprite.play(`${this.engine.enemy.kind}-idle`);
      this.layout();
      if (!reduced) {
        this.enemySprite.setAlpha(0);
        this.tweens.add({ targets: this.enemySprite, alpha: 1, duration: 500 });
      }
    }
    if (event.type === 'hit') {
      const victim = event.target === 'enemy' ? this.enemySprite : this.hero;
      const attacker = event.target === 'enemy' ? this.hero : this.enemySprite;
      const x = event.target === 'enemy' ? this.enemyX : this.heroX;
      this.damageText(
        x,
        this.ground - victim.displayHeight * 0.7,
        event.amount,
        event.critical,
        event.target === 'hero' ? '#e5937e' : event.magic ? '#cba8fa' : '#efe3bf',
      );
      if (!reduced) {
        attacker.play(`${attacker.texture.key}-attack`, true);
        victim.setTintFill(event.magic ? 0xbc98ec : 0xd9c8ab);
        this.time.delayedCall(100, () => {
          if (victim === this.enemySprite && this.engine.enemy.phase === 2)
            victim.setTint(0xb29acf);
          else victim.clearTint();
        });
        this.tweens.add({
          targets: attacker,
          x: attacker.x + (event.target === 'enemy' ? 17 : -12),
          duration: 100,
          yoyo: true,
        });
        this.slash(
          x,
          this.ground - victim.displayHeight * 0.5,
          event.magic ? 0xc59aee : 0xf0d5a2,
          event.critical,
        );
        this.particles(
          x,
          this.ground - victim.displayHeight * 0.5,
          event.magic ? 0xac80db : 0xbd7455,
          event.critical ? 16 : 7,
        );
        if (event.critical) this.cameras.main.shake(95, 0.002);
      }
      if (event.target === 'enemy' && this.engine.enemy.hp <= 0 && !reduced)
        this.tweens.add({
          targets: this.enemySprite,
          alpha: 0,
          y: this.enemySprite.y + 10,
          duration: 550,
        });
    }
    if (event.type === 'heal') {
      this.damageText(
        this.heroX,
        this.ground - this.hero.displayHeight,
        event.amount,
        false,
        '#9dd8ab',
        '+',
      );
      if (!reduced) this.particles(this.heroX, this.ground - 40, 0x88c39c, 14);
    }
    if (event.type === 'loot') {
      const color =
        event.item.rarity === 'legendary'
          ? 0xf6c46d
          : event.item.rarity === 'epic'
            ? 0xc39aed
            : 0xccb47a;
      const beam = this.add
        .rectangle(this.enemyX, this.ground - 55, 18, 120, color, 0.16)
        .setDepth(3);
      const gem = this.add
        .rectangle(this.enemyX, this.ground - 15, 8, 8, color, 1)
        .setAngle(45)
        .setDepth(5);
      this.tweens.add({
        targets: [beam, gem],
        alpha: 0,
        duration: reduced ? 500 : 1800,
        onComplete: () => {
          beam.destroy();
          gem.destroy();
        },
      });
      if (!reduced) this.particles(this.enemyX, this.ground - 12, color, 18);
      if (event.item.rarity === 'legendary') this.banner('LEGENDARY RELIC DISCOVERED', '#ffe0a0');
    }
    if (event.type === 'phase') {
      this.tweens.killTweensOf(this.enemySprite);
      this.enemySprite.setAlpha(1).setTint(0xb29acf);
      this.layout();
      if (!reduced) {
        this.cameras.main.flash(450, 80, 40, 110, false);
        this.cameras.main.shake(500, 0.006);
        this.particles(this.enemyX, this.ground - 60, 0xbc8eff, 40);
      }
      this.banner('THE CROWN AWAKENS', '#c6a0e7');
    }
    if (event.type === 'telegraph' && !reduced)
      this.particles(this.enemyX, this.ground - 50, 0xef6990, 16);
    if (event.type === 'enemyAbility' && !reduced) {
      this.slash(this.heroX, this.ground - 50, 0xff668b, true);
      this.particles(this.heroX, this.ground - 30, 0xb995ff, 20);
    }
    if (event.type === 'encounter') this.banner(event.name.toUpperCase(), '#e7c58c');
    if (event.type === 'level') this.banner(`LEVEL ${event.level} · ASCENDED`, '#e0c185');
    if (event.type === 'death') this.banner('A MOMENT TO RECOVER', '#d0a293');
    if (event.type === 'clear' && event.first)
      this.banner(
        event.stage === 10 ? 'THE HOLLOW KING HAS FALLEN' : 'PASSAGE DISCOVERED',
        '#e0c185',
      );
  }
  private slash(x: number, y: number, color: number, critical: boolean) {
    const g = this.add.graphics().setDepth(6);
    g.lineStyle(critical ? 5 : 3, color, 0.9);
    g.beginPath();
    g.arc(x, y, 30, -1.3, 1.2);
    g.strokePath();
    g.lineStyle(1, 0xffffff, 0.65);
    g.beginPath();
    g.arc(x + 4, y, 32, -1.3, 0.5);
    g.strokePath();
    this.tweens.add({
      targets: g,
      alpha: 0,
      angle: 25,
      duration: 260,
      onComplete: () => g.destroy(),
    });
  }
  private particles(x: number, y: number, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const p = this.add.rectangle(x, y, 2 + (i % 2), 2 + (i % 2), color, 1).setDepth(7);
      const angle = Math.random() * Math.PI * 2,
        d = 20 + Math.random() * 48;
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * d,
        y: y + Math.sin(angle) * d,
        alpha: 0,
        duration: 350 + Math.random() * 500,
        onComplete: () => p.destroy(),
      });
    }
  }
  private damageText(
    x: number,
    y: number,
    amount: number,
    critical: boolean,
    color: string,
    prefix = '',
  ) {
    const text = this.add
      .text(x + (Math.random() - 0.5) * 20, y, `${prefix}${amount}${critical ? '!' : ''}`, {
        fontFamily: 'Georgia, serif',
        fontSize: critical ? '27px' : '20px',
        fontStyle: 'bold',
        color,
        stroke: '#10151b',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.tweens.add({
      targets: text,
      y: y - (this.engine.state.settings.reducedMotion ? 5 : 42),
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy(),
    });
  }
  private banner(message: string, color: string) {
    this.announcement?.destroy();
    const t = this.add
      .text(this.scale.width / 2, this.scale.height * 0.35, message, {
        fontFamily: 'Georgia,serif',
        fontSize: this.scale.width < 500 ? '15px' : '21px',
        color,
        letterSpacing: 3,
        stroke: '#10151b',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(11);
    this.announcement = t;
    this.tweens.add({
      targets: t,
      alpha: 0,
      delay: 1700,
      duration: 700,
      onComplete: () => t.destroy(),
    });
  }
  update(_time: number, dt: number) {
    if (!this.ready) return;
    const paused = this.engine.state.settings.paused;
    const reduced = this.engine.state.settings.reducedMotion;
    for (const sprite of [this.hero, this.enemySprite]) {
      if (paused || reduced) sprite.anims.pause();
      else sprite.anims.resume();
    }
    if (paused) this.tweens.pauseAll();
    else this.tweens.resumeAll();
    if (!paused && !reduced) this.worldTime += Math.min(dt, 100);
    const time = this.worldTime;
    if (this.renderedStage !== this.engine.state.stage) {
      const old = this.background.texture.key;
      const next = `dungeon-${this.engine.state.stage}`;
      this.textures.addCanvas(next, dungeonArt(this.engine.state.stage));
      this.background.setTexture(next);
      this.textures.remove(old);
      this.renderedStage = this.engine.state.stage;
      this.layout();
      if (!reduced) this.cameras.main.fadeIn(550, 8, 8, 16);
    }
    const key = this.engine.enemy.kind;
    if (key !== this.visualKey) {
      this.visualKey = key;
      this.enemySprite.setTexture(key);
      this.enemySprite.play(`${key}-idle`);
      this.layout();
    }
    const w = this.scale.width,
      h = this.scale.height;
    if (!paused && !reduced) {
      this.lighting.forEach((light, i) => light.setAlpha(0.2 + Math.sin(time * 0.003 + i) * 0.04));
      this.hero.y = this.ground + Math.sin(time * 0.003) * 1.2;
      if (this.engine.enemy.hp > 0)
        this.enemySprite.y =
          this.ground +
          Math.sin(time * (key === 'wraith' ? 0.002 : 0.0025) + 2) * (key === 'wraith' ? 5 : 1.3);
      for (let i = 0; i < this.motes.length; i++) {
        const m = this.motes[i];
        m.y -= dt * 0.007 * (1 + (i % 3));
        m.x += Math.sin(time * 0.0005 + i) * dt * 0.002;
        if (m.y < 30) {
          m.y = h * 0.9;
          m.x = Math.random() * w;
        }
      }
      this.fog.forEach((f, i) => (f.x = w * (i * 0.33) + Math.sin(time * 0.00012 + i * 2) * 60));
    }
    this.effects.clear();
    if (Object.values(this.engine.state.equipment).some((item) => item.rarity === 'legendary'))
      this.effects
        .lineStyle(2, 0xf0c77d, reduced ? 0.5 : 0.45 + Math.sin(time * 0.004) * 0.2)
        .strokeEllipse(this.heroX, this.ground - 8, 80, 20);
    if (this.engine.intent) {
      const progress = 1 - this.engine.intent.remaining / this.engine.intent.duration;
      this.effects
        .lineStyle(3, 0xff6f94, 0.7)
        .strokeEllipse(this.heroX, this.ground - 7, 55 + progress * 40, 15 + progress * 10);
    }
    // Torch sconces aligned with the original background, with pixel flames.
    const bgScale = this.background.scaleX,
      left = w / 2 - 320 * bgScale,
      top = h / 2 - 180 * bgScale;
    for (const tx of [187, 451]) {
      const x = left + tx * bgScale,
        y = top + 159 * bgScale;
      this.effects.fillStyle(0x251c1a).fillRect(x - 4 * bgScale, y, 8 * bgScale, 15 * bgScale);
      const flame = paused || reduced ? 0 : Math.sin(time * 0.016 + tx) * 2;
      this.effects
        .fillStyle(0x9c3f2b)
        .fillRect(x - 5 * bgScale, y - 17 * bgScale, 10 * bgScale, 19 * bgScale);
      this.effects
        .fillStyle(0xe37936)
        .fillRect(x - 3 * bgScale, y - (21 + flame) * bgScale, 6 * bgScale, 21 * bgScale);
      this.effects
        .fillStyle(0xf2bf68)
        .fillRect(x - 2 * bgScale, y - 12 * bgScale, 4 * bgScale, 13 * bgScale);
      this.effects
        .fillStyle(0xffe2a2)
        .fillRect(x - 1 * bgScale, y - 6 * bgScale, 2 * bgScale, 6 * bgScale);
    }
    if (this.engine.wardRemaining > 0) {
      this.effects
        .lineStyle(2, 0x9b80d1, 0.6)
        .strokeEllipse(
          this.heroX,
          this.ground - this.hero.displayHeight * 0.48,
          this.hero.displayWidth * 0.85,
          this.hero.displayHeight * 0.95,
        );
    }
    if (this.engine.enemy.phase === 2) {
      this.effects.lineStyle(1, 0xa879cf, 0.5).strokeEllipse(this.enemyX, this.ground - 5, 100, 24);
      this.effects.lineStyle(1, 0xc9a66b, 0.4).strokeEllipse(this.enemyX, this.ground - 5, 120, 32);
    }
    this.bars.clear();
    if (this.engine.enemy.hp > 0) {
      const bw = key === 'king' ? 100 : 64,
        y = this.ground - this.enemySprite.displayHeight - 12;
      this.bars.fillStyle(0x101719, 0.9).fillRect(this.enemyX - bw / 2 - 2, y - 2, bw + 4, 7);
      this.bars
        .fillStyle(key === 'king' ? 0x9c70ba : 0xa35049)
        .fillRect(
          this.enemyX - bw / 2,
          y,
          bw * (this.engine.enemy.hp / this.engine.enemy.maxHp),
          3,
        );
    }
  }
}
export function createDungeon(parent: HTMLElement, engine: GameEngine): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#101820',
    pixelArt: true,
    antialias: false,
    powerPreference: 'low-power',
    scale: { mode: Phaser.Scale.NONE, width: parent.clientWidth, height: parent.clientHeight },
    scene: new DungeonScene(engine),
    audio: { noAudio: true },
    fps: { target: 30, forceSetTimeOut: false },
    banner: false,
  });
  // Hidden HTML tabs measure 0 × 0. Never allocate a WebGL framebuffer at that
  // size; retain the last valid dimensions until the dungeon becomes visible.
  const observer = new ResizeObserver(() => {
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    if (width > 0 && height > 0 && (game.scale.width !== width || game.scale.height !== height))
      game.scale.resize(width, height);
  });
  observer.observe(parent);
  game.events.once(Phaser.Core.Events.DESTROY, () => observer.disconnect());
  return game;
}

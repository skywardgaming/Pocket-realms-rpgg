import type { GameEngine } from '../game/engine';
import {
  ABILITIES,
  BUILDINGS,
  ENEMIES,
  EQUIPMENT_EFFECTS,
  RARITY,
  SLOT_NAMES,
  STAGES,
  upgradeCost,
  xpNeeded,
} from '../game/content';
import { itemScore, merchantItem, merchantPrice } from '../game/loot';
import type { Ability, Building, GameEvent, Item, Settings, Slot } from '../game/types';
import { SLOTS } from '../game/types';
import { characterArt, itemArt, townArt } from '../render/art';
import { icon } from './icons';
import { stageTheme } from '../render/themes';
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const num = (n: number) => Math.floor(n).toLocaleString('en-US');
const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
type Tab = 'dungeon' | 'hero' | 'inventory' | 'town';
function enemyDescription(kind: keyof typeof ENEMIES): string {
  return {
    skeleton: 'Sentinel · steady melee attacks. Armor blunts its blade.',
    hound: 'Ashen Hound · fast strikes and a telegraphed Ravaging Lunge.',
    wraith: 'Veil Wraith · Soulbolt magic bypasses half your armor.',
    cultist: 'Ember Acolyte · Searing Siphon restores its health. Magic pierces armor.',
    golem: 'Obsidian Guardian · resists 20% of basic damage. Soul Cleave breaks through.',
    king: 'The Hollow King · two phases. Watch the warning and brace with Void Ward.',
  }[kind];
}
export class App {
  private domEvents = new AbortController();
  private unsubscribe?: () => void;
  tab: Tab = 'dungeon';
  private lastStructure = '';
  private recent: Item[] = [];
  private activity: { message: string; icon: string }[] = [
    { message: 'You entered the forgotten crypt.', icon: 'dungeon' },
  ];
  private filter = 'all';
  private sort = 'newest';
  private selected: string | null = null;
  private toastTimer = 0;
  private inventorySignature = '';
  private buildingSignature = '';
  private saveWarningShown = false;
  private onSave: () => void;
  constructor(
    private engine: GameEngine,
    save: () => void,
  ) {
    this.onSave = save;
    const portrait = characterArt('hero').toDataURL();
    $('#app').innerHTML = `
      <header class="app-header"><div class="header-inner">
        <a class="brand" href="#dungeon" aria-label="Pocket Realms home"><span class="brand-mark">${icon('sword')}</span><span>POCKET REALMS<small>DUNGEON ASCENSION · 2.0</small></span></a>
        <div class="header-right"><div class="currency">${icon('gold')}<span id="gold">120</span><small>GOLD</small></div><span class="header-divider"></span><button class="icon-button" id="audio-toggle" data-action="mute" aria-label="Enable sound effects" aria-pressed="false">${icon('mute')}</button><button class="icon-button" data-action="guide" aria-label="How to play">${icon('info')}</button><button class="icon-button" data-action="settings" aria-label="Open settings">${icon('settings')}</button></div>
      </div></header>
      <div class="app-shell">
        <div class="navigation"><nav aria-label="Main navigation">${(['dungeon', 'hero', 'inventory', 'town'] as Tab[]).map((t, i) => `<button class="nav-tab ${i === 0 ? 'active' : ''}" data-tab="${t}" aria-current="${i === 0 ? 'page' : 'false'}">${icon(t)}<span>${t[0].toUpperCase() + t.slice(1)}</span>${t === 'inventory' ? '<span class="nav-count" id="pack-count">2</span>' : ''}</button>`).join('')}</nav><span class="save-status" id="save-status">${icon('check')} Progress saved locally</span></div>
        <main id="main">
          <section id="panel-dungeon" class="tab-panel" aria-label="Dungeon">
            <div class="page-heading"><div><div class="eyebrow"><span class="tiny-line"></span> YOUR NEXT CHAPTER</div><h1 id="stage-title">The Forgotten Crypt</h1><p id="stage-mood">Where the restless first stir.</p></div><button class="outline-button map-button" data-action="stages">${icon('map')}<span>Dungeon map</span>${icon('chevron')}</button></div>
            <div class="biome-strip"><span>${icon('rune')}<b id="biome-name">Gravefire</b></span><span id="biome-reward">First clear: +25 gold</span></div><div class="dungeon-grid"><div class="dungeon-main">
              <div class="scene-card"><div class="scene-topline"><div class="stage-label"><span class="stage-diamond">I</span><span id="stage-number">STAGE 01 <b>/ 10</b></span><span class="subtle-divider"></span><span id="region-name">THE SUNKEN KEEP</span></div><button class="status-pill" data-action="pause" id="battle-status"><i></i> IN COMBAT</button></div>
                <div class="scene-viewport" id="game-canvas" role="img" aria-label="Animated automatic dungeon combat. Enemy and hero health are shown below."><div class="scene-loading">Kindling the last flame…</div></div>
                <div id="intent-warning" class="intent-warning" role="status" hidden><span>${icon('skull')}<strong id="intent-name"></strong><b id="intent-countdown" aria-hidden="true"></b><small>Brace with Void Ward</small></span><i id="intent-fill"></i></div><div class="scene-enemy"><span>${icon('skull')}<span id="enemy-name">Restless Sentinel</span><small id="enemy-phase"></small></span><span id="enemy-hp">60 / 60</span><div class="enemy-health"><i id="enemy-health-fill"></i></div></div>
                <div class="scene-bottomline"><span id="combat-state">${icon('sword')} Automatic combat</span><span class="mobile-vitality">${icon('heart')}<b id="mobile-hero-hp">233 / 233</b><span class="mobile-health-bar"><i id="mobile-health-fill"></i></span></span><button class="text-button" id="pause-button" data-action="pause">${icon('pause')} Pause</button></div>
                <div id="pause-overlay" class="pause-overlay" hidden><span>${icon('pause')}</span><h3>The shadows can wait.</h3><p>Your adventure is paused.</p><button class="gold-button" data-action="pause">${icon('play')} Resume battle</button></div>
              </div>
              <div class="enemy-intel">${icon('info')}<span id="enemy-trait">A relentless melee sentinel.</span></div><div class="abilities-header"><span class="section-label">YOUR ABILITIES</span><button class="mini-toggle" data-setting="autoCast" id="auto-cast" aria-pressed="true"><span class="toggle-dot"></span> Auto-cast</button></div>
              <div class="abilities">${(Object.keys(ABILITIES) as Ability[]).map((a) => `<button class="ability ${a}" data-ability="${a}" title="${ABILITIES[a].description}"><span class="ability-icon">${icon(ABILITIES[a].icon)}</span><span class="ability-copy"><strong>${ABILITIES[a].name}</strong><small>${a === 'cleave' ? '280% attack' : a === 'mend' ? 'Restore health' : '55% damage ward'}</small></span><span class="cooldown" id="cd-${a}">2s</span><span class="cooldown-progress" id="cd-bar-${a}"></span></button>`).join('')}</div>
              <section class="loot-panel"><div class="panel-heading"><h2>${icon('inventory')} Recent spoils</h2><button class="text-button" data-tab="inventory">Open inventory ${icon('arrow')}</button></div><div id="recent-loot" class="recent-loot"><div class="empty-loot">${icon('spark')} <span>Every fallen foe holds a possibility.<small>Loot is collected automatically as you fight.</small></span></div></div></section>
            </div><aside class="dungeon-aside">
              <section class="hero-card"><div class="hero-card-top"><span class="section-label">YOUR CHAMPION</span><span class="level-badge">LV. <b class="hero-level">1</b></span></div><div class="champion"><div class="portrait-frame"><img src="${portrait}" alt="Armored knight with a crimson cloak" /></div><div><h2>The Ashen Knight</h2><span>Oathbound wanderer</span><small>${icon('spark')} <span id="power">0</span> combat power</small></div></div><div class="bar-label"><span>${icon('heart')} Vitality</span><span id="hero-hp">200 / 200</span></div><div class="health-bar"><i id="hero-health-fill"></i></div><div class="bar-label xp-label"><span>Level <b class="hero-level">1</b></span><span id="xp-label">0 / 60 XP</span></div><div class="xp-bar"><i id="xp-fill"></i></div><div class="stat-grid" id="quick-stats"></div><button class="outline-button full" data-tab="hero">Manage hero ${icon('arrow')}</button></section>
              <section class="journey-card"><div class="panel-heading"><h2>Your descent</h2><span id="descent-count">01 / 10</span></div><div class="stage-track" id="stage-track"></div><div class="encounter-label"><span>Stage progress</span><b id="kill-progress">0 / 4</b></div><div class="encounter-pips" id="encounter-pips"></div><button class="gold-button full" id="advance-button" data-action="advance" disabled>Clear stage to descend ${icon('lock')}</button><button class="mini-toggle auto-advance" data-setting="autoAdvance" id="auto-advance" aria-pressed="false"><span class="toggle-dot"></span> Auto-advance stages</button></section>
              <section class="activity-card"><div class="panel-heading"><h2>The chronicle</h2><span class="live-dot"></span></div><div id="activity-log" class="activity-log" aria-live="polite"></div></section>
            </aside></div>
            <div class="world-footer"><span><i></i> THE FIRE STILL BURNS</span><p>Steel yourself. Something stirs below.</p><span>PREMIUM HYBRID FANTASY <b>·</b> v2.0</span></div>
          </section>
          <section id="panel-hero" class="tab-panel" hidden aria-label="Hero"><div class="page-heading"><div><div class="eyebrow"><span class="tiny-line"></span> STEEL & SOUL</div><h1>The Ashen Knight</h1><p>A forgotten oath. An unbroken will.</p></div><span class="title-tag">LEVEL <b class="hero-level">1</b> WANDERER</span></div><div class="hero-page-grid"><section class="paper-doll panel"><div class="paper-doll-art"><div class="hero-halo"></div><img src="${portrait}" alt="Your equipped champion"/><span>OATHBOUND WANDERER</span></div><div class="equipment-grid" id="equipment-grid"></div></section><div><section class="panel hero-stats-panel"><div class="panel-heading"><h2>Battle attributes</h2>${icon('hero')}</div><div id="hero-attributes"></div><p class="muted small">Your equipment, level, and Blacksmith all contribute to these attributes.</p><button class="gold-button full" data-tab="inventory">Find an upgrade ${icon('arrow')}</button></section><section class="panel effects-panel"><div class="panel-heading"><h2>Relic traits</h2>${icon('rune')}</div><div id="active-effects"></div></section><section class="panel lore-panel"><span class="eyebrow">THE OATH REMAINS</span><p>“When the last flame gutters, I will carry its ember into the dark.”</p><span class="muted small">Every level strengthens attack, armor, and vitality.</span></section></div></div></section>
          <section id="panel-inventory" class="tab-panel" hidden aria-label="Inventory"><div class="page-heading"><div><div class="eyebrow"><span class="tiny-line"></span> RELICS OF THE FALLEN</div><h1>Your inventory</h1><p>Power is found in the things left behind.</p></div><span class="title-tag">${icon('inventory')} <span id="inventory-capacity">2 / 60</span> SLOTS</span></div><div class="inventory-toolbar"><div class="filter-tabs">${['all', 'weapon', 'armor', 'amulet'].map((f, i) => `<button data-filter="${f}" class="filter-button ${i === 0 ? 'active' : ''}">${['All items', 'Weapons', 'Armor', 'Amulets'][i]}</button>`).join('')}</div><label class="sort-label">Sort by <select id="sort-items" aria-label="Sort inventory"><option value="newest">Newest</option><option value="power">Power</option><option value="rarity">Rarity</option></select></label></div><div class="inventory-hint">${icon('info')} Tap a relic to compare it with your equipped gear.<button class="text-button" data-action="sell-common" id="sell-common">Sell common</button></div><div class="inventory-grid" id="inventory-grid"></div><p class="inventory-footnote">${icon('check')} Loot is collected automatically. A full pack sells incoming items for gold.</p></section>
          <section id="panel-town" class="tab-panel" hidden aria-label="Town"><div class="page-heading"><div><div class="eyebrow"><span class="tiny-line"></span> A PLACE TO RETURN TO</div><h1>Emberwick</h1><p>A little light at the edge of the world.</p></div><button class="outline-button" data-tab="dungeon">${icon('sword')} Return to the dungeon</button></div><div class="town-scene"><img src="${townArt().toDataURL()}" alt="Original pixel art of Emberwick, a lantern-lit medieval town with a glowing forge"/><div><span class="eyebrow">HOME, FOR NOW</span><h2>Keep the embers alive.</h2><p>Invest your spoils. Rebuild your strength.</p></div></div><div class="buildings" id="buildings"></div><section class="merchant-panel panel"><div class="panel-heading"><h2>${icon('inventory')} The Lantern Exchange</h2><span class="section-label">RELIC COMMISSIONS</span></div><p class="muted small">Guaranteed traits. Forged for your deepest unlocked stage. Inspect the same-slot relic in your inventory before investing. Each commission creates a new relic.</p><div id="merchant-stock" class="merchant-stock"></div></section><div class="town-note">${icon('sun')} Your town’s bonuses apply immediately, wherever your journey takes you.</div></section>
        </main>
      </div><div id="toast" class="toast" role="status" hidden></div>
      <dialog id="modal" class="modal"><div id="modal-content"></div></dialog>`;
    document.addEventListener('click', (e) => this.click(e), { signal: this.domEvents.signal });
    $('#sort-items').addEventListener(
      'change',
      (e) => {
        this.sort = (e.target as HTMLSelectElement).value;
        this.inventorySignature = '';
        this.renderInventory();
      },
      { signal: this.domEvents.signal },
    );
    $('#modal').addEventListener(
      'click',
      (e) => {
        if (e.target === $('#modal')) this.closeModal();
      },
      { signal: this.domEvents.signal },
    );
    $('#modal').addEventListener(
      'close',
      () => {
        this.selected = null;
      },
      { signal: this.domEvents.signal },
    );
    this.unsubscribe = this.engine.on((e) => this.event(e));
    document.querySelector('.brand')!.addEventListener(
      'click',
      (e) => {
        e.preventDefault();
        this.switchTab('dungeon');
      },
      { signal: this.domEvents.signal },
    );
    this.refresh();
  }
  destroy() {
    this.domEvents.abort();
    this.unsubscribe?.();
    window.clearTimeout(this.toastTimer);
  }
  private click(event: MouseEvent) {
    const button = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-tab],[data-action],[data-ability],[data-setting],[data-item],[data-filter],[data-stage],[data-building],[data-equip],[data-sell],[data-buy]',
    );
    if (!button || button.hasAttribute('disabled')) return;
    const d = button.dataset;
    if (d.tab) this.switchTab(d.tab as Tab);
    if (d.setting) {
      const key = d.setting as keyof Settings;
      this.engine.state.settings[key] = !this.engine.state.settings[key];
      if (key === 'reducedMotion')
        document.documentElement.classList.toggle(
          'reduced-motion',
          this.engine.state.settings.reducedMotion,
        );
      this.onSave();
      this.refresh();
      this.syncSettingsModal();
    }
    if (d.ability) {
      if (this.engine.cast(d.ability as Ability)) this.onSave();
      this.refresh();
    }
    if (d.item) this.itemModal(d.item);
    if (d.buy && this.engine.buy(d.buy as Slot)) {
      this.toast('Relic commissioned. Compare it in your inventory.');
      this.onSave();
      this.refresh();
    }
    if (d.filter) {
      this.filter = d.filter;
      document
        .querySelectorAll('[data-filter]')
        .forEach((b) =>
          b.classList.toggle('active', (b as HTMLElement).dataset.filter === d.filter),
        );
      this.inventorySignature = '';
      this.renderInventory();
    }
    if (d.stage) {
      this.engine.travel(Number(d.stage));
      this.closeModal();
      this.switchTab('dungeon');
      this.onSave();
      this.refresh();
    }
    if (d.building && this.engine.upgrade(d.building as Building)) {
      this.toast(`${BUILDINGS[d.building as Building].name} upgraded. Your realm grows stronger.`);
      this.onSave();
      this.refresh();
    }
    if (d.equip) {
      if (this.engine.equip(d.equip)) {
        this.toast('Relic equipped. Your attributes have been updated.');
        this.onSave();
        this.closeModal();
        this.refresh();
      }
    }
    if (d.sell) {
      const item = this.engine.state.inventory.find((i) => i.id === d.sell);
      if (item && this.engine.sell(item.id)) {
        this.toast(`Sold ${item.name} for ${item.value} gold.`);
        this.onSave();
        this.closeModal();
        this.refresh();
      }
    }
    if (d.action === 'close') this.closeModal();
    if (d.action === 'pause') {
      this.engine.state.settings.paused = !this.engine.state.settings.paused;
      this.onSave();
      this.refresh();
    }
    if (d.action === 'stages') this.stageModal();
    if (d.action === 'settings') this.settingsModal();
    if (d.action === 'mute') {
      const settings = this.engine.state.settings;
      if (settings.sound || settings.music) {
        settings.sound = false;
        settings.music = false;
      } else settings.sound = true;
      this.onSave();
      this.refresh();
      this.syncSettingsModal();
    }
    if (d.action === 'guide') this.guideModal();
    if (d.action === 'advance') {
      if (this.engine.state.stage === 10 && this.engine.state.bossDefeated) this.engine.travel(10);
      else this.engine.travel(this.engine.state.stage + 1);
      this.onSave();
      this.refresh();
    }
    if (d.action === 'sell-common') {
      const items = this.engine.state.inventory.filter((i) => i.rarity === 'common');
      const value = items.reduce((sum, i) => sum + i.value, 0);
      items.forEach((i) => this.engine.sell(i.id));
      if (items.length) {
        this.toast(`Sold ${items.length} common relics for ${num(value)} gold.`);
        this.onSave();
        this.refresh();
      }
    }
  }
  switchTab(tab: Tab) {
    this.tab = tab;
    document
      .querySelectorAll<HTMLElement>('.tab-panel')
      .forEach((p) => (p.hidden = p.id !== `panel-${tab}`));
    document.querySelectorAll<HTMLElement>('.nav-tab').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tab);
      b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false');
    });
    this.refresh();
    window.dispatchEvent(new Event('resize'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  refresh() {
    const s = this.engine.state,
      stats = this.engine.stats,
      enemy = this.engine.enemy;
    $('#gold').textContent =
      s.gold >= 1e6
        ? Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
            s.gold,
          )
        : num(s.gold);
    $('#pack-count').textContent = String(s.inventory.length);
    document.querySelectorAll('.hero-level').forEach((n) => (n.textContent = String(s.level)));
    $('#hero-hp').textContent = `${num(s.hp)} / ${num(stats.health)}`;
    $('#hero-health-fill').style.width = `${(s.hp / stats.health) * 100}%`;
    $('#mobile-hero-hp').textContent = `${num(s.hp)} / ${num(stats.health)}`;
    $('#mobile-health-fill').style.width = `${(s.hp / stats.health) * 100}%`;
    $('#xp-label').textContent = `${num(s.xp)} / ${num(xpNeeded(s.level))} XP`;
    $('#xp-fill').style.width = `${(s.xp / xpNeeded(s.level)) * 100}%`;
    $('#enemy-name').textContent = enemy.name;
    $('#enemy-hp').textContent = `${num(enemy.hp)} / ${num(enemy.maxHp)}`;
    const intent = this.engine.intent;
    $('#intent-warning').hidden = !intent;
    if (intent) {
      $('#intent-name').textContent = intent.name;
      $('#intent-countdown').textContent = `${intent.remaining.toFixed(1)}s`;
      $('#intent-fill').style.width = `${100 * (1 - intent.remaining / intent.duration)}%`;
    }
    const audioEnabled = s.settings.sound || s.settings.music;
    $('#audio-toggle').setAttribute(
      'aria-label',
      audioEnabled ? 'Mute all audio' : 'Enable sound effects',
    );
    $('#audio-toggle').setAttribute('aria-pressed', String(audioEnabled));
    $('#audio-toggle').innerHTML = icon(audioEnabled ? 'volume' : 'mute');
    $('#enemy-phase').textContent =
      enemy.kind === 'king'
        ? `PHASE ${enemy.phase} · ${enemy.phase === 1 ? 'THE CROWNLESS' : 'THE AWAKENED'}`
        : '';
    $('#enemy-health-fill').style.width = `${(enemy.hp / enemy.maxHp) * 100}%`;
    const paused = s.settings.paused;
    $('#pause-overlay').hidden = !paused;
    $('#battle-status').innerHTML =
      `<i class="${paused ? 'paused' : ''}"></i> ${paused ? 'PAUSED' : this.engine.recovering ? 'RECOVERING' : this.engine.respawnRemaining > 0 ? 'GATHERING SPOILS' : 'IN COMBAT'}`;
    $('#pause-button').innerHTML =
      `${icon(paused ? 'play' : 'pause')} ${paused ? 'Resume' : 'Pause'}`;
    $('#combat-state').innerHTML =
      `${icon(this.engine.recovering ? 'heart' : 'sword')} ${this.engine.recovering ? `Recovering · ${Math.ceil(this.engine.respawnRemaining)}s` : this.engine.wardRemaining > 0 ? 'Void Ward active' : 'Automatic combat'}`;
    for (const key of ['autoCast', 'autoAdvance'] as const) {
      const node = $(key === 'autoCast' ? '#auto-cast' : '#auto-advance');
      node.setAttribute('aria-pressed', String(s.settings[key]));
      node.classList.toggle('on', s.settings[key]);
    }
    for (const a of Object.keys(ABILITIES) as Ability[]) {
      const cd = this.engine.cooldowns[a];
      $(`#cd-${a}`).textContent = cd > 0 ? `${Math.ceil(cd)}s` : 'Ready';
      $(`#cd-bar-${a}`).style.width = `${(cd / ABILITIES[a].cooldown) * 100}%`;
      const button = $<HTMLButtonElement>(`[data-ability="${a}"]`);
      button.disabled =
        cd > 0 ||
        paused ||
        this.engine.respawnRemaining > 0 ||
        (a === 'mend' && s.hp >= stats.health);
      button.setAttribute(
        'aria-label',
        `${ABILITIES[a].name}. ${ABILITIES[a].description} ${cd > 0 ? `Ready in ${Math.ceil(cd)} seconds.` : 'Ready.'}`,
      );
    }
    const kills = enemy.kind === 'king' ? (s.bossDefeated ? 1 : 0) : s.kills,
      required = enemy.kind === 'king' ? 1 : 4;
    $('#kill-progress').textContent = `${kills} / ${required}`;
    $('#encounter-pips').innerHTML = Array.from(
      { length: required },
      (_, i) => `<i class="${i < kills ? 'filled' : ''}"></i>`,
    ).join('');
    const advance = $<HTMLButtonElement>('#advance-button');
    advance.disabled = s.stage >= s.unlocked && !(s.stage === 10 && s.bossDefeated);
    advance.innerHTML =
      s.stage === 10
        ? s.bossDefeated
          ? `Challenge the King ${icon('sword')}`
          : `Defeat the Hollow King ${icon('lock')}`
        : s.unlocked > s.stage
          ? `Descend to stage ${String(s.stage + 1).padStart(2, '0')} ${icon('arrow')}`
          : `Clear stage to descend ${icon('lock')}`;
    const power = Math.round(
      stats.attack * 3 + stats.armor * 2 + stats.health * 0.25 + stats.crit * 2,
    );
    $('#power').textContent = num(power);
    const structure = JSON.stringify([
      s.stage,
      s.level,
      s.unlocked,
      s.cleared,
      s.equipment,
      s.buildings,
    ]);
    if (structure !== this.lastStructure) {
      this.lastStructure = structure;
      this.renderStructure();
    }
    if (this.tab === 'inventory') this.renderInventory();
    if (this.tab === 'town') this.renderBuildings();
  }
  private renderStructure() {
    const s = this.engine.state,
      stats = this.engine.stats,
      stage = STAGES[s.stage - 1];
    $('#biome-name').textContent = stageTheme(s.stage).name;
    $('#biome-reward').textContent = s.cleared.includes(s.stage)
      ? 'First clear bounty claimed'
      : `First clear: +${25 * s.stage} gold${s.stage % 3 === 0 && s.stage < 10 ? ' + milestone relic' : ''}`;
    $('#enemy-trait').textContent = enemyDescription(this.engine.enemy.kind);
    $('#stage-title').textContent = stage.name;
    $('#stage-mood').textContent = stage.mood;
    $('#region-name').textContent = stage.region.toUpperCase();
    $('#stage-number').innerHTML = `STAGE ${String(s.stage).padStart(2, '0')} <b>/ 10</b>`;
    $('.stage-diamond').textContent = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][
      s.stage - 1
    ];
    $('#quick-stats').innerHTML = [
      ['sword', 'Attack', stats.attack],
      ['shield', 'Armor', stats.armor],
      ['heart', 'Max health', stats.health],
      ['spark', 'Crit chance', `${stats.crit.toFixed(0)}%`],
    ]
      .map(([i, l, v]) => `<div><span>${icon(String(i))}${l}</span><strong>${v}</strong></div>`)
      .join('');
    $('#descent-count').textContent = `${String(s.stage).padStart(2, '0')} / 10`;
    $('#stage-track').innerHTML = STAGES.map(
      (stage, i) =>
        `<button data-stage="${i + 1}" title="Stage ${i + 1}: ${stage.name}${i + 1 > s.unlocked ? ' (locked)' : ''}" class="${i + 1 === s.stage ? 'current' : s.cleared.includes(i + 1) ? 'cleared' : ''}" ${i + 1 > s.unlocked ? 'disabled' : ''}>${i + 1 > s.unlocked ? icon('lock') : s.cleared.includes(i + 1) && i + 1 !== s.stage ? icon('check') : i + 1}</button>`,
    ).join('');
    $('#equipment-grid').innerHTML = SLOTS.map((slot) => {
      const item = s.equipment[slot];
      return `<button class="equipment-slot" data-rarity="${item.rarity}" data-item="${escape(item.id)}" style="--rarity:${RARITY[item.rarity].color}"><span class="item-art"><img src="${itemArt(slot, item.rarity)}" alt=""/></span><span><small>${SLOT_NAMES[slot]}</small><strong>${escape(item.name)}</strong><span>${this.statText(item)}</span></span>${icon('chevron')}</button>`;
    }).join('');
    $('#hero-attributes').innerHTML = [
      ['sword', 'Attack', stats.attack, 'Damage per basic strike'],
      [
        'shield',
        'Armor',
        stats.armor,
        `${Math.round(100 - 10000 / (100 + stats.armor * 3))}% incoming damage reduction`,
      ],
      ['heart', 'Vitality', stats.health, 'Maximum health'],
      ['spark', 'Critical chance', `${stats.crit.toFixed(0)}%`, 'Critical hits deal 185% damage'],
    ]
      .map(
        ([i, label, value, desc]) =>
          `<div class="attribute-row"><span class="attribute-icon">${icon(String(i))}</span><span><strong>${label}</strong><small>${desc}</small></span><b>${num(typeof value === 'number' ? value : parseFloat(value))}${typeof value === 'string' ? '%' : ''}</b></div>`,
      )
      .join('');
    $('#active-effects').innerHTML =
      Object.entries(this.engine.effects)
        .filter(([, count]) => count > 0)
        .map(([key, count]) => {
          const effect = EQUIPMENT_EFFECTS[key as keyof typeof EQUIPMENT_EFFECTS];
          return `<div class="active-effect">${icon('rune')}<span><strong>${effect.name} ×${count}</strong><small>${effect.description}</small></span></div>`;
        })
        .join('') ||
      '<p class="muted small">Rare, epic, and legendary relics may carry traits. Compare their effects as well as their attributes.</p>';
    this.renderActivity();
  }
  private statText(item: Item): string {
    return (Object.entries(item.stats) as [keyof Item['stats'], number][])
      .filter(([, n]) => n > 0)
      .map(
        ([k, n]) =>
          `+${n}${k === 'crit' ? '%' : ''} ${k === 'health' ? 'HP' : k === 'attack' ? 'ATK' : k === 'armor' ? 'DEF' : 'CRIT'}`,
      )
      .join(' · ');
  }
  private renderInventory() {
    const s = this.engine.state,
      signature = JSON.stringify([s.inventory, s.equipment, this.filter, this.sort]);
    if (signature === this.inventorySignature) return;
    this.inventorySignature = signature;
    $('#inventory-capacity').textContent = `${s.inventory.length} / 60`;
    let items = s.inventory.filter(
      (i) =>
        this.filter === 'all' ||
        i.slot === this.filter ||
        (this.filter === 'armor' && ['head', 'chest', 'hands', 'feet'].includes(i.slot)),
    );
    if (this.sort === 'power') items = [...items].sort((a, b) => itemScore(b) - itemScore(a));
    if (this.sort === 'rarity')
      items = [...items].sort((a, b) => RARITY[b.rarity].multiplier - RARITY[a.rarity].multiplier);
    $('#inventory-grid').innerHTML = items.length
      ? items
          .map(
            (item) =>
              `<button class="inventory-item" data-rarity="${item.rarity}" data-item="${escape(item.id)}" style="--rarity:${RARITY[item.rarity].color}"><div class="item-card-top"><span>${RARITY[item.rarity].label}</span><small>ILVL ${item.level}</small></div><div class="inventory-art"><img src="${itemArt(item.slot, item.rarity)}" alt="${SLOT_NAMES[item.slot]}"/></div><h3>${escape(item.name)}</h3><span class="item-slot-label">${SLOT_NAMES[item.slot]}</span><div class="item-stat-line">${this.statText(item)}</div>${item.effect ? `<div class="relic-effect">${icon('rune')} ${EQUIPMENT_EFFECTS[item.effect].name}</div>` : ''}<div class="item-card-bottom"><span>${icon('gold')} ${item.value}</span>${itemScore(item) > itemScore(s.equipment[item.slot]) ? '<span class="upgrade-tag">↑ Upgrade</span>' : '<span>Compare →</span>'}</div></button>`,
          )
          .join('')
      : `<div class="empty-inventory">${icon('inventory')}<h2>${s.inventory.length ? 'No relics in this category.' : 'Your pack awaits a story.'}</h2><p>Keep exploring the dungeon to discover equipment.</p><button class="gold-button" data-tab="dungeon">Enter the dungeon ${icon('arrow')}</button></div>`;
    const count = s.inventory.filter((i) => i.rarity === 'common').length;
    const sell = $<HTMLButtonElement>('#sell-common');
    sell.disabled = count === 0;
    sell.textContent = `Sell common (${count})`;
  }
  private renderBuildings() {
    const s = this.engine.state;
    const signature = JSON.stringify([s.gold, s.buildings]);
    if (signature === this.buildingSignature) return;
    this.buildingSignature = signature;
    $('#buildings').innerHTML = (Object.keys(BUILDINGS) as Building[])
      .map((key) => {
        const b = BUILDINGS[key],
          level = s.buildings[key],
          cost = upgradeCost(key, level);
        return `<section class="building-card"><div class="building-card-top"><span class="building-icon">${icon(b.icon)}</span><span class="level-badge">LV. ${level} <small>/ 10</small></span></div><h2>${b.name}</h2><p>${b.description}</p><div class="building-benefit">${icon('spark')}${b.benefit}</div><div class="building-current">Current bonus <strong>${key === 'blacksmith' ? `+${level * 8}% equipment` : key === 'guild' ? `+${level * 15}% experience` : `+${level * 15}% gold · +${level * 12} HP`}</strong></div><div class="building-pips">${Array.from({ length: 10 }, (_, i) => `<i class="${i < level ? 'filled' : ''}"></i>`).join('')}</div><button class="gold-button full" data-building="${key}" ${s.gold < cost || level >= 10 ? 'disabled' : ''}>${level >= 10 ? 'Fully upgraded' : `Upgrade to level ${level + 1}<span>${icon('gold')} ${num(cost)}</span>`}</button>${s.gold < cost && level < 10 ? `<small class="building-shortfall">${num(cost - s.gold)} more gold needed</small>` : '<small class="building-shortfall">A permanent investment in your journey.</small>'}</section>`;
      })
      .join('');
    $('#merchant-stock').innerHTML = (['weapon', 'chest', 'amulet'] as Slot[])
      .map((slot) => {
        const item = merchantItem(s.unlocked, slot),
          cost = merchantPrice(item);
        return `<article class="merchant-item" style="--rarity:${RARITY[item.rarity].color}"><div class="item-art"><img src="${itemArt(slot, item.rarity)}" alt=""/></div><div><small>${RARITY[item.rarity].label} · ILVL ${item.level}</small><h3>${item.name}</h3><p>${this.statText(item)}</p><p class="relic-effect">${item.effect ? EQUIPMENT_EFFECTS[item.effect].name : ''}</p></div><button class="gold-button full" data-buy="${slot}" ${s.gold < cost || s.inventory.length >= 60 ? 'disabled' : ''}>Commission ${icon('gold')} ${num(cost)}</button></article>`;
      })
      .join('');
  }
  private event(e: GameEvent) {
    if (e.type === 'spawn')
      $('#enemy-trait').textContent = enemyDescription(this.engine.enemy.kind);
    if (e.type === 'encounter') {
      this.addActivity(`${e.name} · ${e.text}`, 'spark');
      this.toast(`${e.name} · ${e.text}`);
    }
    if (e.type === 'telegraph')
      this.addActivity(`${e.name} is gathering. Time your Void Ward.`, 'skull');
    if (e.type === 'loot') {
      this.recent.unshift(e.item);
      this.recent = this.recent.slice(0, 3);
      $('#recent-loot').innerHTML = this.recent
        .map(
          (i) =>
            `<button class="recent-item" data-rarity="${i.rarity}" data-item="${escape(i.id)}" style="--rarity:${RARITY[i.rarity].color}"><span class="item-art"><img src="${itemArt(i.slot, i.rarity)}" alt=""/></span><span><strong>${escape(i.name)}</strong><small>${RARITY[i.rarity].label} ${SLOT_NAMES[i.slot].toLowerCase()}</small></span>${icon('chevron')}</button>`,
        )
        .join('');
    }
    if (e.type === 'kill')
      this.addActivity(`Foe vanquished. +${e.gold} gold · +${e.xp} XP`, 'sword');
    if (e.type === 'level') {
      this.addActivity(`Your oath grows stronger. Level ${e.level}.`, 'spark');
      this.toast(`Level ${e.level} · Your strength and vitality have increased.`);
    }
    if (e.type === 'phase') {
      this.addActivity('The Hollow King awakens. Survive his wrath.', 'skull');
      this.toast('THE CROWN AWAKENS · The Hollow King enters phase II.');
    }
    if (e.type === 'clear' && e.first) {
      this.addActivity(
        e.stage === 10
          ? 'The Hollow King has fallen. Emberwick remembers.'
          : `Stage ${e.stage} cleared. A new descent awaits.`,
        'map',
      );
      this.toast(
        e.stage === 10
          ? 'Victory! The Hollow King has fallen. Legendary loot is yours.'
          : `Stage ${e.stage} cleared · Stage ${e.stage + 1} unlocked.`,
      );
    }
    if (e.type === 'death') {
      this.addActivity('Your flame falters. Recovering to full health.', 'heart');
      this.toast('You fell in battle. Recovering in 4 seconds. Your spoils are safe.');
    }
    if (e.type === 'notice') this.toast(e.text);
    if (['loot', 'kill', 'level', 'clear', 'death', 'encounter'].includes(e.type)) this.onSave();
    if (e.type !== 'hit') this.refresh();
  }
  private addActivity(message: string, i: string) {
    this.activity.unshift({ message, icon: i });
    this.activity = this.activity.slice(0, 4);
    this.renderActivity();
  }
  private renderActivity() {
    $('#activity-log').innerHTML = this.activity
      .map((a) => `<div>${icon(a.icon)}<span>${escape(a.message)}</span></div>`)
      .join('');
  }
  private openModal(content: string) {
    $('#modal-content').innerHTML = content;
    const modal = $<HTMLDialogElement>('#modal');
    if (!modal.open) modal.showModal();
  }
  private closeModal() {
    $<HTMLDialogElement>('#modal').close();
    this.selected = null;
  }
  private modalHeader(kicker: string, title: string) {
    return `<div class="modal-header"><div><span class="eyebrow">${kicker}</span><h2>${title}</h2></div><button class="icon-button" data-action="close" aria-label="Close dialog">${icon('close')}</button></div>`;
  }
  private itemModal(id: string) {
    const s = this.engine.state,
      item =
        s.inventory.find((i) => i.id === id) ?? Object.values(s.equipment).find((i) => i.id === id);
    if (!item) {
      this.toast('This relic has already been sold or moved. Find your gear in the inventory.');
      return;
    }
    this.selected = id;
    const current = s.equipment[item.slot],
      equipped = current.id === id;
    this.openModal(
      `${this.modalHeader(equipped ? 'EQUIPPED RELIC' : 'INSPECT RELIC', escape(item.name))}<div class="item-detail-art" style="--rarity:${RARITY[item.rarity].color}"><img src="${itemArt(item.slot, item.rarity)}" alt=""/><span>${RARITY[item.rarity].label} ${SLOT_NAMES[item.slot]} · Item level ${item.level}</span></div>${!equipped ? `<div class="comparison-label"><span>Attribute</span><span>Equipped</span><span>This relic</span></div>` : ''}<div class="comparison-stats">${(
        ['attack', 'armor', 'health', 'crit'] as const
      )
        .filter((k) => item.stats[k] || current.stats[k])
        .map((k) => {
          const delta = item.stats[k] - current.stats[k];
          return `<div><span>${k === 'health' ? 'Vitality' : k === 'crit' ? 'Crit chance' : k[0].toUpperCase() + k.slice(1)}</span>${!equipped ? `<span>${current.stats[k]}${k === 'crit' ? '%' : ''}</span>` : ''}<strong>${item.stats[k]}${k === 'crit' ? '%' : ''}${!equipped ? `<small class="${delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'muted'}"> ${delta > 0 ? '+' : ''}${delta}</small>` : ''}</strong></div>`;
        })
        .join(
          '',
        )}</div>${this.effectComparison(item, current)}${!equipped ? `<p class="compare-against">Replacing <strong>${escape(current.name)}</strong><br><small>Blacksmith bonuses apply after equipping.</small></p><div class="modal-actions"><button class="gold-button" data-equip="${escape(id)}">${icon('check')} Equip relic</button><button class="outline-button" data-sell="${escape(id)}">Sell ${icon('gold')} ${item.value}</button></div>` : `<p class="compare-against">This relic is equipped and contributes to your combat attributes.</p><button class="outline-button full" data-action="close">Keep adventuring ${icon('arrow')}</button>`}`,
    );
  }
  private stageModal() {
    const s = this.engine.state;
    this.openModal(
      `${this.modalHeader('TEN STEPS INTO THE DARK', 'Choose your descent')}<p class="muted small">Defeat four foes to unlock the next stage. Travel restores your health and resets encounter progress.</p><div class="stage-map">${STAGES.map((stage, i) => `<button data-stage="${i + 1}" ${i + 1 > s.unlocked ? 'disabled' : ''} class="${s.stage === i + 1 ? 'selected' : ''}"><span class="map-number">${i + 1 > s.unlocked ? icon('lock') : String(i + 1).padStart(2, '0')}</span><span><strong>${stage.name}</strong><small>${stageTheme(i + 1).name} · ${s.cleared.includes(i + 1) ? 'Bounty claimed' : `+${25 * (i + 1)} gold${(i + 1) % 3 === 0 && i < 9 ? ' + relic' : ''}`}</small></span>${s.stage === i + 1 ? '<small>HERE</small>' : s.cleared.includes(i + 1) ? icon('check') : icon('chevron')}</button>`).join('')}</div>`,
    );
  }
  private effectComparison(item: Item, current: Item) {
    const describe = (relic: Item) =>
      relic.effect
        ? `<strong>${EQUIPMENT_EFFECTS[relic.effect].name}</strong><p>${EQUIPMENT_EFFECTS[relic.effect].description}</p>`
        : '<span>No relic trait</span>';
    return `<div class="effect-comparison"><span class="section-label">THIS RELIC</span>${describe(item)}${item.id !== current.id ? `<hr/><span class="section-label">CURRENTLY EQUIPPED</span>${describe(current)}` : ''}</div>`;
  }
  private settingsModal() {
    const s = this.engine.state;
    this.openModal(
      `${this.modalHeader('MAKE THE JOURNEY YOURS', 'Settings')}<div class="setting-row"><span><strong>Sound effects</strong><small>Original synthesized strikes, magic, and loot. Off by default.</small></span><button class="switch" data-setting="sound" aria-label="Sound effects" aria-pressed="${s.settings.sound}"></button></div><div class="setting-row"><span><strong>Ambient music</strong><small>A quiet original dungeon score. Pauses in the background.</small></span><button class="switch" data-setting="music" aria-label="Ambient music" aria-pressed="${s.settings.music}"></button></div><div class="setting-row"><span><strong>Reduced motion</strong><small>Limit camera shake, particles, and ambient animation.</small></span><button class="switch" data-setting="reducedMotion" aria-label="Reduced motion" aria-pressed="${s.settings.reducedMotion}"></button></div><div class="setting-row"><span><strong>Automatic abilities</strong><small>Use Soul Cleave, Mend, and Ward when needed.</small></span><button class="switch" data-setting="autoCast" aria-label="Automatic abilities" aria-pressed="${s.settings.autoCast}"></button></div><div class="setting-row"><span><strong>Auto-advance</strong><small>Enter the next stage after clearing four foes.</small></span><button class="switch" data-setting="autoAdvance" aria-label="Auto-advance" aria-pressed="${s.settings.autoAdvance}"></button></div><div class="save-explainer">${icon('check')}<span><strong>Saved on this device</strong><small>Progress saves every 5 seconds and after important actions. Keep this browser’s website data to keep your adventure. Combat pauses while the page is in the background.</small></span></div><button class="outline-button full" data-action="close">Back to the adventure ${icon('arrow')}</button>`,
    );
  }
  private guideModal() {
    this.openModal(
      `${this.modalHeader('A WANDERER’S FIELD GUIDE', 'Carry the flame')}<div class="guide-steps"><div>${icon('sword')}<span><strong>Descend & fight</strong><p>Your knight attacks automatically. Abilities can be used by hand or auto-cast. Defeat four foes to unlock the next stage.</p></span></div><div>${icon('inventory')}<span><strong>Claim your strength</strong><p>Loot collects automatically. Compare relics in Inventory, equip upgrades, and sell spare gear for gold. All six slots affect combat. Rare or better relics carry traits: healing, stronger strikes, faster abilities, or damage reduction. Traits stack up to three times.</p></span></div><div>${icon('town')}<span><strong>Rebuild Emberwick</strong><p>Upgrade the Blacksmith for better equipment stats, Guild Hall for experience, and Town Hall for gold and vitality. The Lantern Exchange commissions guaranteed relics. Hidden caches, springs, shrines, and first-clear bounties reward exploration.</p></span></div><div>${icon('skull')}<span><strong>Break the hollow crown</strong><p>Reach stage 10 and face The Hollow King. Watch his attack warnings and time Void Ward for Royal Reckoning and Crown of Ruin. His second phase always awakens. Defeat him for guaranteed legendary loot.</p></span></div></div><p class="muted small">Falling costs no gold or equipment. Your knight recovers in 4 seconds. Revisit unlocked stages to gather strength.</p><button class="gold-button full" data-action="close">My oath is made ${icon('arrow')}</button>`,
    );
  }
  toast(message: string) {
    const t = $('#toast');
    t.textContent = message;
    t.hidden = false;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (t.hidden = true), 4500);
  }
  saved(ok: boolean) {
    $('#save-status').innerHTML =
      `${icon(ok ? 'check' : 'info')} ${ok ? 'Progress saved locally' : 'Saving unavailable · keep this tab open'}`;
    if (!ok && !this.saveWarningShown) {
      this.saveWarningShown = true;
      this.toast(
        'Your browser could not save progress. Keep this tab open and allow website storage.',
      );
    }
  }
  syncSettingsModal() {
    if ($<HTMLDialogElement>('#modal').open && this.selected === null)
      document
        .querySelectorAll<HTMLElement>('.switch[data-setting]')
        .forEach((b) =>
          b.setAttribute(
            'aria-pressed',
            String(this.engine.state.settings[b.dataset.setting as keyof Settings]),
          ),
        );
  }
}

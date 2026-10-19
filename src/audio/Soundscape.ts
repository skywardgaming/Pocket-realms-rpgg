import type { GameEngine } from '../game/engine';
import type { GameEvent } from '../game/types';

/** Original synthesized music and effects. Silent until an explicit user gesture. */
export class Soundscape {
  private context?: AudioContext;
  private voices = new Set<OscillatorNode>();
  private musicVoices = new Set<OscillatorNode>();
  private timer?: ReturnType<typeof setInterval>;
  private step = 0;
  private unsubscribe: () => void;
  private disposed = false;
  private gesture = () => {
    void this.unlock();
  };
  constructor(private engine: GameEngine) {
    this.unsubscribe = engine.on((event) => this.event(event));
    document.addEventListener('click', this.gesture);
    document.addEventListener('keydown', this.gesture);
  }
  async unlock() {
    if (this.disposed || (!this.engine.state.settings.sound && !this.engine.state.settings.music))
      return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') await this.context.resume();
      if (!this.disposed) this.sync();
    } catch {
      /* Unsupported or gesture-blocked audio never blocks play. */
    }
  }
  sync() {
    if (!this.context || this.disposed) return;
    const settings = this.engine.state.settings;
    const active = !document.hidden && !settings.paused && (settings.sound || settings.music);
    if (!active) {
      this.stopMusic();
      this.stopVoices();
      if (this.context.state === 'running') void this.context.suspend().catch(() => {});
      return;
    }
    if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    if (settings.music && !this.timer) {
      this.music();
      this.timer = setInterval(() => this.music(), 1600);
    } else if (!settings.music) this.stopMusic();
    if (!settings.sound)
      for (const voice of this.voices) if (!this.musicVoices.has(voice)) this.stop(voice);
  }
  private tone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
    music = false,
  ) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || this.voices.size >= 12) return;
    const voice = ctx.createOscillator(),
      gain = ctx.createGain();
    voice.type = type;
    voice.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    voice.connect(gain);
    gain.connect(ctx.destination);
    this.voices.add(voice);
    if (music) this.musicVoices.add(voice);
    voice.onended = () => {
      this.voices.delete(voice);
      this.musicVoices.delete(voice);
      voice.disconnect();
      gain.disconnect();
    };
    voice.start();
    voice.stop(ctx.currentTime + duration + 0.02);
  }
  private music() {
    if (document.hidden || this.engine.state.settings.paused || !this.engine.state.settings.music)
      return;
    // An original D-minor / suspended ambient progression at a quiet master level.
    const root = [73.42, 65.41, 58.27, 65.41][Math.floor(this.step / 4) % 4];
    this.tone(root, 2.8, 0.018, 'sine', true);
    this.tone(root * [2, 3, 4, 3][this.step++ % 4], 1.3, 0.012, 'triangle', true);
  }
  private event(event: GameEvent) {
    if (!this.engine.state.settings.sound || this.engine.state.settings.paused || document.hidden)
      return;
    if (event.type === 'hit')
      this.tone(
        event.target === 'hero' ? 90 : event.magic ? 390 : 155,
        0.11,
        event.critical ? 0.035 : 0.02,
        'triangle',
      );
    if (event.type === 'heal') this.tone(523.25, 0.3, 0.02);
    if (event.type === 'loot')
      this.tone(event.item.rarity === 'legendary' ? 1046.5 : 659.25, 0.6, 0.03);
    if (event.type === 'telegraph' || event.type === 'phase') this.tone(55, 0.8, 0.035, 'triangle');
    if (event.type === 'level' || event.type === 'encounter') this.tone(783.99, 0.7, 0.025);
  }
  private stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    for (const voice of this.musicVoices) this.stop(voice);
    this.musicVoices.clear();
  }
  private stop(voice: OscillatorNode) {
    try {
      voice.stop();
    } catch {
      /* Already ended. */
    }
    this.voices.delete(voice);
  }
  private stopVoices() {
    for (const voice of this.voices) this.stop(voice);
    this.voices.clear();
    this.musicVoices.clear();
  }
  destroy() {
    this.disposed = true;
    this.unsubscribe();
    this.stopMusic();
    this.stopVoices();
    document.removeEventListener('click', this.gesture);
    document.removeEventListener('keydown', this.gesture);
    void this.context?.close().catch(() => {});
  }
}

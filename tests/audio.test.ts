import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Soundscape } from '../src/audio/Soundscape';
import { GameEngine } from '../src/game/engine';
import { newSave } from '../src/game/save';

class AudioDocument extends EventTarget {
  hidden = false;
}
class Voice {
  frequency = { setValueAtTime: vi.fn() };
  type = 'sine';
  onended?: () => void;
  stopped = false;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop(when?: number) {
    if (when === undefined) {
      this.stopped = true;
      this.onended?.();
    }
  }
}
class Context {
  static instances: Context[] = [];
  state = 'suspended';
  currentTime = 0;
  destination = {};
  voices: Voice[] = [];
  constructor() {
    Context.instances.push(this);
  }
  async resume() {
    this.state = 'running';
  }
  async suspend() {
    this.state = 'suspended';
  }
  async close() {
    this.state = 'closed';
  }
  createOscillator() {
    const voice = new Voice();
    this.voices.push(voice);
    return voice;
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
}
let doc: AudioDocument;
let sound: Soundscape;
let engine: GameEngine;
beforeEach(() => {
  vi.useFakeTimers();
  Context.instances = [];
  doc = new AudioDocument();
  vi.stubGlobal('document', doc);
  vi.stubGlobal('AudioContext', Context);
  engine = new GameEngine(newSave(), () => 0.5);
  sound = new Soundscape(engine);
});
afterEach(() => {
  sound.destroy();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('optional original soundscape lifecycle', () => {
  it('creates no audio context or music timer while disabled or before a gesture', () => {
    sound.sync();
    doc.dispatchEvent(new Event('click'));
    expect(Context.instances).toHaveLength(0);
    engine.state.settings.music = true;
    sound.sync();
    expect(Context.instances).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('plays enabled music only after unlocking and suspends immediately on mute', async () => {
    engine.state.settings.music = true;
    await sound.unlock();
    const ctx = Context.instances[0];
    expect(ctx.voices).toHaveLength(2);
    expect(vi.getTimerCount()).toBe(1);
    engine.state.settings.music = false;
    sound.sync();
    expect(vi.getTimerCount()).toBe(0);
    expect(ctx.state).toBe('suspended');
    expect(ctx.voices.every((v) => v.stopped)).toBe(true);
  });
  it('stops music voices independently while leaving enabled strike effects available', async () => {
    engine.state.settings.sound = engine.state.settings.music = true;
    await sound.unlock();
    const ctx = Context.instances[0];
    engine.state.settings.music = false;
    sound.sync();
    expect(ctx.voices.every((v) => v.stopped)).toBe(true);
    for (let i = 0; i < 4; i++) engine.tick(0.25);
    expect(ctx.voices.some((v) => !v.stopped)).toBe(true);
    expect(ctx.state).toBe('running');
  });
  it('stops timers and voices when backgrounded or paused, and releases the context on disposal', async () => {
    engine.state.settings.music = true;
    await sound.unlock();
    const ctx = Context.instances[0];
    doc.hidden = true;
    sound.sync();
    expect(ctx.state).toBe('suspended');
    expect(vi.getTimerCount()).toBe(0);
    doc.hidden = false;
    await sound.unlock();
    expect(vi.getTimerCount()).toBe(1);
    engine.state.settings.paused = true;
    sound.sync();
    expect(vi.getTimerCount()).toBe(0);
    expect(ctx.state).toBe('suspended');
    sound.destroy();
    expect(ctx.state).toBe('closed');
  });
  it('handles unavailable or blocked Web Audio without blocking gameplay', async () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('unavailable');
        }
      },
    );
    engine.state.settings.sound = true;
    await expect(sound.unlock()).resolves.toBeUndefined();
    expect(() => {
      sound.sync();
      engine.tick(0.25);
    }).not.toThrow();
  });
});

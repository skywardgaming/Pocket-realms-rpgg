import './style.css';
import './premium.css';
import { GameEngine } from './game/engine';
import { coalescedSave, newSave, SaveStore } from './game/save';
import { createDungeon } from './render/DungeonScene';
import { App } from './ui/App';
import { Soundscape } from './audio/Soundscape';
const store = new SaveStore();
const loaded = store.load();
const state = loaded ?? newSave();
if (!loaded)
  state.settings.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.toggle('reduced-motion', state.settings.reducedMotion);
const engine = new GameEngine(state);
let app: App;
let disposed = false;
const persistNow = () => {
  if (disposed) return;
  const ok = store.save(engine.state);
  app?.saved(ok);
};
const requestSave = coalescedSave(persistNow);
app = new App(engine, requestSave);
const soundscape = new Soundscape(engine);
const game = createDungeon(document.querySelector('#game-canvas')!, engine);
document.querySelector('.scene-loading')?.remove();
let previous = performance.now(),
  saveElapsed = 0,
  uiElapsed = 0,
  frameId = 0;
function frame(now: number) {
  const dt = Math.min((now - previous) / 1000, 0.25);
  previous = now;
  if (!document.hidden) {
    engine.tick(dt);
    saveElapsed += dt;
    uiElapsed += dt;
    if (uiElapsed > 0.1) {
      app.refresh();
      app.syncSettingsModal();
      soundscape.sync();
      uiElapsed = 0;
    }
    if (saveElapsed >= 5) {
      persistNow();
      saveElapsed = 0;
    }
  }
  frameId = requestAnimationFrame(frame);
}
frameId = requestAnimationFrame(frame);
const visibilityChanged = () => {
  previous = performance.now();
  if (document.hidden) persistNow();
  soundscape.sync();
};
document.addEventListener('visibilitychange', visibilityChanged);
window.addEventListener('pagehide', persistNow);
persistNow();
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    disposed = true;
    cancelAnimationFrame(frameId);
    document.removeEventListener('visibilitychange', visibilityChanged);
    window.removeEventListener('pagehide', persistNow);
    app.destroy();
    game.destroy(true);
    soundscape.destroy();
  });

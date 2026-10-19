import './style.css';
import './premium.css';
import { GameEngine } from './game/engine';
import { coalescedSave, newSave, SaveStore } from './game/save';
import { createDungeon } from './render/DungeonScene';
import { App } from './ui/App';
const store = new SaveStore();
const loaded = store.load();
const state = loaded ?? newSave();
if (!loaded)
  state.settings.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.toggle('reduced-motion', state.settings.reducedMotion);
const engine = new GameEngine(state);
let app: App;
const persistNow = () => {
  const ok = store.save(engine.state);
  app?.saved(ok);
};
const requestSave = coalescedSave(persistNow);
app = new App(engine, requestSave);
const game = createDungeon(document.querySelector('#game-canvas')!, engine);
document.querySelector('.scene-loading')?.remove();
let previous = performance.now(),
  saveElapsed = 0,
  uiElapsed = 0;
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
      uiElapsed = 0;
    }
    if (saveElapsed >= 5) {
      persistNow();
      saveElapsed = 0;
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', () => {
  previous = performance.now();
  if (document.hidden) persistNow();
});
window.addEventListener('pagehide', persistNow);
persistNow();
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    game.destroy(true);
  });

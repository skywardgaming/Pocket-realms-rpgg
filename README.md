# Pocket Realms: Dungeon Ascension

An original, portrait-first dark fantasy idle RPG built with **Vite, TypeScript, and Phaser 3**. Fight beneath a forgotten kingdom, collect randomized relics, and rebuild the lantern-lit town of Emberwick. All artwork is generated in code; no external art, paid assets, web fonts, or runtime services are required.

## Run and preview

Requires Node.js **22.12+** (Node 24 also supported) and npm.

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**. For an iPhone on the same Wi-Fi, open `http://YOUR_COMPUTER_LAN_IP:5173` in Safari. The dev server listens on all interfaces; allow that port through your local firewall if needed. Modern iPhone Safari (iOS 17+) is the target. Portrait and landscape layouts work; desktop has a wider dungeon dashboard.

```sh
npm test           # deterministic gameplay, economy, boss, and save tests
npm run build     # TypeScript verification + production bundle in dist/
npm run preview   # serve the production build at http://localhost:4173
npm run format    # format source and documentation
```

## Play

- **Dungeon:** Your knight fights automatically. Four victories unlock the next stage. Choose **Descend** or enable **Auto-advance**; the default stays on a cleared stage so you can farm. The dungeon map revisits any unlocked stage, restoring health and resetting that stage's encounter counter.
- **Abilities:** Soul Cleave deals 280% attack, Crimson Mend restores 32% maximum health, and Void Ward reduces damage by 55% for six seconds. Auto-cast uses healing and ward defensively. Disable it to time abilities manually. Pausing freezes combat and cooldowns.
- **Hero:** Inspect six equipped slots: weapon, helm, armor, gauntlets, boots, and amulet. Attack, armor, vitality, and critical chance all affect combat. Armor uses diminishing damage reduction, and critical chance caps at 65%.
- **Inventory:** Compare exact item stats before equipping. Filter by equipment category, sort by power or rarity, and sell individual relics or all common gear. A small starting pack includes two upgrades to try. Incoming loot is collected automatically; overflow beyond 60 slots is sold automatically.
- **Town:** The Blacksmith boosts equipment stats by 8% per level. The Guild Hall increases experience by 15% per level. The Town Hall increases gold by 15% and maximum health by 12 per level. Each building has ten upgrade levels and increasing costs. Bonuses apply immediately.
- **Enemies:** Sentinels use steady melee strikes. Ashen Hounds have less health and attack faster. Veil Wraiths cast slower magic that bypasses half of your armor.
- **The Hollow King:** Stage 10 features a two-phase boss. At half health, the crown awakens, his attack cadence accelerates, and his damage increases. Phase two cannot be skipped by an overpowered first strike. Winning guarantees a legendary item. Replay the encounter to collect more relics.
- **Recovery:** Defeat preserves your gold, equipment, and unlocked stages. Recover to full health in four seconds and try again. Revisit earlier stages to improve your gear if progress slows.

## Saving and accessibility

Progress saves to `localStorage` under `pocket-realms.save.v1` every five seconds, after meaningful progression and equipment/town actions, and on page hide. Saves are versioned and validated before loading. Malformed saves fall back to a new adventure without crashing. If storage is unavailable, the game reports that progress cannot be saved. Website data must be retained to keep progression; saves belong to the current browser and origin.

Combat runs while any game tab is open. It freezes when the browser page is in the background; there are **no offline rewards**. Reloading preserves progression and hero health, starts a fresh enemy encounter, and resets ability cooldowns. Pause and reduced-motion preferences persist. Reduced motion follows the device setting on first launch and can be changed in Settings. It suppresses ambient movement, attack lunges, particles, camera shake, and flashes; essential damage numbers remain readable.

Navigation, modals, controls, and inventory use native HTML elements, with keyboard focus indicators, labeled buttons, and accessible status messages. Canvas combat has equivalent enemy and hero health in the HTML interface. No audio or haptic permissions are required.

## Architecture

| Location                     | Responsibility                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| `src/game/engine.ts`         | Renderer-independent combat, abilities, boss phases, rewards, equipment, upgrades, recovery |
| `src/game/content.ts`        | Stage names, ability definitions, upgrade costs, rarity presentation                        |
| `src/game/loot.ts`           | Seedable randomized six-slot equipment and power comparisons                                |
| `src/game/save.ts`           | Versioned local persistence, validation, and graceful storage failure                       |
| `src/game/types.ts`          | Typed state and combat events                                                               |
| `src/render/art.ts`          | Original procedural dungeon, town, character sprites, and item art                          |
| `src/render/DungeonScene.ts` | Phaser animation, pixel flames, fog, spells, health bars, loot beams, and boss effects      |
| `src/ui/App.ts`              | Four responsive screens, comparison dialogs, settings, and action handling                  |
| `src/main.ts`                | Visibility-aware game clock and save lifecycle                                              |
| `tests/engine.test.ts`       | Deterministic unit and full-campaign integration tests                                      |

Phaser renders at 30 FPS with pixel-art sampling and WebGL/Canvas fallback. Domain progression is independent of animation frames, with a bounded delta to prevent background jumps. Art uses seeded procedural drawing and a small in-memory texture cache. HTML content from saves is escaped before display.

## Deployment

The production build is a **static site**. Upload the contents of `dist/` to any static host, such as GitHub Pages, Netlify, Cloudflare Pages, or Vercel. There is no server, database, API key, or paid service to configure. The Vite base is relative (`./`), so the same build works at a domain root or a GitHub Pages repository path. Use HTTPS for an iPhone deployment.

For hosts with Git integration:

- **Install command:** `npm ci`
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Node version:** 22.12+ or 24

For GitHub Pages, run `npm ci && npm run build` and publish `dist/` using the official Pages artifact/deploy actions or your existing Pages workflow. CI is included in `.github/workflows/ci.yml` and runs tests, type checking, production build, and formatting for pushes and pull requests. Deployment is intentionally left to the repository owner's hosting workflow.

## Verification and prototype scope

All 28 automated tests cover damage and critical hits, distinct enemy behavior, progression, pause, ability cooldowns and effects, the boss's mandatory second phase and legendary rewards, six-slot equipment changes, exact sale values, full-inventory overflow, all town bonuses and upgrade limits, save round trips and corrupt/blocked storage, atomic stage-clear saving, and a seeded complete ten-stage campaign using earned loot and upgrades. A Chromium browser walkthrough also verified all four tabs at 320, 390, 430, 844, and 1440 pixels, inventory comparison/equip/sale/filtering, exact building costs, pause, settings, reload persistence, stage locks, canvas resizing, and the boss's second phase with no runtime errors.

This is a complete single-player prototype. It has three normal enemy archetypes, ten escalating stages, randomized five-rarity loot, local progression, and a repeatable final boss. Secondary production features deferred: sound/music, cloud saves, offline rewards, crafting, multiple hero classes, and post-boss prestige. Real-device iPhone Safari validation is still recommended before release; desktop browser emulation does not substitute for device testing.

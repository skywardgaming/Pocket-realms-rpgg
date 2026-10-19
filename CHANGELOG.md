# Pocket Realms 2.0

## Phase 1 — visual foundation and combat presentation

- Started from development commit `62e1f92d6e94333cc002d50c7176ec528ec11516`.
- Added ten original environment palettes and architectural motifs: gravefire crypt, lava passage, ivory ossuary, spectral chains, amethyst crystals, drifting cinders, flooded chapel, obsidian gate, fallen court, and the Hollow Throne.
- Added seven procedural poses per character, idle and attack animation, layered additive lighting, stage transitions, and legendary discovery announcements.
- Restyled all four screens, equipment comparisons, menus, upgrade shops, modals, health bars, and abilities with obsidian, crimson, gold, and amethyst materials.
- Retained the existing engine, all six equipment slots, progression, and version-1 saves. Kept reduced-motion and pause behavior.
- Validation: all 28 existing tests, TypeScript, production build, and formatting. Chromium desktop and 390px mobile smoke tests found no runtime errors or horizontal overflow.

All new visuals are original procedural code. No external asset licenses or runtime downloads are needed.

## Phase 2 — encounter, loot, reward, and audio systems

- Added Ember Acolytes and Obsidian Guardians with original animated art, siphon magic, and physical resistance.
- Added heavy attacks every third enemy strike, a persistent HTML warning, a ground marker, manual Ward counterplay, and cancellation on kill, travel, or the king's awakening.
- Expanded the mandatory two-phase Hollow King with Royal Reckoning and the faster Crown of Ruin; retained guaranteed legendary boss loot.
- Added four capped, stackable equipment traits, with incoming/equipped trait comparisons and an active-trait hero panel. Old equipment remains untouched.
- Added the Lantern Exchange merchant with deterministic offers, distinct purchased IDs, exact prices, and atomic capacity/funds checks.
- Added rotating healing springs, gold caches, cooldown shrines, first-clear gold bounties, and guaranteed milestone relics. Rewards remain part of the existing coalesced save transaction.
- Added original optional synthesized effects and ambient music. Both default off, unlock on a user gesture, mute independently, and stop on pause/background/disposal. Audio failures never stop gameplay.
- Preserved the `pocket-realms.save.v1` key and version 1 data; legacy saves gain only disabled audio defaults. Invalid optional traits/settings are rejected.
- Added 20 gameplay/save tests and five audio lifecycle tests. All 53 tests, TypeScript, production build, and formatting pass.

## Phase 3 — release verification and documentation

- Versioned the package as 2.0.0; documented mechanics, preview commands, save compatibility, architecture, and original asset provenance.
- Browser verification exercises all four tabs at five mobile/desktop widths, merchant purchases, equipment comparison and traits, settings, all ten themes, and reload persistence.
- Real-device iPhone Safari performance, audio listening, and long-session battery testing remain release validation tasks. Cloud saves, offline rewards, crafting, alternate classes, and prestige remain outside scope.

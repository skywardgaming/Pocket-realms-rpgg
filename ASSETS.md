# Asset provenance

All game visuals are original procedural artwork in `src/render/art.ts`, `src/render/themes.ts`, and `src/render/DungeonScene.ts`: dungeon masonry and motifs, town buildings, character poses, equipment icons, lighting, spell strokes, fog, embers, and loot beams. UI icons are original SVG paths in `src/ui/icons.ts`. The existing favicon is retained.

All new sound effects and the ambient D-minor progression are synthesized locally by `src/audio/Soundscape.ts`. No samples, recordings, music downloads, image downloads, external fonts, or third-party art packs are used. System fonts provide the interface typography.

Phaser is the retained MIT-licensed rendering dependency. Its license is available in the installed `node_modules/phaser/LICENSE.md`; this overhaul introduces no new runtime dependencies. Development tooling retains its upstream licenses.

This file records provenance, not a new license for the repository's own source. New procedural assets are distributed as part of this repository under the same terms as its other original game code.

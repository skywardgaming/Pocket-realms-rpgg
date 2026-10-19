/** Original art direction; all environment art is drawn locally, without downloads. */
export const THEMES = [
  { name: 'Gravefire', tint: '#263940', light: '#ef6548', magic: '#ac83f4', motif: 'crypt' },
  { name: 'Emberfall', tint: '#56302d', light: '#ff553d', magic: '#f0a15d', motif: 'lava' },
  { name: 'Ivory ossuary', tint: '#494439', light: '#f0c27e', magic: '#c9e5a1', motif: 'bones' },
  { name: 'Spectral mist', tint: '#244745', light: '#6ed8c1', magic: '#95e7dc', motif: 'chains' },
  { name: 'Amethyst', tint: '#493363', light: '#bc77ff', magic: '#dfb5ff', motif: 'crystals' },
  { name: 'Cinder storm', tint: '#4c3835', light: '#ff8160', magic: '#c8a78b', motif: 'ash' },
  { name: 'Moonlit tide', tint: '#24475a', light: '#66c9f5', magic: '#97e6ff', motif: 'water' },
  { name: 'Obsidian eclipse', tint: '#28243e', light: '#d35572', magic: '#9d8bff', motif: 'gate' },
  { name: 'Fallen court', tint: '#513240', light: '#eda371', magic: '#e088be', motif: 'banners' },
  {
    name: 'The hollow crown',
    tint: '#3e2859',
    light: '#ff5170',
    magic: '#c69aff',
    motif: 'throne',
  },
] as const;
export function stageTheme(stage: number) {
  return THEMES[Math.max(0, Math.min(9, Math.floor(stage) - 1))];
}

const paths: Record<string, string> = {
  sword: '<path d="m15 3 5 1-1 5L9 19l-4-4Z"/><path d="m3 13 8 8M7 17l-5 5M16 6l-7 9"/>',
  dungeon:
    '<path d="M4 21V9l8-6 8 6v12h-5v-7a3 3 0 0 0-6 0v7Z"/><path d="M3 9h18M5 5V2m14 3V2M11 4V1"/>',
  hero: '<path d="m12 2 8 4-1 10-7 6-7-6L4 6Z"/><path d="m8 9 4-3 4 3v6l-4 3-4-3Zm0 3h8m-4-6v12"/>',
  inventory: '<path d="M5 8h14l2 13H3ZM8 8V5a4 4 0 0 1 8 0v3"/><path d="M9 12v3m6-3v3M8 18h8"/>',
  town: '<path d="M3 21V10l5-4 5 4v11m0-7 4-3 4 3v7M1 21h22M5 14h2m-2 3h2m9 0h2M6 6V3h4v4"/>',
  gold: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v5c0 4 16 4 16 0V6M4 11v5c0 4 16 4 16 0v-5"/><path d="M8 8v3m4-2v3m4-4v3M8 17v2m8-2v2"/>',
  gem: '<path d="m3 8 5-5h8l5 5-9 14Z"/><path d="M3 8h18M8 3l4 19 4-19"/>',
  settings:
    '<path d="m9 3 1-2h4l1 2 3 2 2 1-1 4v4l1 4-3 1-2 2h-5l-2-2-4-1 1-4v-4L4 6l3-1Z"/><circle cx="12" cy="11" r="3"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m5 9 7 7 7-7"/>',
  check: '<path d="m5 12 5 5L20 6"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="4"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  heart:
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 6l-1-1.4a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-9.6a5.5 5.5 0 0 0 0-7.8Z"/><path d="M4 12h4l2-4 4 9 2-5h4"/>',
  shield: '<path d="m12 2 9 4-2 11-7 5-7-5L3 6Z"/><path d="M12 6v12M7 10h10"/>',
  rune: '<path d="m12 2 9 10-9 10L3 12Z"/><path d="m12 6 5 6-5 6-5-6Zm0 3v6m-3-3h6"/>',
  spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
  anvil: '<path d="M3 7h18l-4 5H7L3 9ZM9 12v5l-4 4h14l-4-4v-5M7 7V4h7v3"/>',
  close: '<path d="m5 5 14 14M19 5 5 19"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  map: '<path d="m3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3Zm6-3v17m6-14v17"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  skull:
    '<path d="M5 15a9 9 0 1 1 14 0v5h-4v2H9v-2H5Z"/><circle cx="8" cy="10" r="2"/><circle cx="16" cy="10" r="2"/><path d="m12 13-1 3h2ZM9 18v3m6-3v3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v7m0-12v2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
};
export function icon(name: string, cls = ''): string {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.spark}</svg>`;
}

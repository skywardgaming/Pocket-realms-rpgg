import type { EnemyKind, Rarity, Slot } from '../game/types';
import { RARITY } from '../game/content';
export function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const element = document.createElement('canvas');
  element.width = w;
  element.height = h;
  const context = element.getContext('2d')!;
  context.imageSmoothingEnabled = false;
  return [element, context];
}
function rect(
  c: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function poly(c: CanvasRenderingContext2D, color: string, points: number[][]) {
  c.fillStyle = color;
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
}
function glow(c: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  const g = c.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'transparent');
  c.fillStyle = g;
  c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
export function dungeonArt(): HTMLCanvasElement {
  const [el, c] = canvas(640, 360);
  const random = seeded(8912);
  const back = c.createLinearGradient(0, 0, 0, 360);
  back.addColorStop(0, '#121a20');
  back.addColorStop(0.68, '#263030');
  back.addColorStop(1, '#11171b');
  c.fillStyle = back;
  c.fillRect(0, 0, 640, 360);
  // Individual offset blocks give the ruin a hand-built pixel silhouette.
  for (let row = 0; row < 13; row++)
    for (let col = -1; col < 17; col++) {
      const x = col * 43 + (row % 2 ? 22 : 0),
        y = row * 20;
      const value = 25 + Math.floor(random() * 13);
      rect(c, `rgb(${value - 3},${value + 4},${value + 8})`, x, y, 41, 18);
      rect(c, '#394044', x + 1, y, 39, 1);
      rect(c, '#161e23', x + 40, y, 1, 18);
      if (random() > 0.55) rect(c, '#1b2429', x + random() * 26, y + 9, 9, 1);
    }
  function arch(x: number, width: number, top: number, bottom: number, portal = false) {
    const center = x + width / 2;
    c.fillStyle = '#090f16';
    c.beginPath();
    c.moveTo(x, bottom);
    c.lineTo(x, top + width / 2);
    c.arc(center, top + width / 2, width / 2, Math.PI, 0);
    c.lineTo(x + width, bottom);
    c.closePath();
    c.fill();
    if (portal) {
      c.save();
      c.clip();
      const gr = c.createLinearGradient(x, 0, x + width, 0);
      gr.addColorStop(0, '#1a172e');
      gr.addColorStop(0.5, '#523c66');
      gr.addColorStop(1, '#19192c');
      c.fillStyle = gr;
      c.fillRect(x, top, width, bottom - top);
      for (let i = 0; i < 40; i++) {
        const a = x + random() * width;
        rect(
          c,
          i % 3 ? '#4f3e63' : '#81678a',
          a,
          top + random() * (bottom - top),
          1,
          3 + random() * 35,
        );
      }
      c.restore();
      glow(c, center, bottom - 35, 100, '#7651a347');
      rect(c, '#86739c', center - 1, top + 40, 2, 130);
      rect(c, '#a895bb', center, top + 80, 1, 90);
    } else {
      for (let bar = x + 9; bar < x + width; bar += 13) {
        rect(c, '#293137', bar, top + width * 0.35, 3, bottom - top);
        rect(c, '#3b4042', bar, top + width * 0.35, 1, bottom - top);
      }
      rect(c, '#34393b', x, top + 115, width, 4);
    }
    for (let i = 0; i < 13; i++) {
      const angle = Math.PI + (i * Math.PI) / 12;
      const radius = width / 2 + 7;
      c.save();
      c.translate(center + Math.cos(angle) * radius, top + width / 2 + Math.sin(angle) * radius);
      c.rotate(angle + Math.PI / 2);
      rect(c, i % 2 ? '#414a4c' : '#384346', -7, -8, 13, 17);
      rect(c, '#56605d', -7, -8, 13, 2);
      rect(c, '#202b30', 5, -8, 2, 17);
      c.restore();
    }
    for (const side of [x - 15, x + width + 1])
      for (let y = top + width / 2; y < bottom; y += 19) {
        rect(c, '#3d484b', side, y, 14, 17);
        rect(c, '#535b58', side, y, 14, 2);
        rect(c, '#202b30', side + 11, y, 3, 17);
      }
  }
  arch(71, 103, 60, 261);
  arch(266, 108, 40, 264, true);
  arch(466, 103, 60, 261);
  // Recessed buttresses and banded columns.
  for (const x of [29, 209, 410, 593]) {
    rect(c, '#172126', x - 10, 0, 31, 273);
    rect(c, '#414b4c', x, 0, 17, 262);
    rect(c, '#515957', x + 1, 0, 3, 262);
    rect(c, '#252f34', x + 14, 0, 8, 262);
    for (let y = 14; y < 255; y += 24) {
      rect(c, '#19272d', x, y, 22, 2);
      rect(c, '#59615a', x, y + 2, 18, 1);
    }
    rect(c, '#58605a', x - 8, 62, 34, 8);
    rect(c, '#303c3e', x - 5, 70, 29, 7);
    rect(c, '#59615b', x - 6, 243, 31, 8);
    rect(c, '#374345', x - 10, 251, 39, 13);
    rect(c, '#202b2e', x - 14, 264, 46, 6);
  }
  // Steps to the violet portal.
  for (let y = 240; y < 272; y += 7) {
    rect(c, '#42484a', 250 - (y - 240) * 0.55, y, 142 + (y - 240) * 1.1, 5);
    rect(c, '#5a5b58', 250 - (y - 240) * 0.55, y, 142 + (y - 240) * 1.1, 1);
  }
  poly(c, '#252e31', [
    [0, 270],
    [640, 270],
    [640, 360],
    [0, 360],
  ]);
  for (let row = 0; row < 8; row++) {
    const y = 270 + row * 12,
      tileW = 38 + row * 8;
    for (let x = -tileW; x < 640; x += tileW + 3) {
      const off = row % 2 ? tileW * 0.5 : 0;
      const v = 28 + Math.floor(random() * 15);
      poly(c, `rgb(${v},${v + 7},${v + 9})`, [
        [x + off, y],
        [x + off + tileW - 3, y],
        [x + off + tileW + 4, y + 10],
        [x + off - 4, y + 10],
      ]);
      rect(c, '#4a5150', x + off + 2, y, tileW - 5, 1);
      if (random() > 0.7) rect(c, '#172226', x + off + 11, y + 5, 14, 1);
    }
  }
  glow(c, 320, 267, 130, '#74678f25');
  glow(c, 187, 153, 125, '#cc532d24');
  glow(c, 451, 153, 125, '#d15a3024');
  // Tattered crimson banners.
  for (const x of [233, 393]) {
    rect(c, '#6b3031', x, 55, 15, 67);
    rect(c, '#893d38', x + 2, 56, 3, 54);
    poly(c, '#592a30', [
      [x, 115],
      [x + 15, 115],
      [x + 15, 135],
      [x + 8, 126],
      [x, 135],
    ]);
    rect(c, '#ad8851', x - 3, 53, 21, 3);
    rect(c, '#a17a46', x + 6, 75, 3, 15);
    rect(c, '#a17a46', x + 2, 80, 11, 3);
  }
  // Candle clusters, bones, shattered stone and creeping moss.
  for (let i = 0; i < 65; i++) {
    const x = random() * 640,
      y = 270 + random() * 90;
    rect(c, i % 3 ? '#3c4441' : '#4c5149', x, y, 2 + random() * 7, 2 + random() * 3);
  }
  for (const [x, y] of [
    [80, 290],
    [480, 307],
    [560, 280],
  ]) {
    rect(c, '#9a9b84', x, y, 9, 5);
    rect(c, '#b0ae91', x + 2, y - 2, 5, 3);
    rect(c, '#273132', x + 2, y + 1, 2, 2);
    rect(c, '#273132', x + 6, y + 1, 2, 2);
    rect(c, '#a8a88f', x + 13, y + 4, 10, 2);
  }
  for (const [x, y] of [
    [245, 258],
    [382, 258],
    [96, 264],
    [531, 264],
  ]) {
    for (let i = 0; i < 3; i++) {
      rect(c, '#918370', x + i * 6, y - 5 - i * 2, 3, 10 + i * 2);
      rect(c, '#f5c07b', x + i * 6, y - 8 - i * 2, 2, 3);
    }
    glow(c, x + 6, y - 5, 30, '#edaf4a18');
  }
  for (let i = 0; i < 170; i++) {
    const x = random() * 640,
      y = random() * 270;
    if (x < 55 || x > 585 || y < 26) rect(c, '#354440', x, y, 2 + random() * 4, 1 + random() * 4);
  }
  // Foreground silhouettes frame the scene.
  poly(c, '#0a1116', [
    [0, 0],
    [18, 0],
    [17, 80],
    [28, 85],
    [23, 170],
    [31, 174],
    [28, 319],
    [49, 331],
    [50, 360],
    [0, 360],
  ]);
  poly(c, '#0a1116', [
    [640, 0],
    [625, 0],
    [627, 100],
    [615, 108],
    [621, 210],
    [613, 215],
    [615, 325],
    [591, 335],
    [590, 360],
    [640, 360],
  ]);
  const vignette = c.createRadialGradient(320, 205, 60, 320, 205, 365);
  vignette.addColorStop(0, 'transparent');
  vignette.addColorStop(1, '#050b10bb');
  c.fillStyle = vignette;
  c.fillRect(0, 0, 640, 360);
  return el;
}
export function characterArt(kind: 'hero' | EnemyKind): HTMLCanvasElement {
  const boss = kind === 'king';
  const [el, c] = canvas(boss ? 88 : 48, boss ? 108 : 64);
  if (kind === 'hero') {
    poly(c, '#2b1824', [
      [19, 16],
      [32, 17],
      [39, 53],
      [29, 50],
      [25, 58],
      [12, 53],
    ]);
    poly(c, '#923e3a', [
      [17, 20],
      [25, 21],
      [29, 49],
      [20, 54],
      [12, 50],
    ]);
    rect(c, '#ba5548', 16, 25, 3, 23);
    rect(c, '#642c32', 22, 21, 5, 30);
    rect(c, '#17232b', 20, 43, 17, 8);
    rect(c, '#818d88', 22, 43, 5, 11);
    rect(c, '#3e5056', 29, 43, 5, 13);
    rect(c, '#b3b6a1', 22, 44, 2, 8);
    rect(c, '#252f36', 21, 54, 8, 4);
    rect(c, '#252f36', 29, 54, 8, 4);
    rect(c, '#394c58', 17, 22, 17, 21);
    rect(c, '#a6b7b0', 20, 23, 12, 7);
    rect(c, '#708e91', 23, 31, 10, 10);
    rect(c, '#c4c8ad', 19, 24, 3, 5);
    rect(c, '#263b49', 27, 28, 5, 12);
    rect(c, '#c09a5b', 18, 40, 17, 3);
    rect(c, '#e2c384', 26, 40, 4, 3);
    rect(c, '#4d626a', 16, 11, 17, 13);
    rect(c, '#a9b9b3', 18, 8, 12, 5);
    rect(c, '#c4c6ab', 18, 12, 14, 3);
    rect(c, '#172c39', 23, 16, 11, 5);
    rect(c, '#ded8b6', 19, 14, 4, 10);
    rect(c, '#78aeb4', 25, 17, 7, 1);
    rect(c, '#943a39', 17, 6, 8, 3);
    poly(c, '#344851', [
      [10, 27],
      [19, 25],
      [22, 30],
      [20, 45],
      [15, 49],
      [8, 42],
    ]);
    poly(c, '#8c9f98', [
      [10, 28],
      [18, 27],
      [20, 31],
      [18, 42],
      [15, 46],
      [10, 40],
    ]);
    rect(c, '#bb9a60', 14, 29, 2, 13);
    rect(c, '#c7af75', 11, 33, 8, 2);
    rect(c, '#aeb9ac', 34, 27, 6, 6);
    rect(c, '#526b72', 34, 31, 5, 8);
    rect(c, '#d3ccb1', 38, 29, 3, 9);
    poly(c, '#dbe0c8', [
      [41, 8],
      [44, 4],
      [44, 34],
      [40, 34],
    ]);
    rect(c, '#8ba4a5', 42, 12, 2, 20);
    rect(c, '#b89a58', 37, 34, 11, 3);
    rect(c, '#5c3e34', 41, 37, 3, 8);
    rect(c, '#d3b97a', 40, 44, 5, 3);
  } else if (kind === 'skeleton') {
    poly(c, '#384c4b', [
      [18, 22],
      [29, 22],
      [36, 49],
      [17, 48],
    ]);
    rect(c, '#808676', 19, 25, 11, 20);
    for (let y = 28; y < 40; y += 5) rect(c, '#c7c4a5', 18, y, 15, 2);
    rect(c, '#4b5d5a', 24, 24, 3, 19);
    rect(c, '#b6b49a', 18, 9, 14, 14);
    rect(c, '#dbd5af', 21, 7, 9, 4);
    rect(c, '#253533', 19, 14, 5, 4);
    rect(c, '#253533', 27, 14, 5, 4);
    rect(c, '#b95f48', 20, 15, 2, 2);
    rect(c, '#b95f48', 28, 15, 2, 2);
    rect(c, '#605e51', 23, 21, 2, 3);
    rect(c, '#dbd5af', 27, 20, 2, 4);
    rect(c, '#b0b29b', 15, 26, 4, 18);
    rect(c, '#b0b29b', 33, 26, 4, 18);
    rect(c, '#939a84', 20, 46, 4, 11);
    rect(c, '#b3b59a', 29, 45, 4, 12);
    rect(c, '#464c46', 17, 56, 8, 3);
    rect(c, '#464c46', 28, 56, 8, 3);
    rect(c, '#687c78', 8, 20, 3, 27);
    rect(c, '#a5b0a1', 9, 18, 2, 25);
    rect(c, '#9a8051', 5, 43, 10, 3);
    poly(c, '#454d44', [
      [32, 29],
      [45, 31],
      [43, 46],
      [36, 51],
      [31, 44],
    ]);
    rect(c, '#837b57', 36, 33, 3, 12);
  } else if (kind === 'wraith') {
    glow(c, 24, 35, 27, '#906aca55');
    poly(c, '#382f55', [
      [22, 6],
      [31, 13],
      [33, 25],
      [41, 49],
      [36, 57],
      [31, 51],
      [25, 59],
      [20, 53],
      [13, 58],
      [8, 49],
      [17, 23],
      [16, 13],
    ]);
    poly(c, '#67517f', [
      [22, 13],
      [29, 18],
      [28, 35],
      [35, 50],
      [26, 48],
      [20, 53],
      [17, 39],
      [20, 25],
    ]);
    rect(c, '#161e32', 20, 16, 11, 11);
    rect(c, '#c6a7f2', 21, 20, 3, 2);
    rect(c, '#c6a7f2', 28, 20, 3, 2);
    rect(c, '#a292c0', 11, 33, 5, 4);
    rect(c, '#9e80c3', 36, 32, 5, 5);
    rect(c, '#c4a1ee', 39, 28, 4, 4);
    rect(c, '#ceacf6', 4, 23, 4, 4);
  } else if (kind === 'hound') {
    poly(c, '#3f3d42', [
      [6, 31],
      [14, 25],
      [31, 27],
      [40, 20],
      [43, 30],
      [39, 38],
      [32, 41],
      [30, 52],
      [25, 52],
      [24, 43],
      [15, 43],
      [12, 53],
      [7, 53],
      [8, 38],
      [2, 35],
    ]);
    poly(c, '#73716a', [
      [11, 28],
      [19, 28],
      [26, 31],
      [32, 29],
      [32, 37],
      [21, 39],
      [13, 36],
    ]);
    rect(c, '#b4a694', 34, 25, 9, 8);
    rect(c, '#c06445', 38, 27, 3, 2);
    rect(c, '#121c23', 40, 31, 6, 4);
    rect(c, '#d1c6a3', 38, 35, 2, 5);
    poly(c, '#8a473b', [
      [13, 26],
      [18, 18],
      [20, 28],
      [26, 23],
      [28, 30],
    ]);
    rect(c, '#c4804d', 16, 25, 2, 4);
  } else {
    glow(c, 44, 60, 43, '#7a4db733');
    poly(c, '#171627', [
      [26, 25],
      [60, 25],
      [72, 52],
      [79, 97],
      [68, 93],
      [62, 103],
      [49, 97],
      [39, 105],
      [29, 97],
      [17, 101],
      [11, 93],
      [20, 56],
    ]);
    poly(c, '#4c355e', [
      [27, 30],
      [42, 34],
      [46, 91],
      [36, 96],
      [29, 92],
      [20, 97],
      [20, 76],
    ]);
    poly(c, '#32253e', [
      [49, 31],
      [61, 30],
      [70, 79],
      [70, 95],
      [60, 91],
      [51, 99],
    ]);
    for (let i = 0; i < 5; i++) rect(c, '#735477', 24 + i * 3, 51 + i * 4, 2, 37 - i * 4);
    rect(c, '#3e4854', 28, 33, 32, 30);
    rect(c, '#798088', 32, 34, 25, 7);
    rect(c, '#adb09f', 34, 35, 20, 3);
    rect(c, '#263342', 35, 44, 18, 15);
    rect(c, '#9a865c', 29, 61, 32, 5);
    rect(c, '#c5a768', 42, 60, 7, 7);
    rect(c, '#8b68af', 44, 61, 3, 4);
    poly(c, '#4d5660', [
      [22, 27],
      [34, 28],
      [34, 42],
      [19, 40],
      [14, 33],
    ]);
    poly(c, '#4d5660', [
      [55, 27],
      [68, 27],
      [75, 35],
      [70, 41],
      [56, 42],
    ]);
    rect(c, '#a6a38b', 20, 30, 13, 3);
    rect(c, '#a6a38b', 57, 30, 12, 3);
    rect(c, '#778080', 32, 13, 25, 18);
    rect(c, '#c4c3a8', 35, 11, 19, 7);
    rect(c, '#202638', 35, 19, 19, 10);
    rect(c, '#d7b3fd', 36, 21, 6, 3);
    rect(c, '#d7b3fd', 48, 21, 6, 3);
    rect(c, '#abada0', 42, 25, 5, 8);
    rect(c, '#d1ceb2', 34, 28, 5, 6);
    rect(c, '#d1ceb2', 50, 28, 5, 6);
    poly(c, '#c5a15a', [
      [30, 15],
      [27, 1],
      [36, 9],
      [42, 0],
      [48, 9],
      [60, 1],
      [57, 16],
    ]);
    rect(c, '#f1d18a', 32, 12, 24, 3);
    rect(c, '#9f5ea0', 41, 9, 5, 6);
    rect(c, '#7a8590', 13, 39, 8, 24);
    rect(c, '#aeb5ac', 14, 59, 8, 8);
    rect(c, '#879092', 67, 39, 8, 22);
    rect(c, '#b3b8aa', 69, 60, 7, 7);
    poly(c, '#c6b2df', [
      [6, 42],
      [11, 35],
      [13, 88],
      [9, 94],
      [5, 88],
    ]);
    rect(c, '#8d68ad', 7, 49, 3, 37);
    rect(c, '#c5a15a', 1, 65, 19, 4);
    rect(c, '#76583e', 8, 69, 4, 12);
    rect(c, '#52626b', 33, 75, 8, 18);
    rect(c, '#7c8888', 49, 75, 8, 18);
    rect(c, '#b2b29d', 31, 90, 12, 6);
    rect(c, '#b2b29d', 48, 90, 13, 6);
  }
  return el;
}
const iconCache = new Map<string, string>();
export function itemArt(slot: Slot, rarity: Rarity): string {
  const key = slot + rarity;
  if (iconCache.has(key)) return iconCache.get(key)!;
  const [el, c] = canvas(40, 40);
  const metal = '#b9c1b8',
    shade = '#526a73',
    gold = RARITY[rarity].color;
  if (slot === 'weapon') {
    poly(c, metal, [
      [28, 3],
      [33, 3],
      [33, 9],
      [16, 28],
      [11, 23],
    ]);
    poly(c, shade, [
      [30, 6],
      [31, 8],
      [15, 25],
      [13, 24],
    ]);
    poly(c, gold, [
      [8, 20],
      [21, 31],
      [18, 34],
      [5, 23],
    ]);
    poly(c, '#78523d', [
      [11, 26],
      [15, 30],
      [7, 38],
      [3, 34],
    ]);
  }
  if (slot === 'head') {
    poly(c, shade, [
      [10, 11],
      [16, 5],
      [26, 5],
      [32, 12],
      [31, 31],
      [24, 34],
      [24, 23],
      [17, 23],
      [17, 34],
      [10, 30],
    ]);
    rect(c, metal, 12, 10, 17, 7);
    rect(c, gold, 18, 5, 5, 13);
    rect(c, '#202a32', 12, 19, 18, 4);
    rect(c, metal, 11, 23, 5, 9);
    rect(c, metal, 26, 23, 5, 9);
  }
  if (slot === 'chest') {
    poly(c, shade, [
      [6, 9],
      [14, 5],
      [26, 5],
      [34, 9],
      [31, 19],
      [27, 18],
      [29, 34],
      [12, 34],
      [13, 18],
      [8, 19],
    ]);
    rect(c, metal, 13, 8, 14, 9);
    rect(c, gold, 18, 9, 4, 18);
    rect(c, '#869c9d', 13, 20, 13, 8);
    rect(c, gold, 10, 30, 20, 3);
  }
  if (slot === 'hands') {
    rect(c, shade, 10, 7, 19, 24);
    rect(c, metal, 11, 8, 15, 8);
    rect(c, gold, 10, 6, 19, 4);
    poly(c, shade, [
      [10, 17],
      [6, 16],
      [4, 25],
      [12, 32],
      [27, 32],
      [31, 23],
      [27, 17],
    ]);
    rect(c, metal, 12, 19, 14, 8);
    rect(c, '#889d99', 13, 28, 13, 4);
  }
  if (slot === 'feet') {
    poly(c, shade, [
      [9, 6],
      [21, 6],
      [22, 24],
      [33, 28],
      [33, 34],
      [7, 34],
    ]);
    rect(c, metal, 10, 9, 10, 12);
    rect(c, gold, 9, 5, 13, 4);
    rect(c, '#8c9c96', 10, 24, 13, 8);
    rect(c, metal, 23, 29, 9, 3);
  }
  if (slot === 'amulet') {
    c.strokeStyle = gold;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(20, 13, 11, 0, Math.PI * 2);
    c.stroke();
    poly(c, gold, [
      [20, 17],
      [30, 27],
      [20, 38],
      [10, 27],
    ]);
    poly(c, rarity === 'legendary' ? '#d9ad52' : '#997ac6', [
      [20, 21],
      [26, 27],
      [20, 34],
      [14, 27],
    ]);
    rect(c, '#d7c9ea', 18, 24, 3, 3);
  }
  const url = el.toDataURL();
  iconCache.set(key, url);
  return url;
}
export function townArt(): HTMLCanvasElement {
  const [el, c] = canvas(640, 260);
  const random = seeded(328);
  const sky = c.createLinearGradient(0, 0, 0, 260);
  sky.addColorStop(0, '#34343b');
  sky.addColorStop(0.6, '#9c7456');
  sky.addColorStop(1, '#35463c');
  c.fillStyle = sky;
  c.fillRect(0, 0, 640, 260);
  glow(c, 445, 80, 160, '#e5ad5e44');
  rect(c, '#c6aa78', 441, 41, 20, 20);
  for (let i = 0; i < 4; i++)
    poly(c, ['#383e40', '#424c45', '#52604e', '#60705a'][i], [
      [0, 110 + i * 23],
      ...Array.from({ length: 15 }, (_, j) => [j * 48, 75 + i * 29 + random() * 40]),
      [640, 260],
      [0, 260],
    ]);
  for (let i = 0; i < 28; i++) {
    const x = random() * 640;
    poly(c, '#2d3d34', [
      [x, 80 + random() * 30],
      [x + 14, 173],
      [x - 14, 173],
    ]);
  }
  rect(c, '#515443', 0, 180, 640, 80);
  poly(c, '#7a7156', [
    [307, 170],
    [340, 170],
    [446, 260],
    [196, 260],
  ]);
  for (let i = 0; i < 160; i++) {
    const x = random() * 640,
      y = 183 + random() * 77;
    rect(c, '#62604a', x, y, 5 + random() * 10, 2);
  }
  function house(x: number, y: number, w: number, h: number, roof: string, tower = false) {
    rect(c, '#57594f', x, y, w, h);
    rect(c, '#8e8b70', x + 4, y + 3, w - 8, h - 3);
    rect(c, '#3d423d', x + w - 13, y, 13, h);
    for (let yy = y + 10; yy < y + h; yy += 13)
      for (let xx = x + 4; xx < x + w - 10; xx += 20) rect(c, '#706f5d', xx, yy, 17, 1);
    poly(c, roof, [
      [x - 10, y + 4],
      [x + w * 0.5, y - (tower ? 55 : 33)],
      [x + w + 10, y + 4],
    ]);
    for (let yy = 0; yy < 25; yy += 6) rect(c, '#b17d55', x + yy * 0.9, y - yy, w - yy * 1.8, 1);
    rect(c, '#514333', x + w / 2 - 8, y + h - 29, 18, 29);
    rect(c, '#b78a51', x + w / 2 + 5, y + h - 18, 2, 2);
    for (const xx of [x + 10, x + w - 28]) {
      rect(c, '#493b2d', xx, y + 12, 15, 18);
      rect(c, '#e8b55e', xx + 2, y + 14, 11, 14);
      rect(c, '#6b573c', xx + 7, y + 14, 1, 14);
    }
    glow(c, x + w / 2, y + 25, 60, '#e3a45818');
  }
  house(40, 134, 102, 74, '#6b3e33');
  house(232, 106, 111, 79, '#714b3c', true);
  house(448, 123, 121, 88, '#675048');
  rect(c, '#6b6556', 74, 87, 14, 33);
  rect(c, '#8b8064', 71, 85, 20, 5);
  house(152, 155, 50, 44, '#795143');
  house(364, 159, 55, 40, '#61483d');
  // Warm forge and hanging lanterns.
  rect(c, '#312d2a', 57, 177, 25, 22);
  glow(c, 69, 187, 35, '#ed7b3477');
  rect(c, '#e59d48', 60, 183, 18, 12);
  rect(c, '#f4cf7b', 66, 187, 9, 8);
  for (const x of [177, 429, 597]) {
    rect(c, '#363a31', x, 157, 3, 66);
    rect(c, '#363a31', x - 5, 157, 13, 3);
    rect(c, '#d3a451', x - 4, 160, 10, 12);
    rect(c, '#f5cf7b', x - 2, 162, 6, 7);
    glow(c, x, 168, 35, '#e6b05633');
  }
  for (let i = 0; i < 100; i++) rect(c, '#384631', random() * 640, 210 + random() * 50, 2, 4);
  const v = c.createRadialGradient(320, 140, 100, 320, 140, 370);
  v.addColorStop(0, 'transparent');
  v.addColorStop(1, '#101914aa');
  c.fillStyle = v;
  c.fillRect(0, 0, 640, 260);
  return el;
}

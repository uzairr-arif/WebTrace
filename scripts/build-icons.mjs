/**
 * WebTrace icon generator — renders the "route + nodes" logo to PNGs with
 * zero native dependencies (pngjs only). Output: apps/extension/public/icon/.
 *
 *   pnpm icons
 */

import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'apps', 'extension', 'public', 'icon');
mkdirSync(outDir, { recursive: true });

const SIZES = [16, 32, 48, 128];
const SS = 4; // supersampling factor for smooth edges

// Palette
const BG = [13, 18, 29, 255]; // #0d121d deep navy
const BG_EDGE = [24, 34, 52, 255];
const ACCENT = [34, 211, 238, 255]; // #22d3ee
const ACCENT_DIM = [34, 211, 238, 140];
const CORE = [10, 14, 22, 255];

const nodes = [
  { x: 0.24, y: 0.74, r: 0.115, fill: ACCENT_DIM, ring: null },
  { x: 0.76, y: 0.62, r: 0.115, fill: ACCENT_DIM, ring: null },
  { x: 0.5, y: 0.3, r: 0.16, fill: ACCENT, ring: CORE },
];
const lines = [
  [nodes[0], nodes[1]],
  [nodes[1], nodes[2]],
  [nodes[0], nodes[2]],
];
const LINE_W = 0.075;

function render(size) {
  const S = size * SS;
  const img = new PNG({ width: S, height: S });
  const cx = (v) => v * S;
  const radius = S * 0.22; // rounded-rect corner

  const inRoundedRect = (x, y) => {
    const minX = Math.min(x, S - x);
    const minY = Math.min(y, S - y);
    if (minX >= radius || minY >= radius) return true;
    const dx = radius - minX;
    const dy = radius - minY;
    return dx * dx + dy * dy <= radius * radius;
  };

  const distToSegment = (px, py, a, b) => {
    const ax = cx(a.x);
    const ay = cx(a.y);
    const bx = cx(b.x);
    const by = cx(b.y);
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const ex = ax + t * dx - px;
    const ey = ay + t * dy - py;
    return Math.sqrt(ex * ex + ey * ey);
  };

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const idx = (S * y + x) << 2;
      if (!inRoundedRect(x + 0.5, y + 0.5)) {
        img.data[idx + 3] = 0;
        continue;
      }

      let color = BG;
      // subtle inner edge highlight
      const dEdge = Math.min(x, S - x, y, S - y);
      if (dEdge < S * 0.05) color = BG_EDGE;

      // route lines
      for (const [a, b] of lines) {
        const d = distToSegment(x + 0.5, y + 0.5, a, b);
        const half = (LINE_W * S) / 2;
        if (d <= half) {
          color = blend(color, ACCENT_DIM, clamp((half - d) * SS * 0.5));
        }
      }

      // nodes
      for (const n of nodes) {
        const d = Math.hypot(x + 0.5 - cx(n.x), y + 0.5 - cx(n.y));
        const r = n.r * S;
        if (n.ring && d <= r * 0.52) {
          color = n.ring;
        } else if (d <= r) {
          color = blend(color, n.fill, clamp((r - d) * SS * 0.5));
        }
      }

      img.data[idx] = color[0];
      img.data[idx + 1] = color[1];
      img.data[idx + 2] = color[2];
      img.data[idx + 3] = color[3] ?? 255;
    }
  }

  // downsample
  const out = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const idx = (S * (y * SS + sy) + (x * SS + sx)) << 2;
          const alpha = img.data[idx + 3] / 255;
          r += img.data[idx] * alpha;
          g += img.data[idx + 1] * alpha;
          b += img.data[idx + 2] * alpha;
          a += img.data[idx + 3];
        }
      }
      const n = SS * SS;
      const o = (size * y + x) << 2;
      const avgA = a / n;
      const blendA = avgA / 255;
      out.data[o] = blendA > 0 ? Math.round(r / n / blendA) : 0;
      out.data[o + 1] = blendA > 0 ? Math.round(g / n / blendA) : 0;
      out.data[o + 2] = blendA > 0 ? Math.round(b / n / blendA) : 0;
      out.data[o + 3] = Math.round(avgA);
    }
  }
  return PNG.sync.write(out);
}

function clamp(v) {
  return Math.max(0, Math.min(1, v));
}

function blend(base, over, alpha) {
  const a = clamp(alpha);
  return [
    Math.round(base[0] * (1 - a) + over[0] * a),
    Math.round(base[1] * (1 - a) + over[1] * a),
    Math.round(base[2] * (1 - a) + over[2] * a),
    Math.max(base[3] ?? 255, over[3]),
  ];
}

for (const size of SIZES) {
  const png = render(size);
  writeFileSync(join(outDir, `icon-${size}.png`), png);
  console.log(`✓ icon-${size}.png`);
}
console.log(`Icons written to ${outDir}`);

import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, renderSparseRow } from "./utils.js";

// Permutation table for Perlin noise
const PERM = (() => {
  const p = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140,
    36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120,
    234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
    88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71,
    134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133,
    230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161,
    1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130,
    116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250,
    124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227,
    47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44,
    154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98,
    108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34,
    242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14,
    239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121,
    50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243,
    141, 128, 195, 78, 66, 215, 61, 156, 180,
  ];
  const perm = new Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
})();

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function perlin3d(x: number, y: number, z: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;

  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const zf = z - Math.floor(z);

  const u = fade(xf);
  const v = fade(yf);
  const w = fade(zf);

  const A = PERM[X] + Y;
  const AA = PERM[A] + Z;
  const AB = PERM[A + 1] + Z;
  const B = PERM[X + 1] + Y;
  const BA = PERM[B] + Z;
  const BB = PERM[B + 1] + Z;

  return lerp(
    lerp(
      lerp(grad(PERM[AA], xf, yf, zf), grad(PERM[BA], xf - 1, yf, zf), u),
      lerp(
        grad(PERM[AB], xf, yf - 1, zf),
        grad(PERM[BB], xf - 1, yf - 1, zf),
        u,
      ),
      v,
    ),
    lerp(
      lerp(
        grad(PERM[AA + 1], xf, yf, zf - 1),
        grad(PERM[BA + 1], xf - 1, yf, zf - 1),
        u,
      ),
      lerp(
        grad(PERM[AB + 1], xf, yf - 1, zf - 1),
        grad(PERM[BB + 1], xf - 1, yf - 1, zf - 1),
        u,
      ),
      v,
    ),
    w,
  );
}

/** Multi-octave fractal noise */
function fbm(x: number, y: number, z: number, octaves: number): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * perlin3d(x * frequency, y * frequency, z * frequency);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

const DENSITY_CHARS = " .:-=+*#%@";

// Color palette: deep blue → cyan → green → yellow → orange → magenta
const PALETTE = [
  "#1a1a2e",
  "#16213e",
  "#0f3460",
  "#1a759f",
  "#34a0a4",
  "#52b788",
  "#76c893",
  "#b5e48c",
  "#d9ed92",
  "#f4d35e",
  "#f48c06",
  "#e85d04",
  "#dc2f02",
  "#d00000",
  "#9d0208",
  "#e040fb",
];

const PerlinNoiseField: React.FC<ScreensaverProps> = ({
  columns,
  rows,
  frame,
}) => {
  const height = rows - 1;
  const scale = 0.06;
  const timeSpeed = 0.008;
  const z = frame * timeSpeed;

  const gridRef = useRef<(SparseCell | null)[][]>([]);

  // Reuse arrays on resize
  if (
    gridRef.current.length !== height ||
    gridRef.current[0]?.length !== columns
  ) {
    gridRef.current = Array.from({ length: height }, () =>
      Array<SparseCell | null>(columns).fill(null),
    );
  }

  const grid = gridRef.current;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < columns; x++) {
      const n = fbm(x * scale, y * scale * 2, z, 4);
      const normalized = (n + 1) * 0.5;

      const charIndex = Math.min(
        Math.floor(normalized * DENSITY_CHARS.length),
        DENSITY_CHARS.length - 1,
      );
      const char = DENSITY_CHARS[charIndex];

      // Treat spaces as empty for sparse rendering
      if (char === " ") {
        grid[y][x] = null;
      } else {
        const colorIndex = Math.min(
          Math.floor(normalized * PALETTE.length),
          PALETTE.length - 1,
        );
        grid[y][x] = { char, color: PALETTE[colorIndex] };
      }
    }
  }

  return (
    <Box flexDirection="column">
      {grid.map((row, y) => renderSparseRow(row, y))}
    </Box>
  );
};

export const perlinNoiseField: ScreensaverModule = {
  name: "perlin-noise-field",
  description:
    "Perlin noise visualized as characters of varying density with color gradients",
  component: PerlinNoiseField,
  fps: 20,
};

#!/usr/bin/env bun
//
// Capture a screenshot of each screensaver as a PNG.
//
// Renders screensavers headlessly — no GUI, terminal, or macOS needed.
//
// Usage:  bun scripts/capture-screenshots.ts [screensaver-name] [flags]
//
// Flags:
//   --all      — recapture all screensavers, even ones that already have screenshots
//   --frames N — number of frames to render (default: 60)
//
// Environment variables:
//   OUTPUT_DIR — where to save PNGs (default: ./screenshots)

// Force full color support — must be set before chalk (used by Ink) initializes.
// Dynamic imports below ensure this runs first since ESM static imports are hoisted.
process.env.FORCE_COLOR = "3";

const { existsSync, mkdirSync } = await import("node:fs");
const { resolve } = await import("node:path");
const { PassThrough } = await import("node:stream");
const { Resvg } = await import("@resvg/resvg-js");
const { render } = await import("ink");
const React = await import("react");
const { screensavers } = await import("../src/registry.js");
type ScreensaverModule = import("../src/types.js").ScreensaverModule;

const PROJECT_DIR = resolve(import.meta.dirname, "..");
const OUTPUT_DIR =
  process.env.OUTPUT_DIR ?? resolve(PROJECT_DIR, "screenshots");

// Consistent size for screenshots (columns x rows in characters)
const WINDOW_COLUMNS = 120;
const WINDOW_ROWS = 40;

// --- arg parsing ---

const args = process.argv.slice(2);
const forceAll = args.includes("--all");
const framesIdx = args.indexOf("--frames");
const NUM_FRAMES =
  framesIdx >= 0 ? Number(args[framesIdx + 1]) || 60 : 60;
const requestedName = args.find((a) => !a.startsWith("--"));

let targets = screensavers.map((s) => s.name);

if (requestedName) {
  if (!targets.includes(requestedName)) {
    console.error(`Error: unknown screensaver "${requestedName}"`);
    console.error(`Available: ${targets.join(", ")}`);
    process.exit(1);
  }
  targets = [requestedName];
}

// Skip screensavers that already have screenshots (unless --all or specific name)
if (!forceAll && !requestedName) {
  const before = targets.length;
  targets = targets.filter(
    (name) => !existsSync(resolve(OUTPUT_DIR, `${name}.png`)),
  );
  if (targets.length === 0) {
    console.log("All screenshots already exist. Use --all to recapture.");
    process.exit(0);
  }
  if (targets.length < before) {
    console.log(
      `Skipping ${before - targets.length} screensaver(s) with existing screenshots (use --all to recapture)\n`,
    );
  }
}

mkdirSync(OUTPUT_DIR, { recursive: true });

// ============================================================
// ANSI parsing + image rendering
// ============================================================

interface Cell {
  char: string;
  fg: string;
}

const ANSI_NAMED_FG: Record<number, string> = {
  30: "#000000",
  31: "#cc0000",
  32: "#00cc00",
  33: "#cccc00",
  34: "#0000cc",
  35: "#cc00cc",
  36: "#00cccc",
  37: "#cccccc",
  90: "#555555",
  91: "#ff5555",
  92: "#55ff55",
  93: "#ffff55",
  94: "#5555ff",
  95: "#ff55ff",
  96: "#55ffff",
  97: "#ffffff",
};

function parseAnsiToGrid(
  raw: string,
  cols: number,
  rows: number,
): Cell[][] {
  const grid: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ char: " ", fg: "#cccccc" })),
  );

  let x = 0;
  let y = 0;
  let fg = "#cccccc";
  let i = 0;

  while (i < raw.length) {
    if (raw[i] === "\x1b") {
      i++;
      if (raw[i] === "[") {
        i++;
        let params = "";
        while (i < raw.length && raw[i] >= "\x20" && raw[i] <= "\x3f") {
          params += raw[i];
          i++;
        }
        const cmd = raw[i] ?? "";
        i++;

        const nums = params
          .split(";")
          .map((s) => (s === "" ? 0 : Number(s)));

        switch (cmd) {
          case "H":
          case "f":
            y = (nums[0] || 1) - 1;
            x = (nums[1] || 1) - 1;
            break;
          case "A":
            y = Math.max(0, y - (nums[0] || 1));
            break;
          case "B":
            y = Math.min(rows - 1, y + (nums[0] || 1));
            break;
          case "C":
            x = Math.min(cols - 1, x + (nums[0] || 1));
            break;
          case "D":
            x = Math.max(0, x - (nums[0] || 1));
            break;
          case "G":
            x = (nums[0] || 1) - 1;
            break;
          case "J":
            if (nums[0] === 2 || nums[0] === 3) {
              for (const row of grid) {
                for (let c = 0; c < cols; c++) {
                  row[c] = { char: " ", fg: "#cccccc" };
                }
              }
              x = 0;
              y = 0;
            }
            break;
          case "K":
            if (nums[0] === 0 || params === "") {
              for (let c = x; c < cols; c++) {
                if (grid[y]) grid[y][c] = { char: " ", fg: "#cccccc" };
              }
            } else if (nums[0] === 2) {
              if (grid[y]) {
                for (let c = 0; c < cols; c++) {
                  grid[y][c] = { char: " ", fg: "#cccccc" };
                }
              }
            }
            break;
          case "m":
            for (let si = 0; si < nums.length; si++) {
              const n = nums[si];
              if (n === 0) {
                fg = "#cccccc";
              } else if (n === 39) {
                fg = "#cccccc";
              } else if (n >= 30 && n <= 37) {
                fg = ANSI_NAMED_FG[n] ?? fg;
              } else if (n >= 90 && n <= 97) {
                fg = ANSI_NAMED_FG[n] ?? fg;
              } else if (n === 38) {
                if (nums[si + 1] === 2) {
                  const r = nums[si + 2] ?? 0;
                  const g = nums[si + 3] ?? 0;
                  const b = nums[si + 4] ?? 0;
                  fg = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
                  si += 4;
                } else if (nums[si + 1] === 5) {
                  si += 2;
                }
              }
            }
            break;
        }
      } else if (raw[i] === "]") {
        while (
          i < raw.length &&
          raw[i] !== "\x07" &&
          !(raw[i] === "\x1b" && raw[i + 1] === "\\")
        ) {
          i++;
        }
        if (raw[i] === "\x07") i++;
        else if (raw[i] === "\x1b") i += 2;
      } else {
        i++;
      }
      continue;
    }

    if (raw[i] === "\n") {
      x = 0;
      y++;
      i++;
      continue;
    }

    if (raw[i] === "\r") {
      x = 0;
      i++;
      continue;
    }

    if (y >= 0 && y < rows && x >= 0 && x < cols) {
      grid[y][x] = { char: raw[i], fg };
      x++;
    } else {
      x++;
    }
    i++;
  }

  return grid;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function gridToSvg(grid: Cell[][], cols: number, rows: number): string {
  const charW = 8.4;
  const charH = 16;
  const padX = 16;
  const padY = 16;
  const width = cols * charW + padX * 2;
  const height = rows * charH + padY * 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">\n`;
  svg += `<rect width="100%" height="100%" fill="#1a1a2e"/>\n`;
  svg += `<style>text { font-family: "Menlo", "Monaco", "Courier New", monospace; font-size: 13px; }</style>\n`;

  for (let y = 0; y < rows; y++) {
    const row = grid[y];
    for (let x = 0; x < cols; x++) {
      const cell = row[x];
      if (cell.char === " ") continue;
      const textX = padX + x * charW;
      const textY = padY + y * charH + charH * 0.8;
      svg += `<text x="${textX}" y="${textY}" fill="${cell.fg}">${escapeXml(cell.char)}</text>\n`;
    }
  }

  svg += "</svg>";
  return svg;
}

function svgToPng(svg: string): Uint8Array {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: Math.round(WINDOW_COLUMNS * 8.4 + 32) },
  });
  return resvg.render().asPng();
}

// ============================================================
// Headless rendering
// ============================================================

function renderScreensaver(screensaver: ScreensaverModule): string {
  const cols = WINDOW_COLUMNS;
  const rows = WINDOW_ROWS;

  const stdout = Object.assign(new PassThrough(), {
    columns: cols,
    rows: rows,
    isTTY: true,
  });
  // biome-ignore lint/suspicious/noExplicitAny: mock stream methods
  (stdout as any).cursorTo = () => true;
  // biome-ignore lint/suspicious/noExplicitAny: mock stream methods
  (stdout as any).clearLine = () => true;
  // biome-ignore lint/suspicious/noExplicitAny: mock stream methods
  (stdout as any).moveCursor = () => true;

  let allOutput = "";
  stdout.on("data", (chunk: Buffer) => {
    allOutput += chunk.toString();
  });

  const Component = screensaver.component;
  const fps = screensaver.fps ?? 15;

  const inst = render(
    React.createElement(Component, {
      columns: cols,
      rows: rows,
      frame: 0,
      elapsed: 0,
    }),
    {
      stdout: stdout as unknown as NodeJS.WriteStream,
      exitOnCtrlC: false,
      patchConsole: false,
    },
  );

  for (let i = 1; i <= NUM_FRAMES; i++) {
    inst.rerender(
      React.createElement(Component, {
        columns: cols,
        rows: rows,
        frame: i,
        elapsed: i * (1000 / fps),
      }),
    );
  }

  inst.unmount();
  inst.cleanup();

  return allOutput;
}

async function capture(
  screensaver: ScreensaverModule,
  outFile: string,
): Promise<boolean> {
  const raw = renderScreensaver(screensaver);
  if (!raw) return false;

  const grid = parseAnsiToGrid(raw, WINDOW_COLUMNS, WINDOW_ROWS);
  const svg = gridToSvg(grid, WINDOW_COLUMNS, WINDOW_ROWS);
  const png = svgToPng(svg);
  await Bun.write(outFile, png);
  return true;
}

// ============================================================
// Main
// ============================================================

console.log(
  `Capturing ${targets.length} screensaver(s) [${NUM_FRAMES} frames]`,
);
console.log(`Output: ${OUTPUT_DIR}\n`);

for (const name of targets) {
  console.log(`▸ ${name}`);
  const outFile = resolve(OUTPUT_DIR, `${name}.png`);
  const screensaver = screensavers.find((s) => s.name === name);

  if (!screensaver) {
    console.log("  ✗ not found in registry — skipping");
    continue;
  }

  const ok = await capture(screensaver, outFile);
  console.log(ok ? `  ✓ saved ${outFile}` : "  ✗ capture failed — skipping");
}

console.log(`\nDone! Screenshots saved to ${OUTPUT_DIR}/`);

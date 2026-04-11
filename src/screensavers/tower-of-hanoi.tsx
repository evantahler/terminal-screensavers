import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, renderSparseRow } from "./utils.js";

interface Disc {
  size: number;
  color: string;
}

interface Move {
  from: number;
  to: number;
}

type Phase = "waiting" | "lifting" | "sliding" | "dropping" | "done";

interface AnimState {
  pegs: Disc[][];
  moves: Move[];
  moveIndex: number;
  moveCounter: number;
  phase: Phase;
  phaseFrame: number;
  discCount: number;
  animDisc: Disc | null;
  animX: number;
  animY: number;
  fromPeg: number;
  toPeg: number;
  initialized: boolean;
}

const DISC_COLORS = [
  "#ff4444",
  "#ff8800",
  "#ffcc00",
  "#44cc44",
  "#00cccc",
  "#4488ff",
  "#aa44ff",
  "#ff44aa",
];

const PHASE_FRAMES = {
  waiting: 8,
  lifting: 6,
  sliding: 8,
  dropping: 6,
};

function generateMoves(
  n: number,
  from: number,
  to: number,
  aux: number,
  moves: Move[],
) {
  if (n === 0) return;
  generateMoves(n - 1, from, aux, to, moves);
  moves.push({ from, to });
  generateMoves(n - 1, aux, to, from, moves);
}

function initState(discCount: number): Omit<AnimState, "initialized"> {
  const pegs: Disc[][] = [[], [], []];
  for (let i = discCount; i >= 1; i--) {
    pegs[0].push({ size: i, color: DISC_COLORS[(i - 1) % DISC_COLORS.length] });
  }
  const moves: Move[] = [];
  generateMoves(discCount, 0, 2, 1, moves);
  return {
    pegs,
    moves,
    moveIndex: 0,
    moveCounter: 0,
    phase: "waiting",
    phaseFrame: 0,
    discCount,
    animDisc: null,
    animX: 0,
    animY: 0,
    fromPeg: 0,
    toPeg: 0,
  };
}

const TowerOfHanoi: React.FC<ScreensaverProps> = ({ columns, rows }) => {
  const stateRef = useRef<AnimState>({
    ...initState(6),
    initialized: true,
  });

  const s = stateRef.current;

  // Layout calculations
  const pegSpacing = Math.floor(columns / 4);
  const pegXPositions = [pegSpacing, pegSpacing * 2, pegSpacing * 3];
  const baseY = rows - 3;
  const topY = 3;

  // Advance animation
  s.phaseFrame++;

  if (s.phase === "done") {
    if (s.phaseFrame > 60) {
      const nextCount = s.discCount >= 8 ? 6 : s.discCount + 1;
      const fresh = initState(nextCount);
      Object.assign(s, fresh);
      s.initialized = true;
      s.phaseFrame = 0;
    }
  } else if (s.phase === "waiting") {
    if (s.phaseFrame >= PHASE_FRAMES.waiting) {
      if (s.moveIndex >= s.moves.length) {
        s.phase = "done";
        s.phaseFrame = 0;
      } else {
        const move = s.moves[s.moveIndex];
        s.fromPeg = move.from;
        s.toPeg = move.to;
        const disc = s.pegs[s.fromPeg].pop();
        if (disc) {
          s.animDisc = disc;
          const pegTopIndex = s.pegs[s.fromPeg].length;
          s.animX = pegXPositions[s.fromPeg];
          s.animY = baseY - pegTopIndex;
          s.phase = "lifting";
          s.phaseFrame = 0;
        }
      }
    }
  } else if (s.phase === "lifting") {
    const startY = baseY - s.pegs[s.fromPeg].length;
    const targetY = topY;
    const progress = Math.min(s.phaseFrame / PHASE_FRAMES.lifting, 1);
    s.animY = Math.round(startY + (targetY - startY) * progress);
    if (s.phaseFrame >= PHASE_FRAMES.lifting) {
      s.animY = targetY;
      s.phase = "sliding";
      s.phaseFrame = 0;
    }
  } else if (s.phase === "sliding") {
    const startX = pegXPositions[s.fromPeg];
    const targetX = pegXPositions[s.toPeg];
    const progress = Math.min(s.phaseFrame / PHASE_FRAMES.sliding, 1);
    const eased =
      progress < 0.5
        ? 2 * progress * progress
        : 1 - (-2 * progress + 2) ** 2 / 2;
    s.animX = Math.round(startX + (targetX - startX) * eased);
    if (s.phaseFrame >= PHASE_FRAMES.sliding) {
      s.animX = targetX;
      s.phase = "dropping";
      s.phaseFrame = 0;
    }
  } else if (s.phase === "dropping") {
    const startY = topY;
    const targetY = baseY - s.pegs[s.toPeg].length;
    const progress = Math.min(s.phaseFrame / PHASE_FRAMES.dropping, 1);
    s.animY = Math.round(startY + (targetY - startY) * progress);
    if (s.phaseFrame >= PHASE_FRAMES.dropping) {
      if (s.animDisc) {
        s.pegs[s.toPeg].push(s.animDisc);
        s.animDisc = null;
      }
      s.moveIndex++;
      s.moveCounter++;
      s.phase = "waiting";
      s.phaseFrame = 0;
    }
  }

  // Build grid
  const grid: Array<Array<{ char: string; color: string } | null>> = Array.from(
    { length: rows },
    () => Array(columns).fill(null),
  );

  // Draw pegs (vertical lines)
  for (let peg = 0; peg < 3; peg++) {
    const px = pegXPositions[peg];
    for (let y = topY; y <= baseY; y++) {
      if (px >= 0 && px < columns && y >= 0 && y < rows) {
        grid[y][px] = { char: "│", color: "#666666" };
      }
    }
  }

  // Draw base
  const baseRow = baseY + 1;
  if (baseRow >= 0 && baseRow < rows) {
    for (let x = 0; x < columns; x++) {
      grid[baseRow][x] = { char: "═", color: "#888888" };
    }
  }

  // Draw peg labels
  const labelRow = baseY + 2;
  if (labelRow >= 0 && labelRow < rows) {
    const labels = ["A", "B", "C"];
    for (let peg = 0; peg < 3; peg++) {
      const px = pegXPositions[peg];
      if (px >= 0 && px < columns) {
        grid[labelRow][px] = { char: labels[peg], color: "#aaaaaa" };
      }
    }
  }

  // Draw discs on pegs
  for (let peg = 0; peg < 3; peg++) {
    const px = pegXPositions[peg];
    for (let i = 0; i < s.pegs[peg].length; i++) {
      const disc = s.pegs[peg][i];
      const discWidth = disc.size * 2 + 1;
      const y = baseY - i;
      const startX = px - Math.floor(discWidth / 2);
      for (let dx = 0; dx < discWidth; dx++) {
        const x = startX + dx;
        if (x >= 0 && x < columns && y >= 0 && y < rows) {
          grid[y][x] = { char: "█", color: disc.color };
        }
      }
    }
  }

  // Draw animating disc
  if (s.animDisc) {
    const discWidth = s.animDisc.size * 2 + 1;
    const startX = s.animX - Math.floor(discWidth / 2);
    const y = s.animY;
    for (let dx = 0; dx < discWidth; dx++) {
      const x = startX + dx;
      if (x >= 0 && x < columns && y >= 0 && y < rows) {
        grid[y][x] = { char: "█", color: s.animDisc.color };
      }
    }
  }

  // Draw move counter at top
  const totalMoves = s.moves.length;
  const counterText =
    s.phase === "done"
      ? `Solved! ${totalMoves} moves (${s.discCount} discs)`
      : `Move: ${s.moveCounter} / ${totalMoves}  •  Discs: ${s.discCount}`;
  const counterStart = Math.floor((columns - counterText.length) / 2);
  for (let i = 0; i < counterText.length; i++) {
    const x = counterStart + i;
    if (x >= 0 && x < columns && 1 < rows) {
      grid[1][x] = { char: counterText[i], color: "#cccccc" };
    }
  }

  return (
    <Box flexDirection="column">
      {grid.map((row, rowIndex) => renderSparseRow(row, rowIndex))}
    </Box>
  );
};

export const towerOfHanoi: ScreensaverModule = {
  name: "tower-of-hanoi",
  description: "Animated Tower of Hanoi puzzle solution",
  component: TowerOfHanoi,
  fps: 30,
};

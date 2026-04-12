import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, renderSparseRow } from "./utils.js";

// Two-frame alien sprites for each type
const ALIEN_A1 = [" /oo\\ ", "/~~~~\\", "!-ede-!", " /  \\ "];
const ALIEN_A2 = [" /oo\\ ", "/~~~~\\", "!-ede-!", " \\  / "];

const ALIEN_B1 = [" dOOb ", "dO{}Ob", "|/|\\|\\|", " d  b "];
const ALIEN_B2 = [" dOOb ", "dO{}Ob", "|\\/\\/|", "d    b"];

const ALIEN_C1 = ["  --  ", " {oo} ", "/----\\", " /\\ /\\"];
const ALIEN_C2 = ["  --  ", " {oo} ", "/----\\", "\\  / \\"];

const ALIEN_FRAMES = [
  [ALIEN_A1, ALIEN_A2],
  [ALIEN_B1, ALIEN_B2],
  [ALIEN_C1, ALIEN_C2],
];

const ALIEN_COLORS = ["#55ff55", "#44dd44", "#33bb33"];

const UFO_SPRITE = ["  ___  ", "_/   \\_", " \\___/ "];
const UFO_COLOR = "#ff4444";

const EXPLOSION_FRAMES = [
  [" \\|/ ", "-- --", " /|\\ "],
  ["  .  ", " ... ", "  .  "],
];

interface Alien {
  x: number;
  y: number;
  type: number;
  alive: boolean;
}

interface Ufo {
  x: number;
  y: number;
  speed: number;
  active: boolean;
}

interface Explosion {
  x: number;
  y: number;
  age: number;
}

interface Swooper {
  alien: Alien;
  x: number;
  y: number;
  vy: number;
  vx: number;
}

interface State {
  aliens: Alien[];
  direction: number;
  moveTimer: number;
  animFrame: number;
  offsetX: number;
  offsetY: number;
  ufo: Ufo;
  ufoTimer: number;
  explosions: Explosion[];
  swooper: Swooper | null;
  swoopTimer: number;
  initialized: boolean;
  prevCols: number;
  prevRows: number;
}

function initFormation(columns: number, rows: number): Partial<State> {
  const alienW = 8;
  const alienH = 5;
  const aliensPerRow = Math.max(4, Math.floor((columns - 10) / (alienW + 2)));
  const alienRows = 5;
  const aliens: Alien[] = [];

  const formationWidth = aliensPerRow * (alienW + 2);
  const startX = Math.floor((columns - formationWidth) / 2);

  for (let r = 0; r < alienRows; r++) {
    const type = r < 1 ? 2 : r < 3 ? 1 : 0;
    for (let c = 0; c < aliensPerRow; c++) {
      aliens.push({
        x: startX + c * (alienW + 2),
        y: 2 + r * alienH,
        type,
        alive: true,
      });
    }
  }

  return {
    aliens,
    direction: 1,
    moveTimer: 0,
    animFrame: 0,
    offsetX: 0,
    offsetY: 0,
    swooper: null,
    swoopTimer: 0,
    explosions: [],
  };
}

const SpaceInvaders: React.FC<ScreensaverProps> = ({
  columns,
  rows,
  frame,
}) => {
  const stateRef = useRef<State>({
    aliens: [],
    direction: 1,
    moveTimer: 0,
    animFrame: 0,
    offsetX: 0,
    offsetY: 0,
    ufo: { x: 0, y: 0, speed: 0, active: false },
    ufoTimer: 200,
    explosions: [],
    swooper: null,
    swoopTimer: 100 + Math.floor(Math.random() * 100),
    initialized: false,
    prevCols: 0,
    prevRows: 0,
  });

  const contentRows = rows - 1;
  const state = stateRef.current;

  // Initialize or reinitialize on resize
  if (
    !state.initialized ||
    state.prevCols !== columns ||
    state.prevRows !== contentRows
  ) {
    Object.assign(state, initFormation(columns, contentRows));
    state.initialized = true;
    state.prevCols = columns;
    state.prevRows = contentRows;
    state.ufo = { x: 0, y: 0, speed: 0, active: false };
    state.ufoTimer = 200;
  }

  // Move aliens every few frames (speed up as fewer remain)
  const aliveCount = state.aliens.filter((a) => a.alive).length;
  const moveInterval = Math.max(
    2,
    Math.floor(8 - (1 - aliveCount / state.aliens.length) * 5),
  );

  state.moveTimer++;
  if (state.moveTimer >= moveInterval) {
    state.moveTimer = 0;
    state.animFrame = (state.animFrame + 1) % 2;

    // Check if formation should drop and reverse
    let shouldReverse = false;
    for (const a of state.aliens) {
      if (!a.alive) continue;
      const nx = a.x + state.offsetX + state.direction * 2;
      const spriteW = ALIEN_FRAMES[a.type][0][0].length;
      if (nx + spriteW >= columns - 1 || nx <= 1) {
        shouldReverse = true;
        break;
      }
    }

    if (shouldReverse) {
      state.direction *= -1;
      state.offsetY += 1;
    } else {
      state.offsetX += state.direction * 2;
    }

    // Check if formation reached bottom — reset
    let maxY = 0;
    for (const a of state.aliens) {
      if (!a.alive) continue;
      const ay = a.y + state.offsetY + ALIEN_FRAMES[a.type][0].length;
      if (ay > maxY) maxY = ay;
    }
    if (maxY >= contentRows - 2 || aliveCount === 0) {
      Object.assign(state, initFormation(columns, contentRows));
    }
  }

  // UFO logic
  state.ufoTimer--;
  if (state.ufoTimer <= 0 && !state.ufo.active) {
    state.ufo = {
      x: columns + 5,
      y: 0,
      speed: 0.8,
      active: true,
    };
    state.ufoTimer = 300 + Math.floor(Math.random() * 200);
  }
  if (state.ufo.active) {
    state.ufo.x -= state.ufo.speed;
    if (state.ufo.x < -UFO_SPRITE[0].length) {
      state.ufo.active = false;
    }
  }

  // Swooper logic — alien breaks formation
  state.swoopTimer--;
  if (state.swoopTimer <= 0 && !state.swooper) {
    const candidates = state.aliens.filter((a) => a.alive);
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      pick.alive = false;
      state.swooper = {
        alien: { ...pick },
        x: pick.x + state.offsetX,
        y: pick.y + state.offsetY,
        vy: 0.8,
        vx: (Math.random() - 0.5) * 2,
      };
    }
    state.swoopTimer = 80 + Math.floor(Math.random() * 120);
  }
  if (state.swooper) {
    state.swooper.x += state.swooper.vx;
    state.swooper.y += state.swooper.vy;
    if (state.swooper.y >= contentRows) {
      state.swooper = null;
    }
  }

  // Update explosions
  for (const e of state.explosions) {
    e.age++;
  }
  let write = 0;
  for (let i = 0; i < state.explosions.length; i++) {
    if (state.explosions[i].age < EXPLOSION_FRAMES.length * 4) {
      state.explosions[write++] = state.explosions[i];
    }
  }
  state.explosions.length = write;

  // Build grid
  const grid: (SparseCell | null)[][] = Array.from(
    { length: contentRows },
    () => new Array<SparseCell | null>(columns).fill(null),
  );

  const placeSprite = (
    sprite: string[],
    sx: number,
    sy: number,
    color: string,
  ) => {
    for (let row = 0; row < sprite.length; row++) {
      const gy = Math.floor(sy) + row;
      if (gy < 0 || gy >= contentRows) continue;
      const chars = [...sprite[row]];
      for (let col = 0; col < chars.length; col++) {
        const gx = Math.floor(sx) + col;
        if (gx < 0 || gx >= columns) continue;
        if (chars[col] !== " ") {
          grid[gy][gx] = { char: chars[col], color };
        }
      }
    }
  };

  // Render aliens
  for (const a of state.aliens) {
    if (!a.alive) continue;
    const sprite = ALIEN_FRAMES[a.type][state.animFrame];
    placeSprite(
      sprite,
      a.x + state.offsetX,
      a.y + state.offsetY,
      ALIEN_COLORS[a.type],
    );
  }

  // Render swooper
  if (state.swooper) {
    const s = state.swooper;
    const sprite = ALIEN_FRAMES[s.alien.type][state.animFrame];
    placeSprite(sprite, s.x, s.y, "#ffff00");
  }

  // Render UFO
  if (state.ufo.active) {
    placeSprite(UFO_SPRITE, state.ufo.x, state.ufo.y, UFO_COLOR);
  }

  // Render explosions
  for (const e of state.explosions) {
    const frameIdx = Math.min(
      Math.floor(e.age / 4),
      EXPLOSION_FRAMES.length - 1,
    );
    placeSprite(EXPLOSION_FRAMES[frameIdx], e.x, e.y, "#ffffff");
  }

  // Render bottom defense bunkers (decorative)
  const bunkerY = contentRows - 5;
  const bunkerSprite = ["  ████  ", " ██████ ", "████████", "███  ███"];
  const bunkerCount = Math.max(2, Math.floor(columns / 30));
  const bunkerSpacing = Math.floor(columns / (bunkerCount + 1));
  for (let i = 0; i < bunkerCount; i++) {
    const bx = bunkerSpacing * (i + 1) - 4;
    placeSprite(bunkerSprite, bx, bunkerY, "#33ff33");
  }

  return (
    <Box flexDirection="column">
      {grid.map((row, y) => renderSparseRow(row, y))}
    </Box>
  );
};

export const spaceInvaders: ScreensaverModule = {
  name: "space-invaders",
  description:
    "Classic alien formation marching side to side with periodic UFO fly-bys",
  component: SpaceInvaders,
  fps: 15,
};

import { Box } from "ink";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, renderSparseRow } from "./utils.js";

// Maze grid: true = wall, false = open
type MazeGrid = boolean[][];

interface PlayerState {
  x: number;
  y: number;
  angle: number; // radians
  // Animation: "idle" | "turning" | "walking"
  phase: "idle" | "turning" | "walking";
  startX: number;
  startY: number;
  startAngle: number;
  targetX: number;
  targetY: number;
  targetAngle: number;
  progress: number; // 0-1
}

interface State {
  maze: MazeGrid;
  mazeW: number;
  mazeH: number;
  player: PlayerState;
  path: { x: number; y: number }[];
  pathIndex: number;
  prevCols: number;
  prevRows: number;
}

const MOVE_FRAMES = 12;
const TURN_FRAMES = 10;

// Wall shading by distance
const SHADE_CHARS = ["█", "▓", "▒", "░", "·", " "];
const SHADE_COLORS = [
  "#ff5544",
  "#cc3333",
  "#992222",
  "#771111",
  "#550a0a",
  "#220505",
];

const FLOOR_CHARS = ["_", ".", " "];

function darkenColor(hex: string, factor: number): string {
  const r = Math.round(Number.parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.round(Number.parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.round(Number.parseInt(hex.slice(5, 7), 16) * factor);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function generateMaze(w: number, h: number): MazeGrid {
  // Grid where odd cells are passages, even cells are walls
  const grid: MazeGrid = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => true),
  );

  // Carve using recursive backtracker on odd-indexed cells
  const cellW = Math.floor((w - 1) / 2);
  const cellH = Math.floor((h - 1) / 2);
  const visited = Array.from({ length: cellH }, () =>
    Array.from({ length: cellW }, () => false),
  );

  const stack: [number, number][] = [];
  const startCX = 0;
  const startCY = 0;
  visited[startCY][startCX] = true;
  grid[startCY * 2 + 1][startCX * 2 + 1] = false;
  stack.push([startCX, startCY]);

  const dirs: [number, number][] = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];
    const shuffled = dirs
      .map((d) => ({ d, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map((a) => a.d);

    let found = false;
    for (const [dx, dy] of shuffled) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 0 && nx < cellW && ny >= 0 && ny < cellH && !visited[ny][nx]) {
        visited[ny][nx] = true;
        // Carve passage cell
        grid[ny * 2 + 1][nx * 2 + 1] = false;
        // Carve wall between
        grid[cy * 2 + 1 + dy][cx * 2 + 1 + dx] = false;
        stack.push([nx, ny]);
        found = true;
        break;
      }
    }
    if (!found) stack.pop();
  }

  return grid;
}

function findPath(
  maze: MazeGrid,
  sx: number,
  sy: number,
  mazeW: number,
  mazeH: number,
): { x: number; y: number }[] {
  // BFS to find a long path from start
  const visited = new Set<string>();
  const queue: { x: number; y: number; path: { x: number; y: number }[] }[] =
    [];
  visited.add(`${sx},${sy}`);
  queue.push({ x: sx, y: sy, path: [{ x: sx, y: sy }] });

  let longest: { x: number; y: number }[] = [{ x: sx, y: sy }];

  const dirs: [number, number][] = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    if (current.path.length > longest.length) {
      longest = current.path;
    }

    for (const [dx, dy] of dirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const key = `${nx},${ny}`;
      if (
        nx >= 0 &&
        nx < mazeW &&
        ny >= 0 &&
        ny < mazeH &&
        !maze[ny][nx] &&
        !visited.has(key)
      ) {
        visited.add(key);
        queue.push({
          x: nx,
          y: ny,
          path: [...current.path, { x: nx, y: ny }],
        });
      }
    }
  }

  return longest;
}

function angleBetween(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): number {
  return Math.atan2(toY - fromY, toX - fromX);
}

function normalizeAngle(angle: number): number {
  let result = angle;
  while (result > Math.PI) result -= 2 * Math.PI;
  while (result < -Math.PI) result += 2 * Math.PI;
  return result;
}

// Scale factor: each maze cell becomes CELL_SCALE world units wide
const CELL_SCALE = 3;

interface RayHit {
  dist: number;
  wallX: number; // 0-1 position along the wall face (for texture U coord)
  side: number; // 0 = hit on X face, 1 = hit on Y face
}

function castRay(
  maze: MazeGrid,
  px: number,
  py: number,
  angle: number,
  mazeW: number,
  mazeH: number,
): RayHit {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);

  // Current maze cell (in maze coordinates, not world)
  let mapX = Math.floor(px / CELL_SCALE);
  let mapY = Math.floor(py / CELL_SCALE);

  // Length of ray from one X/Y side to the next
  const deltaDistX = dirX === 0 ? 1e30 : Math.abs(CELL_SCALE / dirX);
  const deltaDistY = dirY === 0 ? 1e30 : Math.abs(CELL_SCALE / dirY);

  // Step direction and initial side distances
  let stepX: number;
  let sideDistX: number;
  if (dirX < 0) {
    stepX = -1;
    sideDistX = (px / CELL_SCALE - mapX) * deltaDistX;
  } else {
    stepX = 1;
    sideDistX = (mapX + 1 - px / CELL_SCALE) * deltaDistX;
  }

  let stepY: number;
  let sideDistY: number;
  if (dirY < 0) {
    stepY = -1;
    sideDistY = (py / CELL_SCALE - mapY) * deltaDistY;
  } else {
    stepY = 1;
    sideDistY = (mapY + 1 - py / CELL_SCALE) * deltaDistY;
  }

  // DDA loop
  let side = 0;
  for (let i = 0; i < 200; i++) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }

    if (mapX < 0 || mapX >= mazeW || mapY < 0 || mapY >= mazeH) {
      const dist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
      return { dist, wallX: 0, side };
    }

    if (maze[mapY][mapX]) {
      // Exact perpendicular distance (no fisheye — caller corrects)
      const dist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;

      // Exact wall hit position for texture mapping
      const hitX = px + dirX * dist;
      const hitY = py + dirY * dist;
      const wallX =
        side === 0
          ? (((hitY / CELL_SCALE) % 1) + 1) % 1
          : (((hitX / CELL_SCALE) % 1) + 1) % 1;

      return { dist, wallX, side };
    }
  }

  return { dist: 30, wallX: 0, side: 0 };
}

function initState(columns: number, rows: number): State {
  const mazeW = 41;
  const mazeH = 41;
  const maze = generateMaze(mazeW, mazeH);
  const startX = 1;
  const startY = 1;
  const path = findPath(maze, startX, startY, mazeW, mazeH);

  // Scale positions to world coordinates
  const sx = (startX + 0.5) * CELL_SCALE;
  const sy = (startY + 0.5) * CELL_SCALE;

  // Face toward the first path segment for a good initial view
  const initialAngle =
    path.length > 1
      ? angleBetween(
          sx,
          sy,
          (path[1].x + 0.5) * CELL_SCALE,
          (path[1].y + 0.5) * CELL_SCALE,
        )
      : 0;

  return {
    maze,
    mazeW,
    mazeH,
    player: {
      x: sx,
      y: sy,
      angle: initialAngle,
      phase: "idle",
      startX: sx,
      startY: sy,
      startAngle: initialAngle,
      targetX: sx,
      targetY: sy,
      targetAngle: initialAngle,
      progress: 0,
    },
    path,
    pathIndex: 0,
    prevCols: columns,
    prevRows: rows,
  };
}

const ThreeDMaze = ({ columns, rows, frame }: ScreensaverProps) => {
  const stateRef = useRef<State>(initState(columns, rows));
  const s = stateRef.current;

  // Reinitialize on resize
  if (s.prevCols !== columns || s.prevRows !== rows) {
    Object.assign(s, initState(columns, rows));
  }

  const displayRows = rows - 1;
  const { maze, mazeW, mazeH, player } = s;
  const fov = Math.PI / 3; // 60 degree FOV

  // Smooth easing function
  const ease = (t: number) => t * t * (3 - 2 * t);

  // Advance animation or pick next action
  if (player.phase === "idle") {
    if (s.pathIndex < s.path.length - 1) {
      s.pathIndex++;
      const next = s.path[s.pathIndex];
      const nextWorldX = (next.x + 0.5) * CELL_SCALE;
      const nextWorldY = (next.y + 0.5) * CELL_SCALE;
      const targetAngle = angleBetween(
        player.x,
        player.y,
        nextWorldX,
        nextWorldY,
      );

      const angleDiff = Math.abs(normalizeAngle(targetAngle - player.angle));
      if (angleDiff > 0.1) {
        // Need to turn first
        player.phase = "turning";
        player.startAngle = player.angle;
        player.targetAngle = targetAngle;
        player.startX = player.x;
        player.startY = player.y;
        player.targetX = nextWorldX;
        player.targetY = nextWorldY;
        player.progress = 0;
      } else {
        // Already facing right direction, walk
        player.phase = "walking";
        player.startX = player.x;
        player.startY = player.y;
        player.targetX = nextWorldX;
        player.targetY = nextWorldY;
        player.startAngle = player.angle;
        player.targetAngle = targetAngle;
        player.progress = 0;
      }
    } else {
      // Reached end of path, generate new maze
      Object.assign(s, initState(columns, rows));
      return (
        <Box flexDirection="column">
          {Array.from({ length: displayRows }, (_, y) =>
            renderSparseRow(
              Array.from({ length: columns }, () => null),
              y,
            ),
          )}
        </Box>
      );
    }
  }

  if (player.phase === "turning") {
    player.progress += 1 / TURN_FRAMES;
    if (player.progress >= 1) {
      player.angle = player.targetAngle;
      // Transition to walking
      player.phase = "walking";
      player.startX = player.x;
      player.startY = player.y;
      player.startAngle = player.angle;
      player.progress = 0;
    } else {
      const t = ease(player.progress);
      const diff = normalizeAngle(player.targetAngle - player.startAngle);
      player.angle = player.startAngle + diff * t;
    }
  }

  if (player.phase === "walking") {
    player.progress += 1 / MOVE_FRAMES;
    if (player.progress >= 1) {
      player.x = player.targetX;
      player.y = player.targetY;
      player.angle = player.targetAngle;
      player.phase = "idle";
    } else {
      const t = ease(player.progress);
      player.x = player.startX + (player.targetX - player.startX) * t;
      player.y = player.startY + (player.targetY - player.startY) * t;
      // Smoothly align angle during walk too
      const diff = normalizeAngle(player.targetAngle - player.startAngle);
      player.angle = player.startAngle + diff * t;
    }
  }

  // Raycast and render
  const grid: (SparseCell | null)[][] = Array.from(
    { length: displayRows },
    () => new Array(columns).fill(null),
  );

  for (let col = 0; col < columns; col++) {
    const rayAngle = player.angle - fov / 2 + (col / columns) * fov;
    const hit = castRay(maze, player.x, player.y, rayAngle, mazeW, mazeH);
    // Correct fisheye
    const dist = hit.dist * Math.cos(rayAngle - player.angle);

    // Wall height — scale by CELL_SCALE for proper proportions
    const wallHeight = Math.min(
      displayRows,
      Math.floor((displayRows * CELL_SCALE) / (dist + 0.001)),
    );
    const wallTop = Math.floor((displayRows - wallHeight) / 2);
    const wallBottom = wallTop + wallHeight;

    // Shade index based on distance
    const shadeIdx = Math.min(
      SHADE_CHARS.length - 1,
      Math.floor((dist / 20) * SHADE_CHARS.length),
    );

    // Side shading: Y-facing walls are slightly darker for contrast
    const sideDarken = hit.side === 1 ? 0.7 : 1.0;

    // Draw ceiling
    for (let y = 0; y < wallTop; y++) {
      const ceilDist = (displayRows / 2 - y) / (displayRows / 2);
      if (ceilDist > 0.3) {
        grid[y][col] = { char: "·", color: "#112233" };
      }
    }

    // Draw wall with brick texture
    if (shadeIdx < SHADE_CHARS.length - 1) {
      for (let y = wallTop; y < wallBottom && y < displayRows; y++) {
        if (y >= 0) {
          // Compute texture V coordinate (0-1 along wall height)
          const wallV = (y - wallTop) / wallHeight;

          // Brick pattern: horizontal mortar lines + vertical mortar with offset
          const brickRows = 6;
          const brickCols = 4;
          const brickY = wallV * brickRows;
          const brickRow = Math.floor(brickY);
          const brickFracY = brickY - brickRow;
          // Offset every other row for brick stagger
          const uOffset = brickRow % 2 === 0 ? 0 : 0.5 / brickCols;
          const brickX = (hit.wallX + uOffset) * brickCols;
          const brickFracX = brickX - Math.floor(brickX);

          // Mortar lines: thin gaps between bricks
          const isMortar =
            brickFracY < 0.08 ||
            brickFracY > 0.92 ||
            brickFracX < 0.06 ||
            brickFracX > 0.94;

          if (isMortar) {
            // Mortar is darker
            const mortarShade = Math.min(shadeIdx + 2, SHADE_CHARS.length - 1);
            if (mortarShade < SHADE_CHARS.length - 1) {
              grid[y][col] = {
                char: SHADE_CHARS[mortarShade],
                color: darkenColor(SHADE_COLORS[shadeIdx], 0.4 * sideDarken),
              };
            }
          } else {
            grid[y][col] = {
              char: SHADE_CHARS[shadeIdx],
              color: darkenColor(SHADE_COLORS[shadeIdx], sideDarken),
            };
          }
        }
      }
    }

    // Draw floor
    for (let y = wallBottom; y < displayRows; y++) {
      const floorDist = (y - displayRows / 2) / (displayRows / 2);
      const floorIdx = Math.min(
        FLOOR_CHARS.length - 1,
        Math.floor(floorDist * FLOOR_CHARS.length),
      );
      if (floorIdx < FLOOR_CHARS.length - 1) {
        grid[y][col] = {
          char: FLOOR_CHARS[floorIdx],
          color: "#225533",
        };
      }
    }
  }

  return (
    <Box flexDirection="column">
      {grid.map((row, y) => renderSparseRow(row, y))}
    </Box>
  );
};

export const threeDMaze: ScreensaverModule = {
  name: "maze-3d",
  description: "First-person walk through an endless maze",
  component: ThreeDMaze,
  fps: 20,
};

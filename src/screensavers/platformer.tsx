import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, renderSparseRow } from "./utils.js";

interface Platform {
  x: number;
  width: number;
  y: number;
  type: "ground" | "floating";
}

interface Enemy {
  x: number;
  y: number;
  type: number;
  alive: boolean;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

interface Cloud {
  x: number;
  y: number;
  width: number;
}

interface GameState {
  initialized: boolean;
  playerX: number;
  playerY: number;
  velY: number;
  onGround: boolean;
  jumpFrame: number;
  scrollX: number;
  platforms: Platform[];
  enemies: Enemy[];
  coins: Coin[];
  clouds: Cloud[];
  score: number;
  nextSpawnX: number;
  runFrame: number;
  lastJumpDecision: number;
}

const GRAVITY = 0.5;
const JUMP_VEL = -3.2;
const SCROLL_SPEED = 1.2;
const GROUND_Y_OFFSET = 5;
const PLAYER_SCREEN_X = 15;

// Player is 3 rows tall: head, body, legs (playerY = legs row)
const PLAYER_HEAD = "◉";
const PLAYER_BODY_RUN = ["╋", "╬"];
const PLAYER_BODY_JUMP = "╫";
const PLAYER_LEGS_RUN = ["╝╚", "╚╝"];
const PLAYER_LEGS_JUMP = "╨╨";
const PLAYER_COLOR = "#44bbff";

// Enemies are 2 rows tall: head, body (enemy.y = body/bottom row)
const ENEMY_HEADS = ["◆", "▲", "☠"];
const ENEMY_BODIES = ["╪", "╫", "╬"];
const ENEMY_COLORS = ["#ff4444", "#ff8800", "#cc00cc"];

const COIN_CHAR = "●";
const COIN_COLOR = "#ffdd00";
const PLATFORM_CHAR = "█";
const PLATFORM_COLOR = "#886644";
const GROUND_CHAR = "▓";
const GROUND_COLOR = "#44aa44";
const GROUND_TOP = "▀";
const SKY_COLORS = ["#112244", "#1a3366"];

function generatePlatforms(
  startX: number,
  endX: number,
  groundY: number,
): { platforms: Platform[]; enemies: Enemy[]; coins: Coin[] } {
  const platforms: Platform[] = [];
  const enemies: Enemy[] = [];
  const coins: Coin[] = [];

  let x = startX;
  while (x < endX) {
    const roll = Math.random();

    if (roll < 0.15) {
      // Single floating platform with maybe a coin
      const platWidth = Math.floor(Math.random() * 6) + 6;
      const platY = groundY - Math.floor(Math.random() * 4) - 5;
      platforms.push({
        x: x + 8,
        width: platWidth,
        y: platY,
        type: "floating",
      });

      if (Math.random() < 0.4) {
        coins.push({
          x: x + 8 + Math.floor(platWidth / 2),
          y: platY - 2,
          collected: false,
        });
      }

      x += platWidth + 25;
    } else if (roll < 0.3) {
      // Single enemy on ground
      enemies.push({
        x: x + 10,
        y: groundY - 1,
        type: Math.floor(Math.random() * ENEMY_HEADS.length),
        alive: true,
      });
      x += 30;
    } else if (roll < 0.4) {
      // A few coins in an arc above ground
      const coinY = groundY - Math.floor(Math.random() * 3) - 4;
      const count = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < count; i++) {
        coins.push({ x: x + 8 + i * 4, y: coinY, collected: false });
      }
      x += count * 4 + 20;
    } else if (roll < 0.5) {
      // Small staircase (2 steps max)
      const steps = 2;
      for (let s = 0; s < steps; s++) {
        platforms.push({
          x: x + 8 + s * 10,
          width: 6,
          y: groundY - (s + 1) * 3,
          type: "floating",
        });
      }
      // One coin at the top
      coins.push({
        x: x + 8 + 10 + 3,
        y: groundY - 6 - 2,
        collected: false,
      });
      x += 40;
    } else {
      // Empty stretch — just running along
      x += Math.floor(Math.random() * 15) + 20;
    }
  }

  return { platforms, enemies, coins };
}

const Platformer: React.FC<ScreensaverProps> = ({ columns, rows, frame }) => {
  const groundY = rows - GROUND_Y_OFFSET;
  const state = useRef<GameState>({
    initialized: false,
    playerX: 0,
    playerY: 0,
    velY: 0,
    onGround: true,
    jumpFrame: 0,
    scrollX: 0,
    platforms: [],
    enemies: [],
    coins: [],
    clouds: [],
    score: 0,
    nextSpawnX: 0,
    runFrame: 0,
    lastJumpDecision: 0,
  });

  const s = state.current;

  if (!s.initialized) {
    s.playerX = PLAYER_SCREEN_X;
    s.playerY = groundY - 1;
    s.nextSpawnX = columns;

    // Generate initial terrain
    const gen = generatePlatforms(columns * 0.5, columns * 3, groundY);
    s.platforms = gen.platforms;
    s.enemies = gen.enemies;
    s.coins = gen.coins;

    // Generate clouds
    s.clouds = Array.from({ length: 8 }, () => ({
      x: Math.floor(Math.random() * columns * 2),
      y: Math.floor(Math.random() * (groundY - 10)) + 1,
      width: Math.floor(Math.random() * 8) + 4,
    }));

    s.initialized = true;
  }

  // Scroll the world
  s.scrollX += SCROLL_SPEED;
  s.runFrame++;

  // Generate more terrain as needed
  const worldRight = s.scrollX + columns * 2;
  if (s.nextSpawnX < worldRight) {
    const gen = generatePlatforms(s.nextSpawnX, worldRight, groundY);
    s.platforms.push(...gen.platforms);
    s.enemies.push(...gen.enemies);
    s.coins.push(...gen.coins);
    s.nextSpawnX = worldRight;
  }

  // Clean up off-screen entities
  const screenLeft = s.scrollX - 20;
  s.platforms = s.platforms.filter((p) => p.x + p.width > screenLeft);
  s.enemies = s.enemies.filter((e) => e.x > screenLeft);
  s.coins = s.coins.filter((c) => c.x > screenLeft);

  // AI: decide when to jump
  const worldPlayerX = s.scrollX + PLAYER_SCREEN_X;

  // Check for upcoming obstacles and gaps
  let shouldJump = false;
  const lookAhead = 12;

  // Jump over enemies
  for (const enemy of s.enemies) {
    if (
      enemy.alive &&
      enemy.x > worldPlayerX &&
      enemy.x < worldPlayerX + lookAhead
    ) {
      shouldJump = true;
      break;
    }
  }

  // Jump for floating platforms above
  if (!shouldJump) {
    for (const plat of s.platforms) {
      if (
        plat.type === "floating" &&
        plat.x > worldPlayerX - 2 &&
        plat.x < worldPlayerX + lookAhead &&
        plat.y < s.playerY - 1
      ) {
        shouldJump = true;
        break;
      }
    }
  }

  // Check for ground gaps - look if there's ground ahead
  if (!shouldJump) {
    let hasGround = false;
    for (let checkX = worldPlayerX + 2; checkX < worldPlayerX + 8; checkX++) {
      // Check if there's any platform at ground level
      const groundHere = true; // assume ground by default
      for (const plat of s.platforms) {
        // Floating platforms don't count as ground
        if (plat.type === "floating") continue;
      }
      if (groundHere) hasGround = true;
    }
    // Gaps are represented by the absence of ground, but since we have
    // infinite ground, we mainly jump for obstacles
  }

  // Apply jump
  if (shouldJump && s.onGround && frame - s.lastJumpDecision > 8) {
    s.velY = JUMP_VEL;
    s.onGround = false;
    s.lastJumpDecision = frame;
  }

  // Physics
  s.velY += GRAVITY;
  s.playerY += s.velY;

  // Collision with platforms
  s.onGround = false;
  for (const plat of s.platforms) {
    const screenPlatX = plat.x - s.scrollX;
    if (
      PLAYER_SCREEN_X >= screenPlatX - 1 &&
      PLAYER_SCREEN_X <= screenPlatX + plat.width &&
      s.playerY >= plat.y - 1 &&
      s.playerY <= plat.y &&
      s.velY >= 0
    ) {
      s.playerY = plat.y - 1;
      s.velY = 0;
      s.onGround = true;
    }
  }

  // Ground collision (playerY = legs row, must stay above ground)
  if (s.playerY >= groundY - 1) {
    s.playerY = groundY - 1;
    s.velY = 0;
    s.onGround = true;
  }

  // Prevent player from going above screen (head is at playerY - 2)
  if (s.playerY < 2) {
    s.playerY = 2;
    s.velY = 0;
  }

  // Coin collection
  for (const coin of s.coins) {
    if (coin.collected) continue;
    const screenCoinX = coin.x - s.scrollX;
    if (
      Math.abs(screenCoinX - PLAYER_SCREEN_X) < 2 &&
      Math.abs(coin.y - s.playerY) < 2
    ) {
      coin.collected = true;
      s.score++;
    }
  }

  // Stomp enemies (landing on top — player legs hit enemy head)
  for (const enemy of s.enemies) {
    if (!enemy.alive) continue;
    const screenEnemyX = enemy.x - s.scrollX;
    const enemyHeadY = enemy.y - 1;
    if (
      Math.abs(screenEnemyX - PLAYER_SCREEN_X) < 3 &&
      Math.abs(enemyHeadY - s.playerY) < 2 &&
      s.velY > 0
    ) {
      enemy.alive = false;
      s.velY = JUMP_VEL * 0.6;
      s.score += 5;
    }
  }

  // Build grid
  const contentRows = rows - 1;
  const grid: (SparseCell | null)[][] = Array.from(
    { length: contentRows },
    () => Array.from({ length: columns }, () => null),
  );

  // Draw clouds
  for (const cloud of s.clouds) {
    const screenX = Math.floor(
      ((cloud.x - s.scrollX * 0.3) % (columns * 2)) + columns * 0.5,
    );
    const normalizedX =
      (((screenX % (columns * 2)) + columns * 2) % (columns * 2)) -
      columns * 0.5;
    for (let i = 0; i < cloud.width; i++) {
      const cx = Math.floor(normalizedX) + i;
      if (cx >= 0 && cx < columns && cloud.y >= 0 && cloud.y < contentRows) {
        grid[cloud.y][cx] = { char: "░", color: "#667799" };
      }
    }
  }

  // Draw ground
  for (let x = 0; x < columns; x++) {
    if (groundY < contentRows) {
      grid[groundY][x] = { char: GROUND_TOP, color: GROUND_COLOR };
    }
    for (let y = groundY + 1; y < contentRows; y++) {
      grid[y][x] = { char: GROUND_CHAR, color: "#336633" };
    }
  }

  // Draw platforms
  for (const plat of s.platforms) {
    const screenX = Math.floor(plat.x - s.scrollX);
    for (let i = 0; i < plat.width; i++) {
      const px = screenX + i;
      if (px >= 0 && px < columns && plat.y >= 0 && plat.y < contentRows) {
        grid[plat.y][px] = { char: PLATFORM_CHAR, color: PLATFORM_COLOR };
      }
    }
  }

  // Draw coins
  for (const coin of s.coins) {
    if (coin.collected) continue;
    const screenX = Math.floor(coin.x - s.scrollX);
    if (
      screenX >= 0 &&
      screenX < columns &&
      coin.y >= 0 &&
      coin.y < contentRows
    ) {
      const sparkle = Math.sin(frame * 0.3 + coin.x) > 0;
      grid[coin.y][screenX] = {
        char: sparkle ? COIN_CHAR : "○",
        color: COIN_COLOR,
      };
    }
  }

  // Draw enemies (2 rows: head at y-1, body at y)
  for (const enemy of s.enemies) {
    if (!enemy.alive) continue;
    const screenX = Math.floor(enemy.x - s.scrollX);
    const pace = Math.sin(frame * 0.15 + enemy.x) * 1.5;
    const ex = Math.floor(screenX + pace);
    if (ex >= 0 && ex < columns) {
      // Body (bottom row)
      if (enemy.y >= 0 && enemy.y < contentRows) {
        grid[enemy.y][ex] = {
          char: ENEMY_BODIES[enemy.type],
          color: ENEMY_COLORS[enemy.type],
        };
      }
      // Head (top row)
      const headY = enemy.y - 1;
      if (headY >= 0 && headY < contentRows) {
        grid[headY][ex] = {
          char: ENEMY_HEADS[enemy.type],
          color: ENEMY_COLORS[enemy.type],
        };
      }
    }
  }

  // Draw player (3 rows: head at py-2, body at py-1, legs at py)
  const py = Math.floor(s.playerY);
  if (PLAYER_SCREEN_X < columns) {
    const animIdx = Math.floor(s.runFrame / 4) % 2;

    // Legs (bottom row)
    if (py >= 0 && py < contentRows) {
      const legs = s.onGround ? PLAYER_LEGS_RUN[animIdx] : PLAYER_LEGS_JUMP;
      for (let i = 0; i < legs.length; i++) {
        const lx = PLAYER_SCREEN_X - Math.floor(legs.length / 2) + i;
        if (lx >= 0 && lx < columns) {
          grid[py][lx] = { char: legs[i], color: PLAYER_COLOR };
        }
      }
    }

    // Body (middle row)
    const bodyY = py - 1;
    if (bodyY >= 0 && bodyY < contentRows) {
      const bodyChar = s.onGround ? PLAYER_BODY_RUN[animIdx] : PLAYER_BODY_JUMP;
      grid[bodyY][PLAYER_SCREEN_X] = { char: bodyChar, color: PLAYER_COLOR };
    }

    // Head (top row)
    const headY = py - 2;
    if (headY >= 0 && headY < contentRows) {
      grid[headY][PLAYER_SCREEN_X] = { char: PLAYER_HEAD, color: PLAYER_COLOR };
    }
  }

  // Draw score
  const scoreStr = `★ ${s.score}`;
  const scoreX = columns - scoreStr.length - 2;
  for (let i = 0; i < scoreStr.length; i++) {
    if (scoreX + i >= 0 && scoreX + i < columns) {
      grid[1][scoreX + i] = { char: scoreStr[i], color: "#ffdd00" };
    }
  }

  return (
    <Box flexDirection="column">
      {grid.map((row, y) => renderSparseRow(row, y))}
    </Box>
  );
};

export const platformer: ScreensaverModule = {
  name: "platformer",
  description:
    "Procedurally generated 2D platformer with jumping, enemies, and coins",
  component: Platformer,
  fps: 15,
};

import { aquarium } from "./screensavers/aquarium.js";
import { bonsai } from "./screensavers/bonsai.js";
import { bouncingLogo } from "./screensavers/bouncing-logo.js";
import { digitalClock } from "./screensavers/digital-clock.js";
import { dnaHelix } from "./screensavers/dna-helix.js";
import { fire } from "./screensavers/fire.js";
import { fireworks } from "./screensavers/fireworks.js";
import { gameOfLife } from "./screensavers/game-of-life.js";
import { lavaLamp } from "./screensavers/lava-lamp.js";
import { matrixRain } from "./screensavers/matrix-rain.js";
import { maze } from "./screensavers/maze.js";
import { mystify } from "./screensavers/mystify.js";
import { pipes } from "./screensavers/pipes.js";
import { starfield } from "./screensavers/starfield.js";
import type { ScreensaverModule } from "./types.js";

export const screensavers: ScreensaverModule[] = [
  matrixRain,
  starfield,
  pipes,
  bouncingLogo,
  gameOfLife,
  fire,
  aquarium,
  mystify,
  fireworks,
  digitalClock,
  bonsai,
  maze,
  lavaLamp,
  dnaHelix,
];

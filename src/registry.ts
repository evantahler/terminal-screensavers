import {
  bouncingLogo,
  matrixRain,
  pipes,
  starfield,
} from "./screensavers/index.js";
import type { ScreensaverModule } from "./types.js";

export const screensavers: ScreensaverModule[] = [
  matrixRain,
  starfield,
  pipes,
  bouncingLogo,
];

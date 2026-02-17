import { Box, useApp, useInput } from "ink";
import React from "react";
import { useFrame } from "./hooks/useFrame.js";
import { useFullScreen } from "./hooks/useFullScreen.js";
import { useScreenSize } from "./hooks/useScreenSize.js";
import type { ScreensaverModule } from "./types.js";

interface AppProps {
  screensaver: ScreensaverModule;
  fpsOverride?: number;
}

export default function App({ screensaver, fpsOverride }: AppProps) {
  const { exit } = useApp();
  const { columns, rows } = useScreenSize();
  const fps = fpsOverride ?? screensaver.fps ?? 15;
  const { frame, elapsed } = useFrame(fps);

  useFullScreen();

  useInput(() => {
    exit();
  });

  const Component = screensaver.component;

  return (
    <Box width={columns} height={rows}>
      <Component
        columns={columns}
        rows={rows}
        frame={frame}
        elapsed={elapsed}
      />
    </Box>
  );
}

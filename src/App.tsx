import { Box, useApp, useInput } from "ink";
import React, { useState } from "react";
import { Menu } from "./components/Menu.js";
import { useFrame } from "./hooks/useFrame.js";
import { useFullScreen } from "./hooks/useFullScreen.js";
import { useScreenSize } from "./hooks/useScreenSize.js";
import type { ScreensaverModule } from "./types.js";

interface AppProps {
  screensavers: ScreensaverModule[];
  initialIndex: number;
  fpsOverride?: number;
}

function ScreensaverView({
  screensaver,
  fpsOverride,
  columns,
  rows,
}: {
  screensaver: ScreensaverModule;
  fpsOverride?: number;
  columns: number;
  rows: number;
}) {
  const fps = fpsOverride ?? screensaver.fps ?? 15;
  const { frame, elapsed } = useFrame(fps);
  const Component = screensaver.component;

  return (
    <Component columns={columns} rows={rows} frame={frame} elapsed={elapsed} />
  );
}

export default function App({
  screensavers,
  initialIndex,
  fpsOverride,
}: AppProps) {
  const { exit } = useApp();
  const { columns, rows } = useScreenSize();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showMenu, setShowMenu] = useState(false);

  useFullScreen();

  useInput(
    (input, key) => {
      if (key.leftArrow) {
        setCurrentIndex(
          (i) => (i - 1 + screensavers.length) % screensavers.length,
        );
        return;
      }
      if (key.rightArrow) {
        setCurrentIndex((i) => (i + 1) % screensavers.length);
        return;
      }
      if (input === "m") {
        setShowMenu(true);
        return;
      }
      exit();
    },
    { isActive: !showMenu },
  );

  if (showMenu) {
    return (
      <Box width={columns} height={rows}>
        <Menu
          screensavers={screensavers}
          currentIndex={currentIndex}
          rows={rows}
          onSelect={(index) => {
            setCurrentIndex(index);
            setShowMenu(false);
          }}
          onDismiss={() => setShowMenu(false)}
        />
      </Box>
    );
  }

  return (
    <Box width={columns} height={rows}>
      <ScreensaverView
        key={currentIndex}
        screensaver={screensavers[currentIndex]}
        fpsOverride={fpsOverride}
        columns={columns}
        rows={rows}
      />
    </Box>
  );
}

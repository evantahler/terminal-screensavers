import { useEffect, useState } from "react";

export function useFullScreen() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const enterFullScreen = () => {
      process.stdout.write("\x1b[?1049h"); // alternate screen buffer
      process.stdout.write("\x1b[?25l"); // hide cursor
    };

    const exitFullScreen = () => {
      process.stdout.write("\x1b[?25h"); // show cursor
      process.stdout.write("\x1b[?1049l"); // restore main screen buffer
    };

    enterFullScreen();
    setReady(true);

    const handleExit = () => {
      exitFullScreen();
      process.exit(0);
    };

    process.on("SIGINT", handleExit);
    process.on("SIGTERM", handleExit);

    return () => {
      exitFullScreen();
      process.off("SIGINT", handleExit);
      process.off("SIGTERM", handleExit);
    };
  }, []);

  return ready;
}

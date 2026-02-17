import { useEffect, useRef, useState } from "react";

export function useFrame(fps = 15) {
  const [frame, setFrame] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => f + 1);
      setElapsed(Date.now() - startTime.current);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [fps]);

  return { frame, elapsed };
}

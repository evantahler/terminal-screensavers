import { useEffect, useRef, useState } from "react";

export function useFrame(fps = 15) {
  const [state, setState] = useState<{ frame: number; elapsed: number }>({
    frame: 0,
    elapsed: 0,
  });
  const startTime = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => ({
        frame: prev.frame + 1,
        elapsed: Date.now() - startTime.current,
      }));
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [fps]);

  return state;
}

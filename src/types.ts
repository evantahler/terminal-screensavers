import type { FC } from "react";

export interface ScreensaverProps {
  columns: number;
  rows: number;
  frame: number;
  elapsed: number;
}

export interface ScreensaverModule {
  name: string;
  description: string;
  component: FC<ScreensaverProps>;
  fps?: number;
}

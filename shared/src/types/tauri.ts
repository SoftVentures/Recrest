export interface PlatformInfo {
  os: string;
  arch: string;
  version: string;
  family: string;
  debugAssertions: boolean;
}

export interface WindowState {
  width: number;
  height: number;
  x: number;
  y: number;
  isMaximized: boolean;
}

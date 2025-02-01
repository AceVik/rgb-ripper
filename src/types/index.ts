export type DownloadProgress = {
  totalSize: number;
  downloaded: number;
  startTime: number;
  estimatedSpeed: number; // bytes per second
  estimatedTime: number; // remaining seconds
};

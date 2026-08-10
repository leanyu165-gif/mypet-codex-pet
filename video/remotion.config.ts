import { Config } from '@remotion/cli/config';

// 用系统 Edge 渲染，避免下载无头 Chromium（国内网络更快更稳）
Config.setBrowserExecutable(
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
);
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setCodec('h264');

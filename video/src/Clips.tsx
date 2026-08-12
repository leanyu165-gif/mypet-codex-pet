import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Background, Scene1Opening, Scene2Gallery, Scene5Ending } from './Intro';

// 单段视频：scene 1=开场 2=九宫格 5=结尾，整段作为独立合成渲染
export const Clip: React.FC<{ scene: number }> = ({ scene }) => {
  return (
    <AbsoluteFill>
      <Background />
      {scene === 1 && <Scene1Opening />}
      {scene === 2 && <Scene2Gallery />}
      {scene === 5 && <Scene5Ending />}
    </AbsoluteFill>
  );
};

import React from 'react';
import { Composition } from 'remotion';
import { Intro } from './Intro';
import { EditorPromo } from './EditorPromo';
import { Clip } from './Clips';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Intro"
        component={Intro}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="EditorPromo"
        component={EditorPromo}
        durationInFrames={1380}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ClipOpening"
        component={Clip}
        defaultProps={{ scene: 1 }}
        durationInFrames={240}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ClipGallery"
        component={Clip}
        defaultProps={{ scene: 2 }}
        durationInFrames={420}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ClipEnding"
        component={Clip}
        defaultProps={{ scene: 5 }}
        durationInFrames={240}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};

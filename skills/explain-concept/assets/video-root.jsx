import React from "react";
import {
  AbsoluteFill,
  Composition,
  Html5Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

function Caption({ scenes }) {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  const scene = scenes.find(
    (scene) =>
      frame >= scene.startFrame &&
      frame < scene.startFrame + scene.durationInFrames,
  );
  const beat = scene?.beats.find(
    (beat) =>
      frame >= scene.startFrame + beat.startFrame &&
      frame < scene.startFrame + beat.startFrame + beat.speechSeconds * fps,
  );
  if (!beat) return null;
  const scale = width / 1280;
  return (
    <div
      style={{
        position: "absolute",
        left: 60 * scale,
        right: 60 * scale,
        bottom: 24 * scale,
        padding: `${14 * scale}px ${20 * scale}px`,
        background: "rgba(15,23,42,0.95)",
        border: "1px solid #26364a",
        borderRadius: 12 * scale,
        color: "#e2e8f0",
        fontFamily: "Arial, sans-serif",
        fontSize: 22 * scale,
        lineHeight: 1.4,
      }}
    >
      {beat.text}
    </div>
  );
}

function Video({ timeline, components }) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b1220" }}>
      {timeline.scenes.map((scene, i) => {
        const Component = components[scene.name];
        if (!Component)
          throw new Error(
            `Export the React component ${scene.name} from the scene module.`,
          );
        return (
          <Sequence
            key={i}
            from={scene.startFrame}
            durationInFrames={scene.durationInFrames}
          >
            <Component
              beats={scene.beats}
              durationInFrames={scene.durationInFrames}
            />
          </Sequence>
        );
      })}
      <Html5Audio src={staticFile(timeline.audio)} />
      {timeline.captions && <Caption scenes={timeline.scenes} />}
    </AbsoluteFill>
  );
}

export function createVideoRoot(components, timeline, width, height, fps) {
  const Explainer = () => <Video timeline={timeline} components={components} />;
  return function Root() {
    return (
      <Composition
        id="Explainer"
        component={Explainer}
        durationInFrames={timeline.durationInFrames}
        fps={fps}
        width={width}
        height={height}
      />
    );
  };
}

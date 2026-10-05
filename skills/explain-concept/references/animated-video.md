# Produce a narrated Remotion video

## Author the lesson

Write original React scenes for the paper or concept. Each scene should teach
one relationship or computation with a worked example and meaningful changes.
Introduce symbols after establishing what they represent. For paper results,
preserve units, experimental conditions, and source references.

Use [visual-reasoning.md](visual-reasoning.md) to storyboard state changes,
invariants, and the bridge from picture to notation before authoring scenes.
The starter constructs a vector, transforms basis vectors and the whole plane,
then derives matrix multiplication and area scaling from the same objects.

Split narration into short beats corresponding to visible steps. Keep each
beat concise enough to read as a caption, usually one or two sentences. Reduce
scope to fit the requested duration instead of accelerating speech.

## Runtime and command

Run the packaged renderer through npx so its pinned Remotion and React
dependencies resolve even when the skill is installed without a checkout:

```bash
npx --yes --package=github:sunghoojung/videoexplain-skill explain-concept doctor
npx --yes --package=github:sunghoojung/videoexplain-skill explain-concept render \
  --project project.json --output video --quality m
```

Rendering needs Node.js 20+, ffmpeg, and ffprobe. Remotion obtains Headless Chrome
on first render if needed. Python is needed only for the optional paper ingestion
helper. From a repository checkout, run `npm ci` and invoke the CLI with Node.

Default macOS narration to the built-in `say` engine and the system's default
voice: leave `--voice` unset and omit beat `audio` paths. The renderer already
selects `say` first when available. Honor an explicit request for another voice
with `--voice`, or supplied narration with beat `audio` paths. On Linux, local
narration uses `espeak-ng`/`espeak`.
Its spoken content must match `text`; the renderer measures audio rather than
performing speech recognition. Use the requested language and spell symbols in
spoken form so the speech engine pronounces them correctly.

## Project format

Write `project.json` beside the authored scene module:

```json
{
  "title": "The idea being explained",
  "source": "scenes.jsx",
  "scenes": [
    {
      "name": "Mechanism",
      "beats": [
        {"text": "The first visible step solves a concrete problem."},
        {"text": "The next step follows from the first."}
      ],
      "references": ["Paper section 3.2, equation 1, PDF page 4"]
    }
  ]
}
```

`source` is a JSX, TSX, JS, or TS module exporting a named React component for
each scene. Source and optional beat `audio` paths are relative to the project.
Place images, fonts, and other assets in a sibling `public/` directory and access
them using Remotion's `staticFile()`. Set `public` to another asset directory if
needed. `public/__narration` is reserved for generated speech. Set `captions` to
`false` only when visible captions are unwanted; the SRT is still produced.

## Scene contract

Each component receives `beats` and `durationInFrames`. Each resolved beat has
`text`, `startFrame`, `durationInFrames`, and `speechSeconds`. Beat frames are
relative to the current scene. Remotion's `useCurrentFrame()` is also relative
to the scene because the renderer wraps it in a `Sequence`.

```jsx
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

export function Mechanism({beats}) {
  const frame = useCurrentFrame();
  const shift = interpolate(
    frame,
    [beats[1].startFrame, beats[1].startFrame + 30],
    [0, 200],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  return <AbsoluteFill style={{background: '#0b1220', color: 'white'}}>
    <div style={{transform: `translateX(${shift}px)`, padding: 80}}>
      A concrete example
    </div>
  </AbsoluteFill>;
}
```

The renderer measures speech first, pads each beat with at least 0.3 seconds,
and rounds its length to a whole frame at 30 fps. Use the supplied beat boundaries
instead of guessed seconds. Split beats when a spoken sentence needs multiple
precisely timed visual changes. Animate through `useCurrentFrame`, `interpolate`,
and `spring`; CSS transitions, timers, and nondeterministic effects do not provide
reliable frame-based rendering.

For reusable geometry and timing, copy `assets/animation-kit.jsx` beside the
scene module and import its helpers. `beatProgress(frame, beat, from, to)` uses
fractions of the resolved beat duration and clamps before/after the window.
`mixMatrix()` and `applyMatrix()` let a grid, vectors, and area share one state.
`DrawPath` uses normalized SVG path length for deterministic reveals. `Arrow`
computes its head geometrically, including very short vectors. `PlaneGrid`
accepts a matrix and a coordinate mapping; clip it to the diagram viewport.
These helpers are optional; use topic-specific geometry where it teaches better.

Use React for layout and SVG for diagrams, plots, and geometric relationships.
Scale layouts using `useVideoConfig()` rather than assuming a particular output
resolution. Reserve the bottom 120 pixels of a 720p layout for captions. Prefer
local assets and system fonts; load custom fonts before rendering. Explain the
mechanism with actual intermediate states, rather than substituting text cards
for a computation. The example in `assets/` demonstrates the contract; adapt
both visuals and narration to the requested subject.

For unfamiliar APIs, use the installed source or official [Remotion documentation](https://www.remotion.dev/docs/).

## Render and verify

Quality presets are `l` (854×480), `m` (1280×720, default), and `h` (1920×1080),
all at 30 fps. Use a new output directory for each run. The renderer bundles the
scene module once, renders the complete timeline, and produces:

- `explainer.mp4` with narration and optional visible captions.
- `explainer.srt` with captions following measured speech.
- `manifest.json` with scene timing, source paths, and paper references.
- `preview/` with opening, middle, and final frames.
- `public/` with narration/assets and `bundle/` with the compiled composition.

Inspect the previews plus setup, midpoint, and result of each central mechanism
and scene joins, as described in [visual-reasoning.md](visual-reasoning.md). Check
readability, clipping, overlapping labels, and caption space. Verify calculations
and paper claims against the source, and confirm audio is present and non-silent.
Listen when playback tools permit it. Repair concrete errors and render again.
Deliver the MP4, captions, and authored project; finish rendering by default.

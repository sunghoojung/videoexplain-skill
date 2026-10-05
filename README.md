# VideoExplain Skill

Turn a research paper or concept into an original narrated explainer video.
Adapted from [PaperExplainAgent](https://github.com/mihirballari/PaperExplainAgent).

The agent reads the material, writes the lesson and React scenes, then renders
an MP4 with Remotion. Narration is measured before rendering so scene changes
and captions follow the spoken explanation.

## Install

```bash
npx --yes --package=github:sunghoojung/videoexplain-skill explain-concept install --replace
```

The default target is Codex. Use `--agent claude`, `--agent opencode`, or
`--path /path/to/skills` for another target. Updates retain the previous skill
as a backup. Node.js 20+ is required.

## Ask the agent

```text
Use $explain-concept to turn this paper.pdf into a narrated explainer video.
Use $explain-concept to make a two-minute video explaining gradient descent.
Use $explain-concept to animate this paper's main contribution: <paper URL>.
```

The default deliverable is a narrated video, captions, and reproducible React
source. Ask for a written explanation or storyboard explicitly when desired.
The active model authors the lesson; the CLI handles ingestion and rendering.

Lessons build visual arguments: construct a concrete example, preserve objects
through mathematical transformations, and connect geometry to colored equation
terms. For 3Blue1Brown-inspired learning, the skill guides storyboarding,
prediction moments, linked representations, and review of intermediate frames.
See the [visual reasoning guide](skills/explain-concept/references/visual-reasoning.md).

## Render with npx

```bash
npx --yes --package=github:sunghoojung/videoexplain-skill explain-concept doctor
npx --yes --package=github:sunghoojung/videoexplain-skill explain-concept render --project project.json --output video
```

Remotion and React are installed with the package. Rendering needs `ffmpeg`
and `ffprobe` on PATH. Remotion downloads Headless Chrome on the first render
if needed. Local narration uses macOS `say` or Linux `espeak-ng`/`espeak`;
provide an audio file per beat to use another voice. No separate model API or
Manim environment is needed for video rendering.

`render` measures speech, aligns beats to video frames, bundles React scenes
once, and renders the complete narrated video. It writes `explainer.mp4`,
`explainer.srt`, a source-reference manifest, and three preview frames. Captions
are also visible in the video unless the project sets `captions` to `false`.
Output is published only after success; existing output is preserved.

Use `guide --mode production --full` for the project format and authoring
contract. The runnable starter is in `skills/explain-concept/assets/`:

```bash
npm ci
node skills/explain-concept/scripts/explain-concept.mjs render \
  --project skills/explain-concept/assets/project.example.json --output video
```

The starter constructs a vector from basis directions, records their
destinations as matrix columns, deforms the whole plane, and derives the output
and area scale. `animation-kit.jsx` provides reusable frame-based timing and SVG
geometry helpers; adapt the example to the concept rather than reusing its layout
for every lesson.

## Read a paper

PDF ingestion uses Python 3.11+ with pypdf. This optional helper is independent
of video rendering. Existing document tools can also read the paper.

```bash
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r skills/explain-concept/requirements.txt
npx --yes --package=github:sunghoojung/videoexplain-skill explain-concept ingest \
  --paper paper.pdf --output paper-source --python .venv/bin/python
```

`ingest` writes page-indexed paper text and optional previews when Poppler is
available. Inspect important equations and figures in the original document.
Every command supports `--help`; results use JSON on stdout and diagnostics
use stderr.

## License

Skill code: MIT. [Remotion has its own license terms](https://www.remotion.dev/license).
See [provenance](skills/explain-concept/references/provenance.md).

# Produce an original narrated explainer

## Author the lesson

Plan a small set of scenes with a learning objective, meaningful visual changes,
and spoken narration. A scene should teach one relationship or computation.
Break its narration into short beats that correspond to changes the viewer can
see. Keep enough time to inspect intermediate states. For a paper, record the
section, page, equation, or figure supporting each sourced scene.

Use the concrete example throughout the lesson. Introduce notation after the
viewer understands what it represents. Label schematic diagrams and illustrative
values. Preserve units and experimental conditions when showing paper results.

## Runtime

The renderer needs Python 3.11+, Manim Community 0.21, ffmpeg, and ffprobe. PDF
text ingestion additionally uses pypdf. The CLI itself has no npm dependencies.
Use an existing compatible environment or install the two Python packages into
an isolated environment. For example, use the requirements bundled with the
installed skill:

```bash
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r /path/to/explain-concept/requirements.txt
```

Manim's native Cairo/Pango dependencies must be available; follow its official
installation instructions for the host. Check the environment with:

```bash
npx --yes . doctor --python .venv/bin/python
```

Local speech uses macOS `say` or Linux `espeak-ng`/`espeak`. The voice is selected
with `--voice`. For higher-quality or externally generated narration, provide
an audio file for each beat. Use the requested language and pronounce symbols
in spoken text. Supplied audio should speak the beat's `text`; the renderer
measures duration but does not perform speech recognition to check its content.

## Project format

Write `project.json` and original Manim source in a working directory:

```json
{
  "title": "The idea being explained",
  "source": "scenes.py",
  "scenes": [
    {
      "name": "Mechanism",
      "beats": [
        {"text": "A short spoken explanation of the first visible step."},
        {"text": "The next visible step follows from the first."}
      ],
      "references": ["Paper section 3.2, equation 1, PDF page 4"]
    }
  ]
}
```

`source` and optional beat `audio` paths are relative to `project.json`. A beat
with `audio` uses that file instead of synthesizing speech. Scene `name` must
match a class in the source. Write original code and narration for the requested
paper or concept; the example in `assets/` only demonstrates the contract.

Subclass `NarratedScene` from the bundled `narrated_scene` module. The renderer
adds the module to the scene's import path and supplies measured speech lengths:

```python
from manim import FadeIn, Text
from narrated_scene import NarratedScene


class Mechanism(NarratedScene):
    def construct(self):
        label = Text("A concrete example")
        self.beat(FadeIn(label))
        self.beat(label.animate.shift([1, 0, 0]), run_time=1.5)
```

Call `self.beat(...)` once per narration beat, in order. It plays the given
animation at the start of the spoken beat and holds the result for the measured
remainder. `self.beat()` can hold an existing diagram while explaining it.
For exact within-beat timing, split narration into smaller beats. Avoid timed
`play` or `wait` calls outside beats; they can break synchronization. A scene
with the wrong number of beats or a materially wrong duration fails rendering.

Use semantic movement and readable layouts. Reserve margins and caption space.
Keep quantities consistently labeled and colored. Prefer `Text` for labels;
`MathTex` needs a working TeX installation. Check the installed Manim API before
using unfamiliar objects. Do not add plugins unless they serve a needed feature.

## Render and review

```bash
npx --yes . render --project project.json --output video \
  --python .venv/bin/python --quality m
```

Use `--quality l` for a quick 480p preview, `m` for 720p, or `h` for 1080p.
Use a new output directory for each run. The command synthesizes or loads each
spoken beat, measures it, renders the matching animations, merges narration,
and assembles the scenes. It writes `explainer.mp4`, `explainer.srt`, and
`manifest.json`, plus intermediate assets for inspection. Captions use measured
beat times, and the manifest records scene references and durations.

Inspect the generated frames at key explanation steps and scene joins. Check
that labels are readable, graphs and equations agree with the example, and
objects do not overlap or clip. Listen to narration when tools permit it.
Verify audio and video streams, caption timing, duration, and the paper's claims.
Repair concrete errors in the authored project and render again.

Deliver the narrated MP4 with its captions and reproducible source. Do not stop
at the storyboard unless that is the requested deliverable. If rendering cannot
be completed, preserve the project and report the specific missing capability.

# Produce a narrated Manim video

Manim (Community Edition) is the default engine. It provides LaTeX-typeset
equations whose pieces can be colored, moved, and transformed individually;
continuous parameters through `ValueTracker`; and a camera that can pan and
zoom. These are exactly the tools for showing an idea before naming it.

## Setup

```bash
npx --yes --package=github:sunghoojung/videoexplain-skill explain-concept doctor
```

`doctor` reports Manim, LaTeX, ffmpeg, and speech readiness and prints setup
commands for anything missing. In short:

- Python 3.11+ with Manim: `uv venv --python 3.12 .venv && uv pip install
  --python .venv/bin/python -r <skill>/requirements.txt`. On macOS, Manim needs
  `brew install cairo pango pkg-config` first.
- LaTeX with `dvisvgm` for `MathTex` and `Tex`: TinyTeX (no sudo), MacTeX or
  BasicTeX, or TeX Live. The CLI finds TinyTeX and MacTeX even when they are not
  on `PATH`.
- ffmpeg and ffprobe on `PATH`.

The renderer looks for Python with Manim in `--python`, then
`EXPLAIN_CONCEPT_PYTHON`, then `.venv` in the working directory or beside
`project.json`, then `python3`.

## Project format

Write `project.json` beside the scene file:

```json
{
  "title": "How fast does a square grow?",
  "source": "lesson.py",
  "scenes": [
    {
      "name": "Puzzle",
      "beats": [
        {"text": "Here is a square, three units on each side."},
        {"text": "Now stretch each side by just one tenth. How much area did we add?"}
      ],
      "references": []
    }
  ]
}
```

Each scene `name` is a class in `source`. Each beat is one sentence or two of
narration matched to one visible change. Optional `audio` paths supply recorded
narration for a beat (its words must match `text`). `references` cite paper
sections, pages, figures, or equations. Set `"captions": false` to omit the
subtitle track; the SRT is still written.

## Scene contract

```python
from manim import *
from explain_kit import ExplainerScene

AREA = YELLOW  # one color per meaning, shared by picture, words, and symbols

class Puzzle(ExplainerScene):
    def construct(self):
        square = Square(3).set_fill(BLUE, 0.3)
        with self.beat() as b:          # beat 1 of this scene's narration
            self.play(Create(square), run_time=1.2)
            self.play(Write(MathTex("9").move_to(square)))
        with self.beat() as b:          # beat 2
            self.play(square.animate.scale(31 / 30), run_time=1.5)
            self.wait(b.remaining + 1.5)  # a quiet moment to make a guess
```

- `explain_kit` is on `PYTHONPATH` during rendering; import it directly. It
  provides `ExplainerScene`, `ExplainerMovingCameraScene` (zoom and pan with
  `self.camera.frame`), and `ExplainerThreeDScene`.
- Use exactly one `with self.beat()` block per narration beat, in order, and
  put every `play` and `wait` inside one. The render fails with a clear message
  otherwise.
- When a beat's animations finish before its narration, the kit holds the final
  frame until the speech ends. When they run longer, the renderer pads that
  beat's audio with silence, so a deliberate pause never cuts off speech. The
  render warns about holds over four seconds.
- `b.seconds` is the narration length of the beat, `b.remaining` is what is
  left, and `b.wait_until(0.6)` waits until about 60% of the sentence has been
  spoken. Use these to land a highlight on the words that name it.
- Every scene is rendered separately. Start each scene by adding (`self.add`)
  the previous scene's final picture so cuts are invisible, then continue.
- Rendered directly with `manim -ql lesson.py Puzzle`, beats are unconstrained,
  which is useful for a quick look. Use the CLI for real timing.

## Render and review

Here `explain-concept` stands for
`npx --yes --package=github:sunghoojung/videoexplain-skill explain-concept`.

```bash
explain-concept lint --project project.json
explain-concept render --project project.json --output review-1 \
  --quality l --scenes Puzzle,Shrink
explain-concept render --project project.json --output video --quality h
```

`--scenes` renders only the listed scenes, which makes iteration fast. Quality
`l`, `m`, and `h` are 480p, 720p, and 1080p at 30 fps. Use a new output
directory each time. The output contains:

- `explainer.mp4`: video, narration, and a subtitle track viewers can turn on.
  Frames stay clean; there are no burned-in captions.
- `explainer.srt`: subtitles timed to the measured speech.
- `preview/contact-sheet.png`: the final frame of every beat, to scan the
  whole argument at once; `preview/sNN-bNN-mid.png` and `-end.png` per beat.
- `manifest.json`: scene and beat timing, silent holds, references, warnings.

To inspect a moment inside a beat, extract a frame by number. Beat start frames
are in the manifest:

```bash
ffmpeg -v error -i video/explainer.mp4 -vf "select='eq(n\,1534)'" \
  -fps_mode passthrough -frames:v 1 frame-1534.png
```

## Manim tools for this style

| Teaching need | Manim tool |
| --- | --- |
| A quantity the viewer can watch change | `ValueTracker` plus `always_redraw(lambda: ...)`; animate the tracker with `tracker.animate.set_value(v)` |
| A live number | `DecimalNumber` inside `always_redraw`, or `.add_updater` |
| Equation pieces you can color and move | `MathTex("d(x^2)", r"\div", "dx")` with one argument per piece; `set_color_by_tex`; `{{ }}` to isolate a substring |
| Word becomes symbol | `FadeTransform(word, symbol)`: they share no glyphs, so cross-fade rather than morph |
| Same symbols rearranged | `TransformMatchingTex(old, new)` or `ReplacementTransform` between pieces of the same structure (see pitfalls) |
| Name a chunk in plain words | `Brace(chunk, DOWN)` with a `Tex` label beneath |
| Link a term to its object | Play `Indicate(term)` with `Circumscribe(object)` together; dim the rest with `.animate.set_opacity(0.3)` |
| Graphs and rates | `Axes`, `axes.plot`, `axes.get_secant_slope_group`, `axes.get_riemann_rectangles`, `axes.get_area` |
| Linear maps | `NumberPlane` with `ApplyMatrix(matrix, plane)`; move vectors with the same matrix |
| Zoom to a detail | `ExplainerMovingCameraScene`: `frame.save_state()`, `frame.animate.scale(0.1).move_to(p)`, then `Restore(frame)` |
| 3D | `ExplainerThreeDScene`, `set_camera_orientation`, `add_fixed_in_frame_mobjects` for labels |

## Layout and style

- The frame is about 14.2 by 8 units with the origin at the center. Keep content
  inside x from -6.6 to 6.6 and y from -3.6 to 3.6, including labels on the far
  side of braces.
- Give the main picture one side and equations or readouts the other, or put the
  picture center stage and bring equations in beside it. Avoid long text.
- Use `Tex` for words in equations so they match the LaTeX math, and `MathTex`
  for symbols. Text smaller than about `font_size=30` is hard to read at 720p.
- Define color constants at the top of the file, one per meaning, and use them
  for objects, labels, and equation pieces alike. The default black background
  works well.

## Pitfalls

- **Transform structure.** `ReplacementTransform` pairs submobjects level by
  level. `MathTex("dx")` is MathTex > part > glyphs, while `fraction[6:8]` is
  just a group of glyphs, so the morph scrambles. Wrap the target to the same
  depth: `ReplacementTransform(dx, VGroup(fraction[6:8]))`. Check mid-transform
  frames.
- **Glyph indexing.** For `eq = MathTex(r"\frac{d(x^2)}{dx}", "=", "2x")`,
  `eq[0]` is the first piece and `eq[0][0:5]` are its first five glyphs (`d(x²)`).
  Indexing a single glyph again returns the glyph itself in recent Manim, so do
  not chain `eq[0][0][0:5]`. Print glyph counts when unsure.
- **Animating redrawn objects.** An `always_redraw` mobject is rebuilt every
  frame; animate the trackers it reads, not the mobject. Highlights such as
  `Circumscribe(shape[1])` use the shape at the moment they start.
- **Strokes under zoom.** Stroke widths scale with a zooming camera. Scale them
  by `frame.width / config.frame_width` when you zoom in far.
- **LaTeX strings.** Use raw strings (`r"\frac{a}{b}"`). Each `MathTex`
  argument must be valid LaTeX on its own.
- **Determinism.** Seed any randomness; avoid network assets. Keep image and
  data files beside the scene file (the render runs from that directory).

## Verify

Apply the checks in [visual-reasoning.md](visual-reasoning.md) and the teaching
checks in [teaching.md](teaching.md). Verify calculations and paper claims
against the source, confirm audio is present, and fix concrete problems before
the final render.

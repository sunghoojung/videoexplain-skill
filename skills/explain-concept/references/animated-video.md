# Create an educational explainer

## Separate the teaching plan from production

First choose the mechanism to teach and the example that reveals it. Then
produce a small sequence of scenes with a purpose, narration, visual evidence,
and transition. Three to seven scenes is a useful starting point for a short
lesson, not a requirement. Set duration from the user's request and the amount
of reasoning the viewer must follow.

A compact storyboard table can use these columns:

`Scene | Learning objective | Visual change | Narration | Duration`

Keep exact equations and source references alongside the storyboard. Each scene
should add understanding, not just restate a sentence from the narration. Reuse
the example and visual mapping across scenes. Related transformations should
show an actual relationship; use ordinary transitions when no such relation exists.

Do not inherit upstream's rigid XML output, compulsory plugins, named creator
style, or fixed model choices. Use a clear original visual treatment suited to
the topic and requested medium.

## Render only when requested

For a storyboard or script request, deliver those artifacts without requiring
Manim, TTS, or API credentials. For a rendered-video request, inspect available
tools and dependencies first. The active model can write Manim source directly;
the original repository's LLM wrappers, RAG store, and API keys are unnecessary.

If using Manim Community:

- Check the installed version and its documented API before writing code.
- Prefer a plain `Scene` for a silent animation and `VoiceoverScene` only when a
  compatible narration service is available.
- Use `Text` when LaTeX is unnecessary. `MathTex` and `Tex` need a working TeX
  installation. Do not install a large stack just to produce a text explanation.
- Use relative layout and bound checks. A 0.5-unit frame inset and about 0.3-unit
  gap between unrelated elements are useful starting points, adjusted to the
  actual frame and font size. Connected diagram objects may intentionally touch.
- Keep labels readable at the target resolution, reserve subtitle space, and
  check objects throughout transitions, not just at their final positions.
- Use stable labels and colors with high contrast. Color alone should not carry
  essential meaning. Declutter when focus changes.
- Avoid plugins unless a needed feature justifies the dependency. Reuse scene
  renders only if their source, narration, configuration, and inputs still match;
  an old success-marker file alone does not establish that.

A typical local preview command, after checking the environment, is:

```bash
python3 -m manim -ql --media_dir /path/to/output /path/to/scenes.py IntroScene
```

Create reproducible source and keep output paths explicit. Preview scenes before
a final-quality render. If dependencies are missing and cannot be supplied,
deliver the runnable source and narration, clearly stating what remains unrendered.

## Narration and timing

Draft narration in short spoken sentences. Introduce an object before using it
in a derivation. Align the visual change with the corresponding phrase and hold
complex results long enough to read. Measure generated audio duration rather
than assigning all narration a guessed fixed time.

Use an available speech service or supplied audio. Do not present silent MP4s
as narrated videos. Do not copy the upstream Kokoro adapter: it carries a separate
"All rights reserved" header. Choose a properly licensed service or write an
original integration against its documented API.

Generate SRT or VTT captions from measured timings. When stitching independently
rendered scenes, offset each subtitle by the cumulative measured scene durations.
Use FFmpeg stream-copy concatenation only for compatible streams; otherwise
normalize resolution, frame rate, codec, and audio settings and re-encode.
Inspect the final result after stitching, including the joins.

## Quality review

Review both dimensions preserved from the original project:

- **Teaching:** factual accuracy, sufficient causal or mathematical explanation,
  coherent progression, useful examples, and explicit limits.
- **Presentation:** readable labels, unclipped layouts, consistent mappings,
  meaningful animation, smooth transitions, clear audio, synchronized captions.

Inspect key frames and transitions and listen to narration where tools support
it. Confirm the final file's duration and audio/video streams. Repair concrete
failures and recheck the affected output. If a dimension cannot be verified,
state the limitation rather than claiming full QA.

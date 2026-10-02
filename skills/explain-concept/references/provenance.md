# Adaptation provenance

Source: https://github.com/mihirballari/PaperExplainAgent

Inspected revision: `498b25b2c677308439d9e40195c91b4a5d46c494`.

The source project reads research papers or topics, plans explanatory scenes,
generates animation and narration, and produces narrated videos. This skill
preserves that input-to-output purpose. The active model authors the explanation
and Manim code, while local helpers ingest papers and render the authored lesson.

The teaching and scene workflows draw on upstream's
`prompt_teaching_framework.txt`, `prompt_scene_plan.txt`,
`prompt_scene_vision_storyboard.txt`, and `prompt_scene_animation_narration.txt`.
Its evaluation prompts inform the checks for accuracy, logical progression,
visual consistency, and narration synchronization.

The paper ingestion helper, renderer, timing base class, and starter example are
newly written. No upstream datasets, sample papers, model binaries, API wrappers,
or Kokoro adapter are bundled. The adapter's separate rights notice is respected.
The upstream MIT license and TIGER Lab notice are preserved in `LICENSE`.

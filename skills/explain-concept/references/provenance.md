# Adaptation provenance

Source: https://github.com/mihirballari/PaperExplainAgent

Inspected revision: `498b25b2c677308439d9e40195c91b4a5d46c494`.

The repository implements topic/PDF ingestion, scene planning, storyboard and
technical planning, narration, model-generated Manim code, rendering, and video
evaluation. This skill preserves its useful teaching structure while having the
active model perform the reasoning directly.

Adaptation sources:

- `task_generator/prompts_raw/prompt_teaching_framework.txt`: concrete-to-abstract
  progression, visual intuition, stable mappings, and learning objectives.
- `prompt_scene_plan.txt`, `prompt_scene_vision_storyboard.txt`, and
  `prompt_scene_animation_narration.txt` in that directory: scene purposes,
  visual continuity, readable layout, and narration synchronization.
- `eval_suite/prompts_raw/text_eval_new.txt` and `video_eval_new.txt`: accuracy,
  depth, logical flow, and visual consistency.

The video evidence helper is newly written. It replaces heavyweight video
inspection imports with optional local FFmpeg calls and standard-library caption
parsing. The installed skill does not depend on the cloned repository.

The bundled MIT license preserves the upstream TIGER Lab notice. No upstream
datasets, sample papers, model binaries, API wrappers, or Kokoro adapter are
redistributed with the skill. The original clone remains available for reference.

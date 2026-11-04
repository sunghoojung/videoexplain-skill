---
name: explain-concept
description: "Turn a research paper or concept into an original narrated explainer video in a 3Blue1Brown-inspired style: a question worth caring about, a concrete example the viewer can follow, motion that shows why it works, and formulas that arrive last, built one plain-language piece at a time. Renders with Manim. Use for paper-to-video or topic-to-video creation, not for summarizing existing videos."
---

# Paper or Concept to a Visual-First Explainer Video

Accept a research paper (PDF, paper URL, or text) or a concept. The default
result is an original narrated MP4 with a subtitle track, an SRT file, the
Manim source, and the lesson plan. You (the active model) read the material,
design the lesson, and write the narration and scene code. The bundled CLI
measures narration, renders, and assembles the video.

## The standard to meet

The viewer should finish feeling that they could have invented the idea
themselves, and should be able to explain it without the formula. Aim for the
feeling of a great 3Blue1Brown lesson: curiosity first, a small example you can
check by eye, a moment where the picture makes it click, and notation that
arrives as a satisfying summary of something already understood.

The failure this skill exists to prevent: a formula on screen early, narration
that reads symbols aloud, and subtitles full of math. That video has not
explained anything, however polished it looks. These rules are not optional:

1. **Open with a question, not a definition.** Pose a concrete puzzle or a
   surprising fact the viewer wants resolved.
2. **Concrete before abstract.** Use the smallest example with real numbers
   that still shows the mechanism. Let the viewer play with it, predict, and
   check, before anything is generalized.
3. **Picture, then words, then symbols.** No formula appears until the viewer
   has watched the idea work. The formula is the reward, usually in the final
   third, never the starting point.
4. **Build every formula one piece at a time.** Say each piece in plain words
   first, then swap the words for its symbol, colored like the object it names
   in the picture. Then plug the example's numbers back in.
5. **Narration explains meaning; it never recites notation.** Subtitles show
   exactly what is spoken, so beat text contains no symbols, no LaTeX, and no
   "x squared over d x". Say "the extra area for each bit of nudge" instead.
6. **One idea per beat, and something visible changes in every beat.** Hold on
   results long enough to look at them. After asking the viewer to predict,
   leave a quiet pause.
7. **End on the insight**, plus where it stops working or an invitation to try
   it on something new. No recap list.

## Workflow

1. **Understand the material.** Infer audience, language, and depth; default
   to a curious non-specialist and a two-to-four-minute video. Ask only when a
   missing answer would change the explanation. For a paper, read
   [paper.md](references/paper.md) and ground every claim in the paper. For a
   concept, establish its mechanism and conditions of validity from reliable
   sources.
2. **Plan the lesson.** Read [teaching.md](references/teaching.md). Write
   `lesson-plan.md` next to the project: the one-sentence insight, the hook
   question, the worked example with its numbers, the visual "aha" moment, the
   beat where the first symbol appears, and the formula's pieces in plain words.
   Reduce scope to fit the duration instead of rushing.
3. **Storyboard the visuals.** Read
   [visual-reasoning.md](references/visual-reasoning.md). For each beat, decide
   the starting picture, what moves, and what the viewer can now infer. The
   central reasoning should be visible with the sound off.
4. **Write the narration** in `project.json`, one short beat per visual change,
   then check it with `lint`. Rewrite every flagged beat.
5. **Write the Manim scenes.** Read [manim.md](references/manim.md). Start from
   the runnable example in `assets/manim/` (a lesson on how fast a square's area
   grows): it shows the beat structure, color-linked equations, and a
   words-to-symbols reveal. Adapt the method, not the topic.
6. **Render and review.** Render one central scene at low quality first, inspect
   its preview frames, fix what is weak, then render everything.
7. **Verify and deliver** (below).

```bash
npx --yes --package=github:sunghoojung/videoexplain-skill explain-concept doctor
npx --yes --package=github:sunghoojung/videoexplain-skill explain-concept lint --project project.json
npx --yes --package=github:sunghoojung/videoexplain-skill explain-concept render \
  --project project.json --output review-1 --quality l --scenes CentralIdea
npx --yes --package=github:sunghoojung/videoexplain-skill explain-concept render \
  --project project.json --output video --quality h
```

Manim is the default engine (the project `source` is a `.py` file). Use the
React/Remotion engine in [remotion.md](references/remotion.md) only when the
user asks for it or Manim cannot be installed; the teaching rules are the same.

On macOS, narration uses the built-in `say` engine with the system's default
voice; leave `--voice` unset unless the user asks for another voice. Use
supplied narration audio when the user provides it. On Linux, the CLI uses
`espeak-ng` or `espeak`. The CLI never calls another language model.

If Manim is missing, run `setup` once; it installs Manim into a shared
environment that later sessions find automatically, so do not create a separate
Python environment per project. For anything else missing, `doctor` prints the
exact setup command. Complete
the lesson plan, narration, and source; resolve the missing dependency when
authorized and feasible; then retry. If rendering stays blocked, report the
exact limitation and deliver the authored project. Do not present a storyboard
or a silent clip as a finished narrated video.

## Verify and deliver

- **Teaching check.** Watch the first third: is there any symbol on screen
  before the viewer has seen the idea work? Read the subtitles alone: do they
  explain the idea in plain language, without reading math aloud? Could a viewer
  explain the insight after muting the last scene?
- **Visual check.** Open `preview/contact-sheet.png` (the final frame of every
  beat) to scan the whole argument, then the per-beat `-mid` and `-end` frames.
  Extract extra frames during central transformations. Look for clipped or
  overlapping labels, unreadable sizes, garbled morphs, and frames where nothing
  changed. Fix the specific problem and render again.
- **Accuracy check.** Worked numbers, units, assumptions, and paper claims agree
  in every intermediate state, not only at the end. Illustrative values are
  clearly distinguished from reported results.
- **Output check.** The render reports `warnings` for narration that reads
  formulas aloud and for long silent holds; address them or keep them
  deliberately. Confirm the MP4 has audio and the expected duration. Listen when
  playback is available, and say which checks you could not perform.

Deliver the MP4, the SRT, `lesson-plan.md`, and the project. For a paper, keep
scene `references` so every claim traces to its source. Add a brief note with
the central idea and any important limits.

## Provenance

Adapted from [PaperExplainAgent](https://github.com/mihirballari/PaperExplainAgent)
at commit `498b25b2c677308439d9e40195c91b4a5d46c494`. See
[provenance.md](references/provenance.md) and [LICENSE](LICENSE).

---
name: explain-concept
description: "Turn a research paper or concept into an original narrated explainer video with visual reasoning, mathematical transformations, worked examples, and source-grounded animation. Use for paper-to-video or topic-to-video creation, including 3Blue1Brown-inspired visual learning, not for summarizing existing videos."
---

# Paper or Concept to Narrated Video

Accept a research paper (PDF, paper URL, or text) or a concept. The default result
is an original narrated MP4 with captions and reproducible animation source.
The active model reads the material, develops the explanation, and writes the
scene code. The bundled renderer executes that authored project.

## Understand the input

Infer the audience, language, and depth from the request. Default to a curious
non-specialist and a focused two-to-four-minute video. Ask only when missing
information materially changes the explanation. Honor an explicit request for
text, a storyboard, or source only; otherwise continue through rendering.

For a paper, read [paper.md](references/paper.md). Ground the mechanism, evidence,
and limits in the actual paper and inspect its important figures and equations.
For a concept, establish its definition, prerequisites, mechanism, and conditions
of validity. Verify facts from primary sources when needed.

Read [teaching.md](references/teaching.md) to select a small worked example that
makes the mechanism visible. State the one thing the viewer should understand
at the end. Favor an explanation of why it works over a list of definitions or
paper sections. Clearly distinguish illustrative values from reported results.

## Build the original explanation

Plan a short progression: concrete problem, intuitive example, mechanism or
formal rule, and useful takeaway with limits. For a research paper, also show
what changes relative to the baseline and what evidence supports its claims.
Keep the audience's prerequisites in mind and define symbols before using them.

Read [visual-reasoning.md](references/visual-reasoning.md) before storyboarding
an animated lesson. Default to a visual argument: build a concrete object,
transform it to expose the mechanism, then connect that picture to the notation.
For a 3Blue1Brown-style request, emphasize geometric intuition, persistent
objects, linked representations, and purposeful motion. A dark background and
moving text alone do not meet that request.

Plan each mechanism beat with its initial state, mathematical operation, visible
change, and learner inference. Keep labels, colors, and object identity consistent.
Make the central reasoning visible in the diagrams even without narration.
Use text for labels and concise conclusions; avoid a repeating title/chart/text
card layout. Preserve the actual mathematics through every intermediate state.

Use plain, conversational narration. Explain a worked example step by step,
with visible intermediate states. Reduce scope to fit the requested duration
instead of rushing speech or cramming all of a paper into one video.

## Produce the video

Read [animated-video.md](references/animated-video.md) for the project format,
measured narration timing, dependencies, and render command. Write the original
React scenes and `project.json`, then render them. The starter in `assets/` is a
runnable visual-reasoning example, not a generic scene generator; adapt the
visuals and narration to the subject. Its reusable SVG helpers live in
`assets/animation-kit.jsx`. Use them where they fit rather than recreating a
slide template for every topic.

Use the packaged CLI through npx so its Remotion and React dependencies are
available. Check `doctor` before rendering.
Use local speech synthesis or supplied narration audio. The CLI does not call a
second language model; all explanation and code authoring happen in the agent.

If a dependency is missing, complete the source and narration, resolve the
specific missing dependency when authorized and feasible, and retry. If rendering
remains blocked, report the exact limitation and deliver the authored project.
Do not present a storyboard or silent clip as a completed narrated video.

## Verify and deliver

Check the worked example, units, assumptions, and paper claims. Apply the
visual review in [visual-reasoning.md](references/visual-reasoning.md): inspect
the setup, intermediate transformation, and result of each central mechanism,
plus scene transitions. Three generic preview frames are not sufficient.
Check label readability, overlap, clipping, and caption space. Review a short
sequence without narration: can the viewer see the causal or mathematical step,
or does the clip depend on text to explain everything? Repair weak visuals.
Confirm the final MP4 contains nonempty audio and video, captions track measured
speech, and the duration matches the intended lesson. Listen when playback is
available; distinguish checks performed from checks unavailable.

Deliver the narrated video, captions, and animation project. Keep paper scene
references in the manifest so the explanation can be traced to its source. A
brief accompanying note should identify the central idea and any relevant limits.

## Provenance

Adapted from [PaperExplainAgent](https://github.com/mihirballari/PaperExplainAgent)
at commit `498b25b2c677308439d9e40195c91b4a5d46c494`. See
[provenance.md](references/provenance.md) and [LICENSE](LICENSE).

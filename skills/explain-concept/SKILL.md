---
name: explain-concept
description: "Explain concepts, research papers, and the ideas in videos through intuition, concrete examples, and appropriate visual reasoning. Use for teaching a topic, unpacking a video or transcript, or creating an educational storyboard or animated explainer."
---

# Explain Concept

Adapted from PaperExplainAgent's source-grounded, intuition-first teaching and
scene planning. The active model does the explanation and planning directly;
ordinary explanations need no API keys, model calls, or rendering dependencies.

## Select the deliverable

Infer the subject, audience, depth, and format from the request. Default to a
concise explanation for a curious non-specialist. Ask only when ambiguity
materially changes the answer. Respect the user's language and prior knowledge.
Use relaxed, plain language by default. Introduce technical terms as needed;
avoid ceremonial headings and long preambles for simple questions.

Load only the reference for the requested mode. For caption or frame evidence,
prefer the lightweight local helper instead of starting the upstream pipeline.
The installed CLI can check readiness with
`node /path/to/explain-concept/scripts/explain-concept.mjs doctor`.

- **Concept or paper:** Teach the idea directly. Read
  [teaching.md](references/teaching.md) for the explanation method.
- **Existing video:** Explain what the video teaches, with source timestamps
  when available. Read [video-input.md](references/video-input.md) before
  acquiring or interpreting video evidence, then apply the teaching method.
- **Create an explainer video:** Read
  [animated-video.md](references/animated-video.md) to turn the teaching plan
  into a storyboard, narration, and, when requested and supported, a rendered
  animation. A request to explain a video does not imply making a new one.

## Ground the explanation

Read supplied material before attributing claims to it. For a paper, inspect the
relevant methods, figures, assumptions, and results, not just its abstract.
For a video, track whether the evidence is captions, audio, frames, or the full
video. Keep the creator's claims separate from your explanatory additions and
corrections. External facts that need verification should use appropriate
primary sources; mark uncertain or disputed interpretations.

If a source cannot be accessed, say what is missing. You may explain the general
topic if useful, but do not present that as a summary of unseen material.

## Teach for understanding

Build the smallest explanation that makes the mechanism understandable:

1. Start with a concrete question or problem the concept solves.
2. Work one simple example and make the key relationship visible.
3. Connect that intuition to the definition, mechanism, or equation.
4. Test the explanation with a counterexample, edge case, or common confusion.
5. Return to the original question and state the useful takeaway.

These are reasoning moves, not mandatory output headings. Skip moves that add
no value for the requested depth. Define symbols before using them, distinguish
analogy from mechanism, and state where an analogy breaks. Preserve technical
accuracy rather than making every idea geometric or pretending it is intuitive.

Choose visuals when they explain a relationship more clearly: diagrams for
structure, plots for quantitative change, animation for a meaningful sequence.
Use consistent mappings between labels, colors, and objects. Provide text
equivalents for important visual content. A short answer needs no elaborate
production plan.

## Check and deliver

Check the worked example, units, assumptions, and limits. Verify that the
explanation answers the user's actual question and that each source attribution
is supported by evidence you accessed. For rendered outputs, inspect the result
and disclose any unverified audio, visuals, or timing.

Deliver the explanation or requested artifact, not internal planning notes.
For an existing video, include useful timestamp references and the scope of
available evidence. For a generated artifact, provide its file and state whether
it is a storyboard, runnable source, silent render, or narrated final video.

## Provenance

Derived from [PaperExplainAgent](https://github.com/mihirballari/PaperExplainAgent)
at commit `498b25b2c677308439d9e40195c91b4a5d46c494`, particularly its teaching,
storyboard, narration, and evaluation prompts. See
[provenance.md](references/provenance.md) and [LICENSE](LICENSE).

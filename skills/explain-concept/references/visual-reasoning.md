# Animation as a visual argument

Read this when storyboarding or reviewing a lesson. The animation is not
decoration around the narration: it is the argument. With the sound off, a
viewer should still see what changed and why the result follows.

## Storyboard the reasoning before writing scene code

Find the operation the learner cannot yet picture. Choose a small example whose
states can be computed exactly. Describe each beat like this:

| Beat | Starting picture | What moves | What the viewer can now infer |
| --- | --- | --- | --- |
| Hook | A 3-by-3 square showing its 9 unit squares | Each side stretches by 0.1; a "?" asks how much area was added | Something was added; the viewer guesses |
| Pieces | The grown square | The new area separates into two strips and a corner | The new area has a structure |
| Compute | Separated pieces | Each piece gets its own labeled product | Strips add 0.3 each; the corner only 0.01 |
| Aha | Pieces reassembled; a table of nudges | The nudge shrinks; zoom in on the corner | The corner vanishes much faster than the strips |
| Generalize | Live readout | The side changes; the readout follows | Area per nudge is always two sides' worth |
| Formula | Diagram plus a plain-word equation | Each phrase becomes its symbol, in the equation and the picture | The notation is a name for what we saw |

This is the shipped example lesson, not a template every topic must follow.
For a research paper, show the baseline and the new method on the same input at
the same scale. Mark schematic geometry or synthetic data when it is not the
paper's actual mechanism or evidence. Do not invent a geometric picture for an
abstract embedding just because arrows are easy to draw.

Write narration from the storyboard. Each spoken claim needs a visible referent
at that moment. Split a beat when the viewer needs to inspect an intermediate
state. Introduce notation only after its object exists on screen.

## Choose a motion that carries the explanation

| Relationship to teach | Useful construction | Correctness check |
| --- | --- | --- |
| Linear transformation | Deform a grid while basis vectors, a sample vector, and a unit square move together | Apply the same matrix to every point; the origin stays fixed and parallel lines stay parallel |
| Derivative or rate | Nudge an input and show the resulting change (new area, rise over run); shrink the nudge | Compute values from the function; separate the discrete nudge from the limit |
| Integral or expectation | Build rectangles or weighted contributions, then collect their sum | Areas and weights use the same units and normalization as the equation |
| Attention or message passing | Reveal actual scores, normalize them, then combine values with visible weights | Scores, weights, and sums agree; a 2D picture of latent vectors is illustrative |
| Algorithm or recursion | Follow individual inputs through states; keep eliminated candidates as ghosts | The visible state follows the real algorithm, including its stopping condition |
| Probability or evidence | Track probability mass (or counts of people) as observations arrive | Fixed axes before and after; no implied causation; seeded randomness |
| Parameter sensitivity | Change one labeled parameter and update dependent geometry and readouts together | Fixed comparison scales; show valid limits or a meaningful failure |

Use drawing to establish an object, an anchored transformation to preserve its
identity, a ghost or trace to compare states, and color-linked labels to bridge
the picture and the symbols. A heading that slides in or a paragraph that fades
does not explain anything.

## Equations are visual objects too

- Give every quantity one color and keep it everywhere: in the picture, in
  plain-word labels, in symbols, and across scenes. Pair color with a label so
  color is never the only cue.
- Place labels beside the objects they name. A brace with a short plain-word
  label beats a legend.
- Build equations piece by piece, and link each new piece to its object at the
  moment it appears (highlight both together).
- Transform symbols only when their identity is real: the same glyph moving to
  a new position, or a word becoming the symbol that names it. Never morph one
  equation into an unrelated one, which suggests a false equality.
- While discussing one term, dim the others. When the build is finished, keep
  the picture on screen beside it.
- Use real typesetting (LaTeX) for math and a matching serif for words in
  equations. Avoid walls of text: a label is a few words.

## Compose for seeing and thinking

- Give the main picture most of the frame. Avoid persistent titles, decorative
  panels, and prose that compete with it.
- Keep the reference frame stable during comparisons. Move the camera only to
  reveal a relevant scale or detail, such as zooming in to show that a corner
  has become a speck, then return.
- Reveal one relationship at a time: set up the objects, perform the change,
  then hold the result long enough to look at it.
- Check moving labels at the start, middle, and end of each motion, and wherever
  objects converge.

More motion is not better. Slow down for the important operation; keep setup
quick. Ease motion for attention, but compute every displayed state from the
mathematical model. An overshoot that makes a probability negative, or an
interpolated matrix that silently passes through a singular map, is misleading.

## Implement reproducibly

Drive geometry, numbers, labels, and equations from one shared state (for
example, Manim `ValueTracker`s with `always_redraw`), so they cannot drift
apart. Time animations to the measured narration beats, not to guessed seconds.
Avoid unseeded randomness and network-dependent assets. Engine specifics are in
[manim.md](manim.md) (default) and [remotion.md](remotion.md).

## Review the actual video

Render a central scene before writing the whole video. Inspect the render's
`preview/contact-sheet.png` to scan every beat's final state, the per-beat
middle and final frames, and extra frames during central transformations.
Review at the intended size.

- With the sound off, the main relationship is still visible.
- The viewer can tell what moved, what stayed fixed, and why the result follows.
  A prediction moment holds before the reveal.
- Geometry, numbers, and colored terms agree at intermediate frames.
- No collisions, clipping, unreadable math, garbled morphs, flicker, or abrupt
  replacements.
- No formula appears before its idea has been shown.
- Speech matches the visible operation and leaves time to see the result.

Repair the specific failure and render again. An MP4 existing, or every object
animating, is not approval.

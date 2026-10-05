# Animation as a visual argument

Read this when planning or reviewing an animated lesson, especially when the
user requests 3Blue1Brown-style visual learning. Use the teaching principles:
concrete examples, geometric intuition, continuity, and motion that explains a
relationship. Author an original lesson and its own visual identity.

## Storyboard the reasoning before writing scene code

Find the operation the learner cannot yet picture. Choose a small example whose
state changes can be computed exactly. Describe each mechanism beat in this form:

| Beat | Initial picture | Operation and visible change | What the learner can infer |
| --- | --- | --- | --- |
| Build | Arrow at (2, 1) on a plane | Construct two horizontal unit arrows and one vertical unit arrow | Coordinates are a linear combination of basis directions |
| Specify | Two unit basis vectors | Move their tips to (2, 1) and (1, 2); connect their colors to matrix columns | Columns record where the basis vectors land |
| Predict and apply | Original grid and input arrow; faint destination markers | Briefly hold the question, then transform grid, square, and arrow by the same map | The matrix acts on the whole space, not only a list of numbers |
| Derive | Transformed input arrow | Reconstruct two copies of the first transformed basis vector plus one of the second | (5, 4) comes from the same combination in the new directions |
| Generalize | Unit square and its transformed parallelogram | Highlight area and connect it to the determinant | This example scales signed area by three |

This is a worked example, not a required sequence for all topics. For a research
paper, show the baseline and new method on the same input and visual scale.
Mark illustrative geometry or synthetic data when it is not the paper's actual
mechanism or evidence. Avoid inventing a geometric interpretation for an abstract
embedding just because it is easy to draw arrows.

Write narration from the storyboard. Each spoken claim should have a visible
referent at that moment. Divide narration when the viewer needs to inspect an
intermediate state. Introduce notation after the corresponding object exists.

## Choose a motion that carries the explanation

| Relationship to teach | Useful construction | Check for correctness |
| --- | --- | --- |
| Linear transformation | Deform a coordinate grid while basis vectors, sample vectors, and a unit square move together | Apply the same matrix to every point; keep the origin fixed and parallel lines parallel |
| Derivative or optimization | Shrink a secant toward a tangent; mark rise/run; link slope, step size, and the next iterate | Compute from the function; distinguish discrete algorithm steps from an interpolated motion guide |
| Integral or expectation | Build rectangles or probability-weighted contributions, then collect their sum | Areas or weights use the same units and normalization as the equation |
| Attention or message passing | Reveal actual scores, normalize weights, then combine value vectors with visible weighted contributions | Scores, weights, and weighted sums agree; a 2D picture of latent vectors is illustrative |
| Algorithm or recursion | Follow individual input objects through intermediate states; retain eliminated candidates as ghosts | Visible state follows the actual algorithm, including the stopping condition |
| Probability or evidence | Track probability mass as assumptions or observations change; compare before and after on fixed axes | Do not suggest an unproved causal relationship or use unseeded random samples |
| Parameter sensitivity | Change one labeled parameter and update dependent geometry and readouts together | Keep comparison scales fixed and show valid limits or a meaningful failure case |

Use path drawing to establish an object, an anchored transformation to preserve
identity, a trace or ghost to compare states, and a color-linked equation to
bridge geometry and symbols. These are choices, not an animation quota. A motion
that merely slides a heading or fades a paragraph does not explain the mechanism.

## Compose for seeing and thinking

- Give the main diagram most of the usable frame. Remove persistent oversized
  titles, decorative panels, and prose that compete with it.
- Define semantic colors and keep them across geometry, labels, equation terms,
  and scenes. Also use labels or line styles so color is not the only cue.
- Keep the reference frame stable during comparisons. Move the camera only to
  reveal a relevant scale or detail; preserve context with axes or a faint ghost.
- Reveal one relationship at a time. Establish the objects, perform the change,
  then hold the result long enough to inspect it. Keep the result on screen while
  introducing the notation that explains it.
- Prefer labels beside the objects they name. Use leaders or separate annotations
  when transformed objects converge; check moving labels between endpoints too.
- Use real mathematical typesetting or well-spaced SVG symbols for equations.
  Color corresponding terms; transform matching tokens only when their identity
  is valid. Do not morph unrelated equations into apparent equalities.
- Reserve caption space. Long narration beats can make captions taller than the
  nominal safe area; shorten or split them before compressing the diagram.

More motion is not automatically better. Slow or hold the important operation;
keep setup transitions brief. Use smooth easing for attention, but derive the
displayed state from the mathematical model. A spring that makes a probability
negative, overshoots a final iterate, or inverts a matrix is misleading.

## Implement reproducibly

The existing renderer supports React and SVG, so rich mathematical animation
does not require changing engines. Copy `assets/animation-kit.jsx` beside the
authored scene if useful. It includes beat-relative progress, vector arithmetic,
coordinate mapping, path drawing, arrowheads, and a transformable grid. The
starter shows how to connect these pieces into a coherent lesson.

Compute all visual properties from the current frame and the same state model:
geometry, numbers, labels, and equations must not have independent timelines.
Anchor timing to resolved narration beats, leaving setup and a readable hold.
Split a beat when several distinct operations need their own spoken timing.
Avoid CSS transitions, timers, network-dependent assets, and random render state.

For a linear map, an interpolation such as A(t) = (1-t)I + tA is a family of
intermediate maps, not a claim that the final transformation happens in physical
time. Some choices of A make this path singular or reverse orientation. Check
that behavior rather than silently treating an interpolation as a rotation.

Manim can be appropriate when the user requests it or an existing project uses
it. Do not switch engines merely to imitate a channel: the visual argument,
mathematical fidelity, and pacing are the parts the viewer learns from.

## Review the actual video

Render a representative mechanism before expanding a long video. For every
central operation, inspect its setup, a midpoint, its result, and nearby beat
joins. Use additional stills or a frame strip from the MP4; the renderer's three
default previews are only an initial check. Review at the intended viewing size.

Check these observable outcomes:

- Muted playback still shows the main relationship. Labels can name objects,
  but prose is not carrying all the reasoning.
- The viewer can identify what moved, what stayed invariant, and why the result
  follows. A prediction moment, when useful, holds before revealing the answer.
- Geometry, numeric examples, units, and colored equation terms agree at
  intermediate frames as well as endpoints.
- No label collisions, clipped arrowheads, unreadable math, caption overlap,
  flicker, or abrupt object replacements occur during a transformation.
- A sweep or comparison actually demonstrates sensitivity, an invariant, or a
  limit. It is not an unlabelled decorative loop.
- Spoken timing matches the visible operation and gives the viewer time to see
  the result. If a dense beat rushes, split it and remeasure speech.

Repair the specific failure and render again. Do not approve a lesson merely
because an MP4 exists or because all objects animate.

## Teaching reference

[3Blue1Brown's explanation of its teaching and animation approach](https://www.3blue1brown.com/about/)
emphasizes examples before abstraction and deliberate motion that reinforces
the narration. The guidance above applies those principles to this skill's
renderer; it is not an official 3Blue1Brown template.

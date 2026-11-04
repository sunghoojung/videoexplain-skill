# Teaching method: intuition first

This is the heart of the skill. A good lesson makes the viewer curious, lets
them discover the idea through a small concrete case, shows *why* it works with
a picture that moves, and only then gives the idea its notation. The formula is
a compact name for something the viewer already understands, never the thing
they are asked to understand.

These principles are inspired by
[3Blue1Brown's approach](https://www.3blue1brown.com/about/): examples before
abstraction, discovery over announcement, and motion that carries the argument.
Author an original lesson; do not imitate a specific video, its characters, or
its branding.

## Plan the lesson first

Write `lesson-plan.md` before narration or code. Every later decision follows
from it.

```markdown
Insight: one sentence a curious teenager would understand, no jargon.
Hook: the concrete question the video opens with and answers by the end.
Worked example: the small case, with its actual numbers.
Aha: the visual transformation that makes the insight click.
Formula: first symbol appears at beat N. Pieces in plain words:
  - "the extra area" -> d(x^2)
  - "the nudge" -> dx
Limits: where the idea stops working, or what to try next.
```

If you cannot write the insight sentence without notation, you do not yet have
the intuition to teach. Work it out first: why is it true, what would break it,
how would someone have discovered it?

## The arc of a lesson

| Part | Share | What happens |
| --- | --- | --- |
| Hook | 5-10% | A concrete question, puzzle, or surprising fact on screen. No definitions. |
| Play | 25-35% | The smallest example, with real numbers the viewer can check by eye. Ask them to predict, pause, then show. |
| Aha | 15-25% | Transform the picture so the pattern becomes obvious: shrink something, rearrange, compare, vary one parameter. |
| Generalize | 10-20% | Change the example; the pattern survives. Name the pieces in plain words. |
| Formula | 10-20% | Words become symbols one at a time, linked to the picture. Plug the example back in. |
| Insight | 5-10% | Restate the idea as a picture, note its limits, or invite the viewer to try a new case. |

Adapt the proportions, not the order. For a paper, the arc becomes problem,
baseline, new mechanism on a worked example, evidence, and limits, and the
mechanism still comes before its equation.

## Choose the example

Find the conceptual bottleneck: the one relationship that, once seen, makes the
rest feel inevitable. Teach that, not a tour of everything related.

- Mathematics: a specific numeric or geometric case, then vary one quantity,
  find the invariant, and only then state the rule and its conditions.
- Algorithms: a tiny input, its state at each step, the invariant, then scaling
  and failure cases.
- Science: an observation, a proposed mechanism, a prediction, the evidence.
- Research papers: the problem, what the previous approach did on one input,
  what the new mechanism does on the same input, the evidence, the limits.
- Everyday ideas: a familiar situation, cause and effect, the transferable rule.

Keep the example small enough that every step can be checked by eye, and keep
it through the whole video so the intuition and the eventual notation refer to
the same objects. Use round numbers (3 and 0.1, not 2.7 and 0.13) unless the
specific value matters. Clearly label illustrative values as illustrative.

An analogy can open the door, but then show the actual mechanism. For
attention, "relevance-weighted lookup" helps, but the scores and weights are
computations, not intentions.

## The formula reveal

Most explainers fail here: they show the equation, then explain it symbol by
symbol. Reverse that. By the time a formula appears, the viewer should already
know what it says.

1. **Earn it.** The formula appears only after the viewer has seen the
   relationship work in the example. Usually that is in the final third.
2. **Words first.** Write the relationship on screen in plain words, each
   phrase colored like the object it describes:
   `new area ÷ nudge ≈ 2 × side`.
3. **One symbol per beat.** Swap one phrase for its symbol at a time, and
   change its label in the picture at the same moment (`side` becomes `x`
   in both places). The narration says what the piece *means*.
4. **Keep the picture on screen.** While a term is discussed, highlight its
   object (circumscribe, indicate, or dim everything else).
5. **Assemble the familiar form last.** Rearrange the pieces into the standard
   notation (for example, stack `d(x²) ÷ dx` into a fraction), with each glyph
   moving to its new place rather than the equation being swapped wholesale.
6. **Plug the example back in.** Show that the formula reproduces the numbers
   the viewer already computed by hand.

For a long formula, name chunks before symbols. Put a brace with a plain-word
label under each chunk ("how surprised we are", "averaged over the data") and
build it across several beats. More than about five new symbols at once is too
many. If the topic *is* a formula (Bayes' theorem, a loss function), still open
with a concrete scenario (a test given to 1,000 people), work it with counts,
and let the formula summarize the counting.

## Narration: write for the ear

Narration is heard and also shown as subtitles, so it carries meaning, while
notation lives on screen. Run `explain-concept lint` and rewrite flagged beats.

| Reads notation aloud (avoid) | Explains meaning (do this) |
| --- | --- |
| "d of x squared over d x equals two x" | "For every bit of nudge, the area grows by two sides' worth." |
| "the sum from i equals one to n of x sub i" | "Add up every measurement." |
| "the gradient of L with respect to theta" | "the direction that makes the error grow fastest" |
| "P of A given B equals P of B given A times P of A over P of B" | "Of everyone who tests positive, what fraction is actually sick?" |

- Introduce a symbol by name once ("we write the nudge with a little d in
  front"), then refer to it by what it means.
- Speak to the viewer: "you", "we", "notice", "what if". Ask real questions,
  then pause before answering.
- One or two short sentences per beat, about 40 words at most. Each beat should
  match one visible change.
- Say results, not arithmetic chains. Numbers are fine; strings of operations
  are not.
- Avoid "In this video we will...", lists of definitions, and filler like
  "simply", "obviously", or "it is easy to see".
- Spell out anything the speech engine might mispronounce, and keep symbol
  characters out of beat text entirely.

## Accuracy and depth review

Before delivery, check:

- Does the video say *why* and *how*, not only *what*?
- Is there any formula on screen before the viewer has seen the idea work?
- Could a viewer state the insight in their own words without the formula?
- Do the example, the picture, and the notation agree, including intermediate
  states?
- Are assumptions explicit, including where the rule stops working?
- Are measurement, causal claims, speculation, and analogy distinguished?
- Can the viewer apply the idea to a new case?

A prediction question is valuable when it creates curiosity or resolves a
misconception. Do not append quizzes or recap lists to every lesson.

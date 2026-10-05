# Teaching method

## Find the conceptual bottleneck

Identify what a learner must understand to make the next step feel justified.
Teach that relationship, rather than listing everything associated with the
topic. For an unfamiliar concept, name the prerequisite in one sentence and
explain it in place if it is essential.

Match the route to the topic:

- Mathematics: specific numerical or geometric example, changing one quantity,
  underlying invariant, formal definition or derivation, conditions of validity.
- Algorithms and software: tiny input, state changes, output, invariant or
  mechanism, scaling and failure conditions.
- Science: observation, proposed mechanism, prediction, evidence, limitations.
- Research: problem, previous approach, new mechanism, evidence supporting the
  contribution, limitations. A proposed mechanism is not an established result.
- Everyday concepts: familiar situation, cause and effect, transferable rule,
  case where the rule needs qualification.

## Concrete before abstract

Choose an example small enough that the learner can follow every step. Keep it
through the explanation so the notation and the intuition refer to the same
objects. Introduce one new relation at a time. For a quantitative explanation,
show actual values and compute the outcome, not just a formula.

For example, binary search on eight sorted items shrinks the remaining candidates
to at most four, two, then one. Use that repeated halving to motivate logarithmic
scaling. Explain that finding a particular item may finish earlier and that the
sorted-input assumption matters. Do not generalize it to unsorted search.

Use analogy to open the door, then describe the actual mechanism. For attention,
a relevance-weighted lookup can help, but clarify that learned scores and
normalized weights are computations, not human intention or guaranteed truth.

## Visual reasoning

Use a stable visual mapping: the same quantity should keep the same label and
color across examples, equations, and diagrams. Pair color with labels or shape.
Changing an input should visibly change the correct dependent quantity.
Preserve object identity across transformations only when the mathematical or
causal relationship supports it; a decorative morph can teach a false equivalence.

A visual is useful if it lets the learner predict an outcome or see why a step
works. Avoid diagrams that merely repeat the surrounding text. Do not force
geometric metaphors onto topics whose mechanism is better explained verbally.

For animated lessons, use [visual-reasoning.md](visual-reasoning.md) to turn
this into a storyboard of computed state changes. Establish the object before
its notation, preserve it through the operation, and use the result to motivate
the formal rule. Connect equation terms to the objects with stable colors and
labels instead of narrating over a static formula.

## Accuracy and depth review

Before delivery, check:

- Does the explanation say why or how, as well as what?
- Do the example, notation, and visual mapping agree?
- Are the relevant assumptions explicit, including where the rule stops working?
- Are measurement, causal inference, speculation, and analogy distinguished?
- Can the learner use the takeaway on a new example?

A brief prediction or comprehension question can be useful when requested or
when it resolves a misconception. Do not append quizzes or recap sections to
every answer. Adapt the length to the user's request.

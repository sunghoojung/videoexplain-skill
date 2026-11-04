// Narration is heard, and shown as subtitles. It should explain what things
// mean, while the formula itself lives on screen. These checks catch narration
// that reads math aloud or packs too much into one beat. They are advice for
// the author, not proof of a good explanation.

const SYMBOLS = /[=+^_\\{}<>*|∑∫√∂∞≈≠≤≥±×÷·πθλμσφωαβγδεΔΣΠ∇]/u;
const LATEX = /\\[a-zA-Z]+|\$[^$]*\$/;
const SPOKEN_MATH = [
  /\bsquared\b/i,
  /\bcubed\b/i,
  /\bto the (?:power|[a-z]+th)\b/i,
  /\bsub [a-z]\b/i,
  /\b[a-z] (?:over|times|plus|minus|equals) [a-z]\b/i,
  /\bd [a-z] (?:by |over )?d [a-z]\b/i,
  /\b(?:sigma|integral) (?:of|from)\b/i,
  /\bpartial [a-z]\b/i,
  /\b(?:log|sin|cos|tan|exp) of [a-z]\b/i,
];
const LONE_LETTER = /\b(?![aAI]\b)[a-zA-Z]\b/g;
const MAX_WORDS = 42;

export function lintBeat(text) {
  const issues = [];
  if (LATEX.test(text))
    issues.push(
      "contains LaTeX; narration is spoken, so say what the quantity means and show the notation on screen",
    );
  else if (SYMBOLS.test(text))
    issues.push(
      "contains written math symbols; describe the idea in words and let the formula appear on screen",
    );
  const spoken = SPOKEN_MATH.filter((pattern) => pattern.test(text)).length;
  const letters = (text.match(LONE_LETTER) || []).length;
  if (spoken >= 2 || (spoken >= 1 && letters >= 2) || letters >= 4)
    issues.push(
      "reads a formula aloud; name what each piece means (for example 'the extra area') instead of reciting symbols",
    );
  const words = text.trim().split(/\s+/).length;
  if (words > MAX_WORDS)
    issues.push(
      `has ${words} words; split it so the picture can change with each idea (aim for ${MAX_WORDS} or fewer)`,
    );
  return issues;
}

export function lintProject(project) {
  const warnings = [];
  for (const scene of project.scenes || [])
    for (const [i, beat] of (scene.beats || []).entries())
      for (const issue of lintBeat(beat.text || ""))
        warnings.push({ scene: scene.name, beat: i + 1, issue });
  return warnings;
}

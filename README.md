<div align="center">

# VideoExplain

**Turn research papers and concepts into narrated, intuition-first visual explanations.**

An agent skill for Codex, Claude Code, and OpenCode.

[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MIT License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

[Demo](#demo) · [Install](#install) · [Usage](#usage) · [How it works](#how-it-works)

</div>

## Demo

**How fast does a square grow?** - a two-minute Manim lesson on the derivative
of x². The viewer guesses, computes with real numbers, and watches the corner
piece vanish before a single symbol appears. Then each plain-language phrase
turns into its symbol, linked by color to the picture.

[Manim source](skills/explain-concept/assets/manim/square_derivative.py) · [Narration script](skills/explain-concept/assets/manim/project.example.json)

**A matrix moves the whole plane** - an earlier 54-second example built with
the alternative React/Remotion engine.

https://github.com/user-attachments/assets/a7cc3739-8b2c-47f2-b9e9-79a04b4e8f7c

[Animation source](skills/explain-concept/assets/remotion/scenes.example.jsx) · [Narration script](skills/explain-concept/assets/remotion/project.example.json)

## Install

```bash
npx --yes --package=github:sunghoojung/videoexplain-skill \
  explain-concept install --replace
```

Installs `$explain-concept` for Codex. Updates preserve the previous installation
as a backup.

**Requirements:** Node.js 20+, `ffmpeg`, `ffprobe`, Python 3.11+ with
[Manim](https://www.manim.community/), and LaTeX (TinyTeX, MacTeX, or TeX Live)
for typeset math. Run `doctor` to see what is missing and how to install it:

```bash
npx --yes --package=github:sunghoojung/videoexplain-skill explain-concept doctor
```

On macOS, a typical setup is:

```bash
brew install cairo pango pkg-config ffmpeg
npx --yes --package=github:sunghoojung/videoexplain-skill explain-concept setup
```

`setup` installs Manim and pypdf into one shared environment
(`~/.local/share/explain-concept/venv`) that every project and agent session
finds automatically. Install TinyTeX (no sudo) from
[yihui.org/tinytex](https://yihui.org/tinytex/) plus the LaTeX packages `doctor`
lists. The React/Remotion engine needs only
Node.js and ffmpeg.

On macOS, narration uses built-in `say` with your system's default voice. Linux
uses `espeak-ng` or `espeak`. You can request another voice or supply narration audio.

## Usage

Ask your agent:

```text
Use $explain-concept to turn this paper.pdf into a narrated explainer video.
```

```text
Use $explain-concept to make a two-minute video explaining gradient descent
with geometric intuition and a worked example.
```

The default result is a **narrated MP4 with a subtitle track, an SRT file, the
lesson plan, and reproducible Manim source**. You can also request a storyboard
or written explanation.

## How it works

Lessons follow a 3Blue1Brown-inspired method: intuition first, notation last.

1. **Hook and play.** Open with a concrete question and the smallest example
   whose numbers the viewer can check by eye.
2. **Make it click.** Transform the picture until the pattern is obvious, then
   vary the example to show it holds.
3. **Earn the formula.** Write the relationship in plain words, swap each phrase
   for its symbol one at a time with matching colors, and plug the example back in.
4. **Narrate meaning, not notation.** Subtitles never read math aloud; `lint`
   flags beats that do.
5. **Render and review.** Narration is measured first. Each Manim beat lasts at
   least as long as its speech, and a deliberate pause adds silence rather than
   cutting off words. Every beat gets preview frames and a contact sheet.

The active agent writes the lesson plan, narration, and Manim scenes. The CLI
measures speech, renders with Manim, and assembles the video.

[Teaching method](skills/explain-concept/references/teaching.md) · [Visual reasoning](skills/explain-concept/references/visual-reasoning.md) · [Manim production](skills/explain-concept/references/manim.md)

<details>
<summary><strong>Other agents and custom install locations</strong></summary>

```bash
npx --yes --package=github:sunghoojung/videoexplain-skill \
  explain-concept install --agent claude --replace

npx --yes --package=github:sunghoojung/videoexplain-skill \
  explain-concept install --agent opencode --replace
```

Use `--path /path/to/skills` to choose another installation directory.

</details>

<details>
<summary><strong>CLI and local development</strong></summary>

Check narration, then render an authored project:

```bash
npx --yes --package=github:sunghoojung/videoexplain-skill \
  explain-concept lint --project project.json

npx --yes --package=github:sunghoojung/videoexplain-skill \
  explain-concept render --project project.json --output video
```

Choose `--quality l`, `m`, or `h` for 480p, 720p, or 1080p. Use `--scenes A,B`
to render only some scenes while iterating, `--python` to pick a different
interpreter with Manim, and `--voice` only when choosing a different local voice. See the
[Manim guide](skills/explain-concept/references/manim.md) for the project format,
beat timing, and supplied audio. Use a new or empty output directory.

Run the included example from a checkout:

```bash
npm ci
node skills/explain-concept/scripts/explain-concept.mjs render \
  --project skills/explain-concept/assets/manim/project.example.json --output video
```

PDF ingestion uses `pypdf`, which `setup` installs alongside Manim:

```bash
npx --yes --package=github:sunghoojung/videoexplain-skill \
  explain-concept ingest --paper paper.pdf --output paper-source
```

Every command supports `--help`. Results use JSON on stdout; diagnostics use stderr.

</details>

## Credits and license

Adapted from [PaperExplainAgent](https://github.com/mihirballari/PaperExplainAgent).
Skill code is [MIT licensed](LICENSE). [Manim Community](https://www.manim.community/)
is MIT licensed; [Remotion has separate license terms](https://www.remotion.dev/license).
See [provenance](skills/explain-concept/references/provenance.md).

<div align="center">

# VideoExplain

**Turn research papers and concepts into narrated visual explanations.**

An agent skill for Codex, Claude Code, and OpenCode.

[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MIT License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

[Demo](#demo) · [Install](#install) · [Usage](#usage) · [How it works](#how-it-works)

</div>

## Demo

**A matrix moves the whole plane** - a 54-second narrated example with captions.

https://github.com/user-attachments/assets/a7cc3739-8b2c-47f2-b9e9-79a04b4e8f7c

Watch the basis vectors become matrix columns, the grid deform, and the output
emerge from the same visual construction.

[Animation source](skills/explain-concept/assets/scenes.example.jsx) · [Narration script](skills/explain-concept/assets/project.example.json)

## Install

```bash
npx --yes --package=github:sunghoojung/videoexplain-skill \
  explain-concept install --replace
```

Installs `$explain-concept` for Codex. Updates preserve the previous installation
as a backup.

**Requirements:** Node.js 20+, `ffmpeg`, and `ffprobe`. React and Remotion come
with the package; Headless Chrome downloads on the first render when needed.

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

The default result is a **narrated MP4, captions, and reproducible animation source**.
You can also request a storyboard or written explanation.

## How it works

1. **Understand the idea.** Read the source and choose a small worked example.
2. **Make the reasoning visible.** Build and transform objects, preserve their
   identity, and connect geometry to equations with consistent colors.
3. **Render and review.** Measure narration, align animation to speech, and inspect
   intermediate frames for mathematical accuracy and visual clarity.

The active agent writes the explanation and React/SVG scenes. The CLI renders
with Remotion. Lessons emphasize 3Blue1Brown-inspired visual intuition and
purposeful motion.

[Teaching method](skills/explain-concept/references/teaching.md) · [Visual reasoning](skills/explain-concept/references/visual-reasoning.md) · [Project format](skills/explain-concept/references/animated-video.md)

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

Check dependencies and render an authored project:

```bash
npx --yes --package=github:sunghoojung/videoexplain-skill explain-concept doctor

npx --yes --package=github:sunghoojung/videoexplain-skill \
  explain-concept render --project project.json --output video
```

Choose `--quality l`, `m`, or `h` for 480p, 720p, or 1080p. Use `--voice` only
when choosing a different local voice. See the [project format](skills/explain-concept/references/animated-video.md)
for supplied audio, captions, and scene timing. Use a new or empty output directory.

Run the included example from a checkout:

```bash
npm ci
node skills/explain-concept/scripts/explain-concept.mjs render \
  --project skills/explain-concept/assets/project.example.json --output video
```

PDF ingestion is optional and needs Python 3.11+ with `pypdf`:

```bash
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r skills/explain-concept/requirements.txt
npx --yes --package=github:sunghoojung/videoexplain-skill \
  explain-concept ingest --paper paper.pdf --output paper-source \
  --python .venv/bin/python
```

Every command supports `--help`. Results use JSON on stdout; diagnostics use stderr.

</details>

## Credits and license

Adapted from [PaperExplainAgent](https://github.com/mihirballari/PaperExplainAgent).
Skill code is [MIT licensed](LICENSE); [Remotion has separate license terms](https://www.remotion.dev/license).
See [provenance](skills/explain-concept/references/provenance.md).

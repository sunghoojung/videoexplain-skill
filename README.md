# VideoExplain Skill

Turn a research paper or concept into an original narrated explainer video.
Adapted from [PaperExplainAgent](https://github.com/mihirballari/PaperExplainAgent).

The agent reads the paper or develops the concept, writes the explanation and
animation code, then renders a narrated MP4 with measured timing and captions.

## Install the skill

```bash
npx --yes --package=github:sunghoojung/videoexplain-skill explain-concept install --replace
```

The default target is Codex. Use `--agent claude`, `--agent opencode`, or
`--path /path/to/skills` for another target. Updates preserve the previous skill
as a backup. Node.js 20+ is required; there are no npm dependencies or API keys.

## Ask the agent

```text
Use $explain-concept to turn this paper.pdf into a narrated explainer video.
Use $explain-concept to make a two-minute video explaining gradient descent.
Use $explain-concept to explain this paper's main contribution with animations: <paper URL>.
```

The default deliverable is a narrated video, captions, and reproducible scene
source. Request a written explanation or storyboard explicitly if you want one.
The model authors the lesson; the CLI executes paper ingestion and rendering.

## Rendering environment

Rendering uses Manim Community 0.21, Python 3.11+, ffmpeg, and ffprobe. PDF
extraction uses pypdf. Install Python packages into an isolated environment:

```bash
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r skills/explain-concept/requirements.txt
```

Follow [Manim's installation guide](https://docs.manim.community/en/stable/installation/uv.html)
for native Cairo/Pango dependencies. Local narration uses macOS `say` or Linux
`espeak-ng`/`espeak`; supplied narration audio is also supported. Rendering does
not require a separate model API.

## Local commands

From a checkout of this repository:

```bash
npx --yes . doctor --python .venv/bin/python
npx --yes . ingest --paper paper.pdf --output paper-source --python .venv/bin/python
npx --yes . render --project project.json --output video --python .venv/bin/python
```

`ingest` creates page-indexed paper text and optional page previews. The model
must inspect important equations and figures in the original paper.

`render` runs model-authored scenes and narration from a project file. It
measures speech, times animation beats, assembles the scenes, and writes
`explainer.mp4`, `explainer.srt`, and a source-reference manifest. It publishes
output only after success and preserves existing output directories.

The runnable gradient-descent starter is in `skills/explain-concept/assets/`.
Use `guide --mode production --full` for its project format and timing contract.
Every command supports `--help`. Results use JSON on stdout; errors use stderr.

## License

MIT. See [provenance](skills/explain-concept/references/provenance.md).

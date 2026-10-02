# VideoExplain Skill

An agent skill for explaining concepts, papers, and videos through concrete
examples and visual reasoning. Adapted from
[PaperExplainAgent](https://github.com/mihirballari/PaperExplainAgent).

The model teaches the topic. The CLI installs the skill and prepares captions
and frames for video analysis.

## Install

With Node.js 20 or later:

```bash
npx --yes --package=github:sunghoojung/videoexplain-skill explain-concept install
```

Or clone this repository and run:

```bash
npx --yes . install
npx --yes . doctor
```

The default target is Codex. Use `--agent claude`, `--agent opencode`, or
`--path /path/to/skills` to choose another target. Use `--replace` to update a
different existing installation; the previous version is kept as a backup.

## Use

```text
Use $explain-concept to explain gradient descent with a numerical example.
Use $explain-concept to explain this video: <URL or file>.
Use $explain-concept to turn this paper into a three-minute storyboard.
```

The skill works without API keys or npm dependencies. It can explain accessible
video content and captions, plan animations, and render them when suitable
animation and speech tools are available.

## Prepare video evidence

From a local checkout:

```bash
npx --yes . prepare --subtitles lesson.vtt --output evidence
npx --yes . prepare --video lesson.mp4 --start 30 --end 60 --output passage
```

Preparation requires Python 3.9+. Frame extraction also requires `ffmpeg` and
`ffprobe`. No pip packages are needed.

The helper parses SRT/WebVTT, preserves cue times, and samples eight frames by
default. It uses two workers and limits images to 1280 pixels wide. Change these
bounds with `--max-frames` and `--jobs`. Output appears only after processing
succeeds; existing evidence is preserved.

It does not download or transcribe videos. The model must read the evidence
and inspect frames before explaining them.

Each command supports `--help`. Command results use JSON on stdout and errors
use stderr. `guide --mode video --full` displays the video instructions.

## License

MIT. Upstream attribution and adaptation details are in
[provenance.md](skills/explain-concept/references/provenance.md).

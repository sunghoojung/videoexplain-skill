# Explain an existing video

## Acquire evidence

Use the supplied transcript, captions, video file, or accessible page first.
For a URL, use available browser or media tools to inspect the actual content
and captions. A title, description, or search snippet alone is not evidence of
what happens in the video. Do not bypass private access or invent a transcript.

For local SRT or WebVTT captions and local video, the bundled helper provides
timestamped text and a small frame sample without third-party Python packages:

```bash
python3 /path/to/explain-concept/scripts/prepare_video.py \
  --video /path/to/lesson.mp4 --subtitles /path/to/lesson.vtt \
  --output /path/to/new-evidence-directory
```

Resolve the script path relative to this installed skill. Use a new output
directory; the helper refuses to overwrite existing evidence. `--subtitles`
alone works without FFmpeg. `--video` requires `ffmpeg` and `ffprobe` on PATH.
It does not download media or transcribe speech.

Read `manifest.json` and `transcript.md`, and inspect the selected frame files
with an available image viewer. Do not treat generating files as viewing them.
The manifest preserves cue times and requested frame seek positions in seconds.
Decoded frames are quantized to the video's source frame times.
Caption times are assumed to refer to the supplied video's timeline; confirm
offsets if the video is an excerpt or the captions come from another version.

Use `--start 120 --end 180 --max-frames 12` to examine a passage more closely.
Frame extraction uses two workers by default, capped at four with `--jobs`;
each worker uses one codec thread. Output appears only after all work succeeds.
The same helper is available through the packaged CLI:

```bash
npx --yes --package=/path/to/package-directory-or-tgz explain-concept prepare \
  --video /path/to/lesson.mp4 --subtitles /path/to/lesson.vtt \
  --output /path/to/new-evidence-directory
```

Times are seconds from the beginning of the source. Captions intersecting the
range retain their original full cue times. Uniform frame samples can miss fast
events: inspect around transitions and important formulas at higher density.

If captions are absent, use an available speech transcription capability and
inspect relevant frames. Correct obvious transcription errors only with evidence
or label the interpretation uncertain. Frames alone cannot establish what was
said; captions alone cannot establish what was shown. If neither is accessible,
request a transcript or accessible file and clearly limit any topic explanation.

## Explain the ideas, not just the sequence

Find the central question, prerequisite ideas, mechanism, example, and conclusion.
Use a short overview followed by the parts the user needs help understanding.
Explain skipped steps, unfamiliar notation, and why demonstrations work. Use
source timestamps for meaningful transitions, not arbitrary evenly spaced chapters.

When adding your own example or correcting a claim, label the addition and tie
it back to the source. Distinguish "the speaker claims" from a verified fact.
Avoid claiming to have watched the whole video when you only read captions or
sampled frames. State coverage briefly where it affects reliability.

Use `[02:15](video-url?t=135)` links only when the platform supports that URL
syntax; otherwise use plain timestamps. Never invent a time for an untimed
transcript. For a selected excerpt, state its range and do not imply full coverage.

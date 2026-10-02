#!/usr/bin/env python3
"""Prepare caption text and bounded frame evidence from local files.

Python standard library only. Video sampling additionally needs FFmpeg/ffprobe.
No network requests, speech recognition, or model calls.
"""

import argparse
import html
import json
import math
import re
import shutil
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

STAMP = r"(?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3}"
TIMING = re.compile(rf"^\s*({STAMP})\s+-->\s+({STAMP})(?:\s+.*)?$")
CAPTION_TAG = re.compile(
    rf"</?(?:b|i|u|c(?:\.[^ >]+)?|v|lang|ruby|rt|font)(?:\s[^>]*)?>|<{STAMP}>"
)


def seconds(stamp):
    parts = stamp.replace(",", ".").split(":")
    value = float(parts[-1])
    minutes = int(parts[-2])
    if not 0 <= value < 60 or not 0 <= minutes < 60:
        raise ValueError(f"Invalid caption timestamp: {stamp}")
    return value + minutes * 60 + (int(parts[0]) * 3600 if len(parts) == 3 else 0)


def timestamp(value):
    millis = round(value * 1000)
    hours, millis = divmod(millis, 3600000)
    minutes, millis = divmod(millis, 60000)
    secs, millis = divmod(millis, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


def read_captions(path):
    """Read SRT/WebVTT cues, retaining repetitions and the original time ranges."""
    if path.suffix.lower() not in {".srt", ".vtt"}:
        raise ValueError("Captions must be .srt or .vtt; use untimed text directly.")
    content = (
        path.read_text(encoding="utf-8-sig").replace("\r\n", "\n").replace("\r", "\n")
    )
    cues = []
    for block in re.split(r"\n[ \t]*\n", content.strip()):
        lines = block.splitlines()
        if not lines or re.match(r"^(?:WEBVTT|NOTE|STYLE|REGION)(?:\s|$)", lines[0]):
            continue
        timing_index = next((i for i, line in enumerate(lines) if "-->" in line), None)
        if timing_index is None:
            continue
        match = TIMING.fullmatch(lines[timing_index])
        if not match:
            raise ValueError(f"Malformed caption timing: {lines[timing_index]}")
        start, end = (seconds(stamp) for stamp in match.groups())
        if end <= start:
            raise ValueError(
                f"Caption ends before or at its start: {lines[timing_index]}"
            )
        text = " ".join(lines[timing_index + 1 :])
        # WebVTT tags/timestamps and SRT styling, preserving ordinary angle brackets.
        text = CAPTION_TAG.sub("", text)
        text = " ".join(html.unescape(text).split())
        if text:
            cues.append({"start_seconds": start, "end_seconds": end, "text": text})
    if not cues:
        raise ValueError("No nonempty timed caption cues found.")
    return sorted(cues, key=lambda cue: cue["start_seconds"])


def run(command):
    result = subprocess.run(
        command, capture_output=True, text=True, timeout=120, check=False
    )
    if result.returncode:
        raise ValueError(
            f"{Path(command[0]).name} failed: {result.stderr.strip()[-2000:]}"
        )
    return result.stdout


def probe_video(video):
    metadata = json.loads(
        run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_format",
                "-show_streams",
                "-of",
                "json",
                str(video),
            ]
        )
    )
    stream = next(
        (
            s
            for s in metadata.get("streams", [])
            if s.get("codec_type") == "video"
            and not s.get("disposition", {}).get("attached_pic")
        ),
        None,
    )
    if stream is None:
        raise ValueError("The input has no video stream.")
    raw_duration = stream.get("duration")
    if raw_duration in (None, "N/A"):
        raw_duration = metadata.get("format", {}).get("duration")
    try:
        duration = float(raw_duration)
    except (TypeError, ValueError) as exc:
        raise ValueError("Cannot determine video duration.") from exc
    if not math.isfinite(duration) or duration <= 0:
        raise ValueError("Video duration must be positive and finite.")
    return duration, stream["index"]


def sample_times(start, end, count):
    # Midpoints avoid asking the decoder for a nonexistent frame at EOF.
    return [start + (end - start) * (i + 0.5) / count for i in range(count)]


def extract_frame(video, stream_index, output, item):
    i, when = item
    relative = f"frames/{i:03d}.jpg"
    destination = output / relative
    run(
        [
            "ffmpeg",
            "-nostdin",
            "-v",
            "error",
            "-ss",
            f"{when:.6f}",
            "-threads",
            "1",
            "-i",
            str(video),
            "-map",
            f"0:{stream_index}",
            "-frames:v",
            "1",
            "-vf",
            "scale=w='min(1280,iw)':h=-2",
            "-threads",
            "1",
            "-filter_threads",
            "1",
            "-q:v",
            "2",
            "-n",
            str(destination),
        ]
    )
    if not destination.is_file() or not destination.stat().st_size:
        raise ValueError(f"No frame decoded at {when:.3f}s.")
    return {"requested_seconds": when, "path": relative}


def nonnegative(value):
    number = float(value)
    if not math.isfinite(number) or number < 0:
        raise argparse.ArgumentTypeError("Time must be finite and nonnegative.")
    return number


def main():
    staging = None
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument("--video", type=Path, help="Local video, not a URL")
    parser.add_argument("--subtitles", type=Path, help="Local SRT or WebVTT")
    parser.add_argument(
        "--output", type=Path, required=True, help="New or empty evidence directory"
    )
    parser.add_argument("--start", type=nonnegative, default=0.0)
    parser.add_argument("--end", type=nonnegative)
    parser.add_argument(
        "--max-frames", type=int, default=8, help="Uniform samples, 1-60 (default 8)"
    )
    parser.add_argument(
        "--jobs",
        type=int,
        default=2,
        help="Frame workers, 1-4 (default 2); each uses one codec thread",
    )
    args = parser.parse_args()
    if not args.video and not args.subtitles:
        parser.error("Supply --video, --subtitles, or both.")
    if not 1 <= args.max_frames <= 60:
        parser.error("--max-frames must be between 1 and 60.")
    if not 1 <= args.jobs <= 4:
        parser.error("--jobs must be between 1 and 4.")
    for name in ("video", "subtitles"):
        value = getattr(args, name)
        if value:
            if not value.is_file():
                parser.error(f"{name} file does not exist: {value}")
            setattr(args, name, value.resolve())
    output = args.output.resolve()
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error(
            "Output must be a new or empty directory; existing evidence is preserved."
        )
    try:
        cues = read_captions(args.subtitles) if args.subtitles else []
        duration, stream_index = None, None
        if args.video:
            missing = [tool for tool in ("ffmpeg", "ffprobe") if not shutil.which(tool)]
            if missing:
                raise ValueError(
                    f"Missing video dependencies: {', '.join(missing)}. Captions-only mode needs neither."
                )
            duration, stream_index = probe_video(args.video)
        end = (
            args.end
            if args.end is not None
            else (
                duration
                if duration is not None
                else max(c["end_seconds"] for c in cues)
            )
        )
        if end <= args.start:
            raise ValueError("The selected range must have end greater than start.")
        if duration is not None and (args.start >= duration or end > duration):
            raise ValueError(
                f"Selected range exceeds video duration ({duration:.3f}s)."
            )
        selected = [
            c
            for c in cues
            if c["end_seconds"] > args.start and c["start_seconds"] < end
        ]
        output.parent.mkdir(parents=True, exist_ok=True)
        staging = Path(tempfile.mkdtemp(prefix=f".{output.name}-", dir=output.parent))
        manifest = {
            "video": str(args.video) if args.video else None,
            "subtitles": str(args.subtitles) if args.subtitles else None,
            "duration_seconds": duration,
            "range_seconds": {"start": args.start, "end": end},
            "cues": selected,
            "frames": [],
            "limitations": [
                "No speech transcription or content interpretation has been performed.",
                "Caption timestamps are not independently synchronized with the video.",
                "Uniform samples do not establish complete visual coverage.",
                "Frame times are requested seek positions; decoding is quantized to source frames.",
            ],
        }
        if args.subtitles:
            transcript = "\n\n".join(
                f"[{timestamp(c['start_seconds'])} - {timestamp(c['end_seconds'])}] {c['text']}"
                for c in selected
            )
            (staging / "transcript.md").write_text(transcript + "\n", encoding="utf-8")
            if not selected:
                manifest["limitations"].append(
                    "No caption cues intersect the selected range."
                )
        if args.video:
            frames_dir = staging / "frames"
            frames_dir.mkdir()
            items = enumerate(sample_times(args.start, end, args.max_frames), 1)
            with ThreadPoolExecutor(
                max_workers=min(args.jobs, args.max_frames)
            ) as workers:
                # map preserves chronological order even when workers finish out of order.
                manifest["frames"] = list(
                    workers.map(
                        lambda item: extract_frame(
                            args.video, stream_index, staging, item
                        ),
                        items,
                    )
                )
        manifest_path = output / "manifest.json"
        (staging / "manifest.json").write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        if output.exists():
            output.rmdir()  # Fails safely if another process put files there.
        staging.rename(output)
        print(
            json.dumps(
                {
                    "manifest": str(manifest_path),
                    "caption_cues": len(selected),
                    "sampled_frames": len(manifest["frames"]),
                }
            )
        )
    except (ValueError, OSError, subprocess.TimeoutExpired) as exc:
        parser.exit(1, f"Error: {exc}\n")
    finally:
        if staging is not None and staging.exists():
            shutil.rmtree(staging)


if __name__ == "__main__":
    main()

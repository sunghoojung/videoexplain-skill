#!/usr/bin/env python3
"""Read research papers and render original narrated Manim explainers."""

import argparse
import importlib.util
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path


def run(command, *, cwd=None, env=None, timeout=900):
    result = subprocess.run(
        command,
        cwd=cwd,
        env=env,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    if result.returncode:
        raise ValueError(
            f"{Path(command[0]).name} failed: {result.stderr[-2000:] or result.stdout[-2000:]}"
        )
    return result.stdout


def probe(path):
    return json.loads(
        run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_format",
                "-show_streams",
                "-of",
                "json",
                str(path),
            ]
        )
    )


def duration(path):
    value = float(probe(path)["format"]["duration"])
    if not math.isfinite(value) or value <= 0:
        raise ValueError(f"Invalid media duration: {path}")
    return value


def timestamp(seconds):
    millis = round(seconds * 1000)
    hours, millis = divmod(millis, 3600000)
    minutes, millis = divmod(millis, 60000)
    secs, millis = divmod(millis, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def ingest(args, staging):
    paper = args.paper.resolve()
    if not paper.is_file():
        raise ValueError(f"Paper does not exist: {paper}")
    if paper.suffix.lower() == ".pdf":
        if importlib.util.find_spec("pypdf") is None:
            raise ValueError(
                "PDF ingestion needs pypdf in the selected Python environment."
            )
        from pypdf import PdfReader

        reader = PdfReader(paper)
        pages = [page.extract_text() or "" for page in reader.pages]
        title = str((reader.metadata or {}).get("/Title") or paper.stem)
    elif paper.suffix.lower() in {".md", ".txt"}:
        pages = [paper.read_text(encoding="utf-8")]
        title = paper.stem
    else:
        raise ValueError("Supply a PDF, Markdown, or text research paper.")
    if not any(page.strip() for page in pages):
        raise ValueError(
            "No readable text found. Use OCR or inspect the original PDF pages."
        )
    (staging / "paper.md").write_text(
        "\n\n".join(f"## Page {i}\n\n{text}" for i, text in enumerate(pages, 1)),
        encoding="utf-8",
    )
    rendered = []
    if paper.suffix.lower() == ".pdf" and shutil.which("pdftoppm"):
        (staging / "pages").mkdir()
        for page in range(1, min(args.preview_pages, len(pages)) + 1):
            prefix = staging / "pages" / f"page-{page:03d}"
            run(
                [
                    "pdftoppm",
                    "-f",
                    str(page),
                    "-l",
                    str(page),
                    "-scale-to",
                    "1600",
                    "-singlefile",
                    "-png",
                    str(paper),
                    str(prefix),
                ]
            )
            rendered.append({"pdf_page": page, "image": f"pages/page-{page:03d}.png"})
    manifest = {
        "source": str(paper),
        "title": title,
        "page_count": len(pages),
        "text": "paper.md",
        "preview_pages": rendered,
        "empty_pages": [i for i, text in enumerate(pages, 1) if not text.strip()],
        "limitations": [
            "Extracted text may lose equation symbols, tables, and reading order; inspect the original pages."
        ],
    }
    (staging / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    return {
        "manifest": str(args.output.resolve() / "manifest.json"),
        "pages": len(pages),
    }


def speak(text, stem, voice):
    text_file = stem.with_suffix(".txt")
    text_file.write_text(text, encoding="utf-8")
    if shutil.which("say"):
        audio = stem.with_suffix(".aiff")
        command = ["say", "-f", str(text_file), "-o", str(audio)]
    else:
        engine = shutil.which("espeak-ng") or shutil.which("espeak")
        if not engine:
            raise ValueError(
                "Supply audio for each beat, or install a local speech engine (say or espeak-ng)."
            )
        audio = stem.with_name(stem.name + "-speech").with_suffix(".wav")
        command = [engine, "-f", str(text_file), "-w", str(audio)]
    if voice:
        command += ["-v", voice]
    run(command)
    return audio


def load_project(path):
    project = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(project, dict):
        raise TypeError("The project must be a JSON object.")
    source = path.parent / project.get("source", "scenes.py")
    if not source.is_file() or source.suffix != ".py":
        raise ValueError("The project source must be an existing Manim Python file.")
    scenes = project.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        raise ValueError("The project needs a nonempty scenes array.")
    for scene in scenes:
        if not isinstance(scene, dict) or not re.fullmatch(
            r"[A-Za-z_]\w*", scene.get("name", "")
        ):
            raise ValueError("Each scene needs a valid Python class name.")
        beats = scene.get("beats")
        if not isinstance(beats, list) or not beats:
            raise ValueError(f"{scene['name']} needs at least one narration beat.")
        for beat in beats:
            if (
                not isinstance(beat, dict)
                or not isinstance(beat.get("text"), str)
                or not beat["text"].strip()
            ):
                raise ValueError("Each beat needs nonempty spoken text.")
            if beat.get("audio") and not (path.parent / beat["audio"]).is_file():
                raise ValueError(f"Missing supplied audio: {beat['audio']}")
    return project, source.resolve()


def render(args, staging):
    project_path = args.project.resolve()
    project, source = load_project(project_path)
    if importlib.util.find_spec("manim") is None:
        raise ValueError("Rendering needs Manim in the selected Python environment.")
    if not all(shutil.which(tool) for tool in ("ffmpeg", "ffprobe")):
        raise ValueError("Rendering needs ffmpeg and ffprobe on PATH.")
    assets = Path(__file__).resolve().parents[1] / "assets"
    scene_results, captions, caption_index, offset = [], [], 1, 0.0
    for i, scene in enumerate(project["scenes"], 1):
        work = staging / f"scene-{i:03d}"
        work.mkdir()
        lengths = []
        for j, beat in enumerate(scene["beats"], 1):
            stem = work / f"beat-{j:03d}"
            audio = (
                (project_path.parent / beat["audio"]).resolve()
                if beat.get("audio")
                else speak(beat["text"], stem, args.voice)
            )
            wav = stem.with_suffix(".wav")
            # Normalize supplied/generated audio and append reading time after each beat.
            run(
                [
                    "ffmpeg",
                    "-nostdin",
                    "-v",
                    "error",
                    "-i",
                    str(audio),
                    "-ar",
                    "48000",
                    "-ac",
                    "2",
                    "-af",
                    "apad=pad_dur=0.3",
                    "-c:a",
                    "pcm_s16le",
                    "-n",
                    str(wav),
                ]
            )
            lengths.append(duration(wav))
        concat = work / "audio.txt"
        concat.write_text(
            "\n".join(f"file 'beat-{j:03d}.wav'" for j in range(1, len(lengths) + 1)),
            encoding="utf-8",
        )
        narration = work / "narration.wav"
        run(
            [
                "ffmpeg",
                "-nostdin",
                "-v",
                "error",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(concat),
                "-c:a",
                "pcm_s16le",
                "-n",
                str(narration),
            ]
        )
        env = {
            **os.environ,
            "EXPLAIN_BEAT_DURATIONS": json.dumps(lengths),
            "PYTHONPATH": os.pathsep.join(
                [str(assets), str(source.parent), os.environ.get("PYTHONPATH", "")]
            ),
        }
        media = work / "media"
        run(
            [
                sys.executable,
                "-m",
                "manim",
                "render",
                "--disable_caching",
                "--progress_bar",
                "none",
                "--verbosity",
                "ERROR",
                "--format",
                "mp4",
                "--media_dir",
                str(media),
                "-q",
                args.quality,
                "-o",
                "animation.mp4",
                str(source),
                scene["name"],
            ],
            env=env,
            cwd=source.parent,
        )
        videos = [
            p
            for p in media.rglob("animation.mp4")
            if "partial_movie_files" not in p.parts
        ]
        if len(videos) != 1:
            raise ValueError(f"Expected one rendered movie for {scene['name']}.")
        expected = sum(lengths)
        if abs(duration(videos[0]) - expected) > 0.25:
            raise ValueError(
                f"{scene['name']} animation is not timed to narration. Use NarratedScene.beat once per spoken beat."
            )
        segment = staging / f"segment-{i:03d}.mp4"
        run(
            [
                "ffmpeg",
                "-nostdin",
                "-v",
                "error",
                "-i",
                str(videos[0]),
                "-i",
                str(narration),
                "-vf",
                "tpad=stop_mode=clone:stop_duration=0.3",
                "-t",
                str(expected),
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "aac",
                "-ar",
                "48000",
                "-ac",
                "2",
                "-n",
                str(segment),
            ]
        )
        beat_offset = offset
        for beat, length in zip(scene["beats"], lengths):
            caption = textwrap.fill(" ".join(beat["text"].split()), width=64)
            captions.append(
                f"{caption_index}\n{timestamp(beat_offset)} --> {timestamp(beat_offset + length - 0.3)}\n{caption}\n"
            )
            caption_index += 1
            beat_offset += length
        measured = duration(segment)
        scene_results.append(
            {
                "name": scene["name"],
                "start_seconds": offset,
                "duration_seconds": measured,
                "beat_durations": lengths,
                "references": scene.get("references", []),
            }
        )
        offset += measured
    concat = staging / "segments.txt"
    concat.write_text(
        "\n".join(
            f"file 'segment-{i:03d}.mp4'" for i in range(1, len(scene_results) + 1)
        ),
        encoding="utf-8",
    )
    video = staging / "explainer.mp4"
    run(
        [
            "ffmpeg",
            "-nostdin",
            "-v",
            "error",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat),
            "-c",
            "copy",
            "-movflags",
            "+faststart",
            "-n",
            str(video),
        ]
    )
    metadata = probe(video)
    if not {"audio", "video"}.issubset({s["codec_type"] for s in metadata["streams"]}):
        raise ValueError("The final movie must contain video and narration audio.")
    (staging / "explainer.srt").write_text("\n".join(captions), encoding="utf-8")
    manifest = {
        "title": project.get("title", "Explainer"),
        "project": str(project_path),
        "video": "explainer.mp4",
        "subtitles": "explainer.srt",
        "scenes": scene_results,
        "duration_seconds": duration(video),
        "speech": "supplied audio or local speech engine",
    }
    (staging / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    # Keep generated assets for review; the authored source remains beside project.json.
    return {
        "video": str(args.output.resolve() / "explainer.mp4"),
        "subtitles": str(args.output.resolve() / "explainer.srt"),
        "duration_seconds": manifest["duration_seconds"],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    commands = parser.add_subparsers(dest="command", required=True)
    paper = commands.add_parser("ingest", allow_abbrev=False)
    paper.add_argument("--paper", type=Path, required=True)
    paper.add_argument("--preview-pages", type=int, default=3)
    movie = commands.add_parser("render", allow_abbrev=False)
    movie.add_argument("--project", type=Path, required=True)
    movie.add_argument("--quality", choices=["l", "m", "h"], default="m")
    movie.add_argument("--voice")
    for command in (paper, movie):
        command.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    try:
        if output.exists() and (not output.is_dir() or any(output.iterdir())):
            raise ValueError(
                "Use a new or empty output directory; existing work is preserved."
            )
        if args.command == "ingest" and not 0 <= args.preview_pages <= 20:
            raise ValueError("--preview-pages must be between 0 and 20.")
        output.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(
            prefix=f".{output.name}-", dir=output.parent
        ) as temporary:
            staging = Path(temporary) / "result"
            staging.mkdir()
            result = (
                ingest(args, staging)
                if args.command == "ingest"
                else render(args, staging)
            )
            if output.exists():
                output.rmdir()
            staging.rename(output)
        print(json.dumps(result))
    except (OSError, ValueError, KeyError, TypeError, subprocess.TimeoutExpired) as exc:
        parser.exit(1, f"Error: {exc}\n")


if __name__ == "__main__":
    main()

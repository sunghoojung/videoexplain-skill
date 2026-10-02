#!/usr/bin/env python3
"""Extract page-indexed research paper text and preview images."""

import argparse
import importlib.util
import json
import shutil
import subprocess
import tempfile
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


def main():
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument("--paper", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--preview-pages", type=int, default=3)
    args = parser.parse_args()
    output = args.output.resolve()
    try:
        if output.exists() and (not output.is_dir() or any(output.iterdir())):
            raise ValueError(
                "Use a new or empty output directory; existing work is preserved."
            )
        if not 0 <= args.preview_pages <= 20:
            raise ValueError("--preview-pages must be between 0 and 20.")
        output.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(
            prefix=f".{output.name}-", dir=output.parent
        ) as temporary:
            staging = Path(temporary) / "result"
            staging.mkdir()
            result = ingest(args, staging)
            if output.exists():
                output.rmdir()
            staging.rename(output)
        print(json.dumps(result))
    except (OSError, ValueError, KeyError, TypeError, subprocess.TimeoutExpired) as exc:
        parser.exit(1, f"Error: {exc}\n")


if __name__ == "__main__":
    main()

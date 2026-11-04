"""Narration-synchronized Manim scenes for the explain-concept renderer.

Subclass ``ExplainerScene`` (or one of its camera variants) and wrap every
narration beat in ``with self.beat() as b:``. The renderer measures the spoken
narration first and passes each beat's length here. When the animations inside
a beat finish before the narration does, the scene holds the last frame until
the speech ends. When they run longer, the renderer pads that beat's audio with
silence, so a deliberate pause to let an idea sink in never cuts off speech.

Rendered directly with ``manim`` (no renderer timeline), beats are unconstrained,
which is handy for a quick ``manim -s -ql lesson.py SceneName`` still check.
"""

from __future__ import annotations

import json
import os
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass, field

from manim import MovingCameraScene, Scene, ThreeDScene, config

__all__ = [
    "Beat",
    "ExplainerMovingCameraScene",
    "ExplainerScene",
    "ExplainerThreeDScene",
]


@dataclass
class Beat:
    """One narration beat: its spoken text and how long the speech lasts."""

    index: int
    text: str
    seconds: float
    _scene: _Narrated = field(repr=False)
    _start: int = field(repr=False)

    @property
    def elapsed(self) -> float:
        """Seconds of video already spent inside this beat."""
        return (self._scene._frame_count() - self._start) / config.frame_rate

    @property
    def remaining(self) -> float:
        """Seconds of narration left in this beat (never negative).

        Use it to stretch the last animation of a beat across the rest of the
        sentence: ``self.play(Create(curve), run_time=max(1, b.remaining))``.
        """
        return max(0.0, self.seconds - self.elapsed)

    def wait_until(self, fraction: float) -> None:
        """Hold until ``fraction`` of the narration has been spoken.

        Speech runs at a roughly even pace, so ``b.wait_until(0.5)`` lands
        near the middle of the sentence. Use it to cue a highlight to the
        words that name it.
        """
        delay = fraction * self.seconds - self.elapsed
        if delay >= 1 / config.frame_rate:
            self._scene.wait(delay)


class _Narrated:
    """Mixin that ties Manim's frame clock to measured narration beats."""

    def setup(self) -> None:
        super().setup()
        self._beat_specs: list[dict] | None = None
        self._beat_log: list[dict] = []
        self._cursor = 0
        self._in_beat = False
        path = os.environ.get("EXPLAIN_TIMELINE")
        if not path:
            return
        with open(path, encoding="utf8") as handle:
            timeline = json.load(handle)
        name = type(self).__name__
        if name not in timeline["scenes"]:
            raise RuntimeError(f"{name} is not a scene in project.json.")
        if round(config.frame_rate) != timeline["fps"]:
            raise RuntimeError("Render at the renderer's frame rate.")
        self._beat_specs = timeline["scenes"][name]

    def _frame_count(self) -> int:
        return round(self.renderer.time * config.frame_rate)

    @contextmanager
    def beat(self) -> Iterator[Beat]:
        """Play the animations for the next narration beat inside this block."""
        name = type(self).__name__
        if self._in_beat:
            raise RuntimeError(f"{name}: beats cannot be nested.")
        index = len(self._beat_log)
        specs = self._beat_specs
        if specs is not None and index >= len(specs):
            raise RuntimeError(
                f"{name} opens more beats than the {len(specs)} narration "
                "beats in project.json. Add narration or merge the blocks."
            )
        start = self._frame_count()
        if start != self._cursor:
            raise RuntimeError(
                f"{name}: {start - self._cursor} frames were played outside "
                f"a beat before beat {index + 1}. Put every play/wait inside "
                "`with self.beat():`."
            )
        spec = specs[index] if specs is not None else {"text": "", "min_frames": 0}
        self._in_beat = True
        info = Beat(
            index=index,
            text=spec["text"],
            seconds=spec["min_frames"] / config.frame_rate,
            _scene=self,
            _start=start,
        )
        try:
            yield info
        finally:
            self._in_beat = False
        # Hold the final picture until the narration for this beat ends.
        target = start + spec["min_frames"]
        for _ in range(4):
            deficit = target - self._frame_count()
            if deficit <= 0:
                break
            self.wait(deficit / config.frame_rate)
        end = self._frame_count()
        self._cursor = end
        self._beat_log.append({"start_frame": start, "frames": end - start})

    def tear_down(self) -> None:
        super().tear_down()
        name = type(self).__name__
        if self._frame_count() != self._cursor:
            where = "after the last beat" if self._beat_log else "outside any beat"
            raise RuntimeError(
                f"{name}: animations were played {where}. "
                "Put every play/wait inside `with self.beat():`."
            )
        specs = self._beat_specs
        if specs is not None and len(self._beat_log) != len(specs):
            raise RuntimeError(
                f"{name} opened {len(self._beat_log)} beats, but project.json "
                f"gives it {len(specs)} narration beats. Use one "
                "`with self.beat():` block per narration beat."
            )
        log = os.environ.get("EXPLAIN_BEAT_LOG")
        if log:
            with open(log, "w", encoding="utf8") as handle:
                json.dump({"scene": name, "beats": self._beat_log}, handle)


class ExplainerScene(_Narrated, Scene):
    """A 2D scene with narration-synchronized beats."""


class ExplainerMovingCameraScene(_Narrated, MovingCameraScene):
    """A 2D scene whose camera frame can pan and zoom (``self.camera.frame``)."""


class ExplainerThreeDScene(_Narrated, ThreeDScene):
    """A 3D scene with narration-synchronized beats."""

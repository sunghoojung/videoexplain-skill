"""Base class for animations timed to measured narration beats."""

import json
import os

from manim import Scene


class NarratedScene(Scene):
    def setup(self):
        self.beat_durations = json.loads(os.environ["EXPLAIN_BEAT_DURATIONS"])
        self.beat_index = 0

    def beat(self, *animations, run_time=1.0):
        """Animate at the start of a spoken beat, then hold for its remainder."""
        if self.beat_index >= len(self.beat_durations):
            raise ValueError("The scene has more animation beats than narration beats.")
        duration = self.beat_durations[self.beat_index]
        self.beat_index += 1
        animated = min(run_time, duration) if animations else 0
        if animations:
            self.play(*animations, run_time=animated)
        remaining = sum(self.beat_durations[: self.beat_index]) - self.time
        if remaining > 0:
            self.wait(remaining)

    def tear_down(self):
        if self.beat_index != len(self.beat_durations):
            raise ValueError(
                "Every narration beat must have a corresponding animation beat."
            )

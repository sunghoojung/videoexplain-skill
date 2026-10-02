"""A runnable starting point; replace the mechanism and narration for each topic."""

from manim import (
    DOWN,
    LEFT,
    RIGHT,
    UP,
    Axes,
    Dot,
    FadeIn,
    FadeOut,
    Line,
    Text,
    ValueTracker,
    VGroup,
)
from narrated_scene import NarratedScene


class GradientDescent(NarratedScene):
    def construct(self):
        self.camera.background_color = "#101827"
        Text.set_default(font="Helvetica")
        title = Text("Gradient descent", font_size=40, color="#F8FAFC").to_edge(
            UP, buff=0.5
        )
        axes = (
            Axes(
                x_range=[-0.5, 3.5, 1],
                y_range=[0, 10, 2],
                x_length=7,
                y_length=4.5,
                axis_config={"include_tip": False, "color": "#64748B"},
            )
            .to_edge(LEFT, buff=0.8)
            .shift(DOWN * 0.3)
        )
        curve = axes.plot(lambda x: x * x, x_range=[0, 3.15], color="#38BDF8")
        function = (
            Text("f(x) = x²", font_size=24, color="#38BDF8")
            .next_to(axes, UP, buff=0.15)
            .align_to(axes, LEFT)
        )
        x_label = Text("x", font_size=24, color="#94A3B8").next_to(
            axes.x_axis, RIGHT, buff=0.15
        )
        position = ValueTracker(3)
        dot = Dot(axes.c2p(3, 9), radius=0.09, color="#FBBF24")
        dot.add_updater(
            lambda point: point.move_to(
                axes.c2p(position.get_value(), position.get_value() ** 2)
            )
        )
        label = Text(
            "x = 3\ny = 9", font_size=27, line_spacing=1.3, color="#FBBF24"
        ).to_edge(RIGHT, buff=0.8)
        self.beat(FadeIn(VGroup(title, axes, curve, function, x_label, dot, label)))
        tangent = Line(axes.c2p(2.4, 5.4), axes.c2p(3.12, 9.72), color="#FBBF24")
        self.add(tangent)
        next_label = Text(
            "x = 1.5\ny = 2.25", font_size=27, line_spacing=1.3, color="#FBBF24"
        ).move_to(label)
        self.beat(
            position.animate.set_value(1.5),
            FadeOut(label),
            FadeIn(next_label),
            run_time=1.8,
        )
        label = next_label
        self.remove(tangent)
        next_label = Text(
            "x = 0.75\ny = 0.5625", font_size=27, line_spacing=1.3, color="#FBBF24"
        ).move_to(label)
        self.beat(
            position.animate.set_value(0.75),
            FadeOut(label),
            FadeIn(next_label),
            run_time=1.8,
        )
        equation = Text(
            "x_next = x - α · f'(x)", font_size=30, color="#F8FAFC"
        ).to_edge(DOWN, buff=0.5)
        self.beat(FadeIn(equation))

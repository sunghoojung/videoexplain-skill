"""A runnable starting point; replace the mechanism and narration for each topic."""

from manim import (
    DOWN,
    LEFT,
    RIGHT,
    UP,
    Axes,
    DecimalNumber,
    Dot,
    FadeIn,
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
        x_value = DecimalNumber(
            3, mob_class=Text, num_decimal_places=2, font_size=27, color="#FBBF24"
        )
        y_value = DecimalNumber(
            9, mob_class=Text, num_decimal_places=4, font_size=27, color="#FBBF24"
        )
        label = (
            VGroup(
                VGroup(Text("x =", font_size=27, color="#FBBF24"), x_value).arrange(
                    RIGHT, buff=0.15
                ),
                VGroup(Text("y =", font_size=27, color="#FBBF24"), y_value).arrange(
                    RIGHT, buff=0.15
                ),
            )
            .arrange(DOWN, aligned_edge=LEFT, buff=0.35)
            .to_edge(RIGHT, buff=0.8)
        )
        x_value.add_updater(lambda number: number.set_value(position.get_value()))
        y_value.add_updater(lambda number: number.set_value(position.get_value() ** 2))
        self.beat(FadeIn(VGroup(title, axes, curve, function, x_label, dot, label)))
        tangent = Line(axes.c2p(2.4, 5.4), axes.c2p(3.12, 9.72), color="#FBBF24")
        self.add(tangent)
        self.beat(position.animate.set_value(1.5), run_time=1.8)
        self.remove(tangent)
        self.beat(position.animate.set_value(0.75), run_time=1.8)
        equation = Text(
            "x_next = x - α · f'(x)", font_size=30, color="#F8FAFC"
        ).to_edge(DOWN, buff=0.5)
        self.beat(FadeIn(equation))

"""How fast does a square grow? An intuition-first lesson on the derivative of x².

The viewer discovers the answer with real numbers first (a 3-by-3 square
nudged by 0.1). Symbols only arrive in the last scene, one at a time, each
replacing a plain-language phrase and color-linked to the piece of the
picture it names.
"""

from explain_kit import ExplainerMovingCameraScene, ExplainerScene
from manim import *

# One meaning per color, used in pictures, words, and symbols alike.
SIDE = BLUE
NUDGE = GREEN
STRIP = YELLOW
CORNER = RED

U = 1.4  # scene units per unit of length in the numeric scenes
BASE = np.array([-4.9, -2.85, 0.0])  # bottom-left corner of the square


def P(x, y, base=BASE, unit=U):
    return base + unit * np.array([x, y, 0.0])


def block(x0, y0, x1, y1, color, opacity, stroke=0, **kw):
    corners = [P(x0, y0, **kw), P(x1, y0, **kw), P(x1, y1, **kw), P(x0, y1, **kw)]
    return Polygon(*corners, stroke_color=color, stroke_width=stroke).set_fill(
        color, opacity
    )


def growing_square(side, nudge, gap, stroke=3, **kw):
    """The square plus the two strips and the corner a nudge adds."""
    s, h = side, nudge
    square = block(0, 0, s, s, SIDE, 0.3, stroke=stroke, **kw)
    top = block(0, s, s, s + h, STRIP, 0.9, **kw).shift(UP * gap)
    right = block(s, 0, s + h, s, STRIP, 0.9, **kw).shift(RIGHT * gap)
    corner = block(s, s, s + h, s + h, CORNER, 1, **kw).shift((UP + RIGHT) * gap)
    return VGroup(square, top, right, corner)


def live_square(side, nudge, gap, frame=None):
    # Strokes scale with a zooming camera; keep the outline thin on screen.
    zoom = (lambda: frame.width / config.frame_width) if frame else (lambda: 1)
    return always_redraw(
        lambda: growing_square(
            side.get_value(), nudge.get_value(), gap.get_value(), stroke=3 * zoom()
        )
    )


def side_braces(length, label_tex="3"):
    bottom = Brace(Line(P(0, 0), P(length, 0)), DOWN, buff=0.12)
    left = Brace(Line(P(0, 0), P(0, length)), LEFT, buff=0.12)
    return VGroup(
        bottom,
        MathTex(label_tex, color=SIDE).next_to(bottom, DOWN, 0.1),
        left,
        MathTex(label_tex, color=SIDE).next_to(left, LEFT, 0.1),
    )


class Puzzle(ExplainerScene):
    def construct(self):
        side, nudge, gap = ValueTracker(3), ValueTracker(0), ValueTracker(0)
        square = growing_square(3, 0, 0)[0]
        grid = VGroup(
            *[Line(P(i, 0), P(i, 3)) for i in (1, 2)],
            *[Line(P(0, j), P(3, j)) for j in (1, 2)],
        ).set_stroke(WHITE, 1.5, opacity=0.35)
        braces = side_braces(3)
        nine = MathTex("9", font_size=72).move_to(P(1.5, 1.5))

        with self.beat():
            self.play(Create(square), run_time=1.2)
            self.play(Create(grid), run_time=0.8)
            self.play(FadeIn(braces, shift=0.1 * UP), run_time=0.8)
            self.play(Write(nine), run_time=0.6)

        shape = live_square(side, nudge, gap)
        self.remove(square)
        self.add(shape, grid, nine)
        question = Tex("How much area did we add?", font_size=46).move_to(
            [3.4, 3.25, 0]
        )
        mark = MathTex("?", font_size=110).move_to([3.6, 1.0, 0])
        with self.beat() as b:
            grown = side_braces(3.1, r"3 + {{0.1}}")
            for k in (1, 3):
                grown[k].set_color_by_tex("0.1", NUDGE)
            self.play(
                nudge.animate.set_value(0.1),
                Transform(braces, grown),
                run_time=1.6,
            )
            self.play(FadeIn(question), run_time=0.6)
            self.play(Write(mark), run_time=0.6)
            # Leave a quiet moment after the question so the viewer can guess.
            self.wait(b.remaining + 1.5)

        with self.beat() as b:
            self.play(
                FadeOut(grid), FadeOut(nine), gap.animate.set_value(0.3), run_time=1.2
            )
            for piece, cue in ((1, 0.35), (2, 0.6), (3, 0.85)):
                b.wait_until(cue)
                self.play(
                    Circumscribe(shape[piece], color=WHITE, buff=0.06), run_time=0.8
                )

        top_label = MathTex("3", r"\times", "0.1", "=", "0.3", font_size=38)
        right_label = top_label.copy()
        corner_label = MathTex("0.1", r"\times", "0.1", "=", "0.01", font_size=38)
        for label in (top_label, right_label):
            label[0].set_color(SIDE)
            label[2].set_color(NUDGE)
            label[4].set_color(STRIP)
        corner_label[0].set_color(NUDGE)
        corner_label[2].set_color(NUDGE)
        corner_label[4].set_color(CORNER)
        top_label.next_to(shape[1], UP, 0.2)
        right_label.next_to(shape[2], RIGHT, 0.25)
        corner_label.move_to([1.6, 2.45, 0])
        pointer = Arrow(
            corner_label.get_left() + 0.1 * LEFT,
            shape[3].get_center(),
            buff=0.12,
            color=CORNER,
            stroke_width=3,
            max_tip_length_to_length_ratio=0.2,
        )
        with self.beat() as b:
            self.play(Write(top_label), run_time=1)
            b.wait_until(0.3)
            self.play(Write(right_label), run_time=1)
            b.wait_until(0.62)
            self.play(Write(corner_label), GrowArrow(pointer), run_time=1)

        total = MathTex("0.3", "+", "0.3", "+", "0.01", "=", "0.61", font_size=48)
        total[0].set_color(STRIP)
        total[2].set_color(STRIP)
        total[4].set_color(CORNER)
        total.move_to([3.6, 1.0, 0])
        with self.beat() as b:
            self.play(ReplacementTransform(mark, total), run_time=1.2)
            b.wait_until(0.55)
            strips = SurroundingRectangle(total[:3], color=STRIP, buff=0.12)
            self.play(
                Create(strips),
                total[3:5].animate.set_opacity(0.4),
                corner_label.animate.set_opacity(0.4),
                pointer.animate.set_opacity(0.4),
                run_time=1,
            )
            b.wait_until(0.9)
            self.play(
                FadeOut(VGroup(top_label, right_label, corner_label, pointer)),
                FadeOut(VGroup(question, total, strips)),
                Transform(braces, side_braces(3)),
                gap.animate.set_value(0),
                run_time=1.2,
            )


class Shrink(ExplainerMovingCameraScene):
    def construct(self):
        side, nudge, gap = ValueTracker(3), ValueTracker(0.1), ValueTracker(0)
        frame = self.camera.frame
        shape = live_square(side, nudge, gap, frame)
        braces = side_braces(3)
        self.add(shape, braces)

        columns = [0.75, 2.35, 4.0, 5.95]
        headers = VGroup(
            Tex("nudge", color=NUDGE),
            Tex("strips", color=STRIP),
            Tex("corner", color=CORNER),
            Tex("per nudge"),
        )
        for header, x in zip(headers, columns):
            header.scale(0.85).move_to([x, 2.7, 0])
        rule = Line([0.0, 2.35, 0], [6.95, 2.35, 0], stroke_width=2, color=GREY)
        rows_y = [1.75, 1.0, 0.25]
        data = [
            ("0.1", "0.6", "0.01", "6.1"),
            ("0.05", "0.3", "0.0025", "6.05"),
            ("0.01", "0.06", "0.0001", "6.01"),
        ]
        colors = [NUDGE, STRIP, CORNER, WHITE]
        cells = [
            [
                MathTex(value, color=color, font_size=40).move_to([x, y, 0])
                for value, color, x in zip(row, colors, columns)
            ]
            for row, y in zip(data, rows_y)
        ]

        with self.beat() as b:
            self.play(FadeIn(headers, shift=0.1 * DOWN), Create(rule), run_time=0.8)
            self.play(*[FadeIn(cell) for cell in cells[0][:3]], run_time=0.6)
            for row, value in ((1, 0.05), (2, 0.01)):
                self.play(nudge.animate.set_value(value), run_time=1.2)
                self.play(*[FadeIn(cell) for cell in cells[row][:3]], run_time=0.5)

        notes = VGroup(
            *[
                MathTex(text, color=color, font_size=30).next_to(
                    cells[2][col], DOWN, 0.25
                )
                for col, text, color in (
                    (0, r"\div 10", NUDGE),
                    (1, r"\div 10", STRIP),
                    (2, r"\div 100", CORNER),
                )
            ]
        )
        with self.beat() as b:
            self.play(FadeIn(notes[0]), FadeIn(notes[1]), run_time=0.8)
            b.wait_until(0.5)
            self.play(FadeIn(notes[2], scale=1.3), run_time=0.8)
            self.play(
                Circumscribe(VGroup(cells[0][2], cells[2][2]), color=CORNER), run_time=1
            )
            # Zoom in on the corner: the strips stay long while the corner is a speck.
            frame.save_state()
            self.play(frame.animate.scale(0.09).move_to(P(3.005, 3.005)), run_time=1.6)
            self.wait(0.8)
            self.play(Restore(frame), run_time=1.2)

        with self.beat() as b:
            self.play(nudge.animate.set_value(0.1), run_time=0.8)
            for row, cue in ((0, 0.45), (1, 0.62), (2, 0.8)):
                b.wait_until(cue)
                self.play(FadeIn(cells[row][3], shift=0.1 * LEFT), run_time=0.5)

        limit = MathTex(r"\to 6", font_size=44).next_to(cells[2][3], DOWN, 0.35)
        reason = MathTex("6", "=", "2", r"\times", "3", font_size=56).move_to(
            [3.5, -1.4, 0]
        )
        reason[2].set_color(STRIP)
        reason[4].set_color(SIDE)
        with self.beat() as b:
            self.play(FadeOut(notes), Write(limit), run_time=0.8)
            b.wait_until(0.45)
            self.play(Write(reason), run_time=1)
            self.play(
                Circumscribe(shape[1], color=STRIP, buff=0.06),
                Circumscribe(shape[2], color=STRIP, buff=0.06),
                Indicate(reason[2], color=STRIP),
                run_time=1,
            )
            self.play(
                Indicate(braces[1], color=SIDE),
                Indicate(braces[3], color=SIDE),
                Indicate(reason[4], color=SIDE),
                run_time=0.8,
            )

        live_braces = always_redraw(
            lambda: VGroup(*side_braces(side.get_value(), f"{side.get_value():.1f}"))
        )

        def layout():
            row = VGroup(
                Tex("per nudge"),
                MathTex(r"\approx 2 \times"),
                DecimalNumber(side.get_value(), num_decimal_places=1, color=SIDE),
                MathTex("="),
                DecimalNumber(2 * side.get_value(), num_decimal_places=1),
            ).arrange(RIGHT, buff=0.2)
            return row.scale(1.1).move_to([3.6, 1.0, 0])

        live_readout = always_redraw(layout)
        with self.beat() as b:
            self.play(
                FadeOut(
                    VGroup(
                        headers, rule, limit, reason, *[c for row in cells for c in row]
                    )
                ),
                run_time=0.8,
            )
            self.remove(braces)
            self.add(live_braces)
            self.play(FadeIn(live_readout), run_time=0.6)
            for value in (2.0, 3.6, 3.0):
                self.play(side.animate.set_value(value), run_time=1.4)

        strip_words = always_redraw(
            lambda: VGroup(
                Tex("side", color=SIDE, font_size=36).next_to(shape[1], UP, 0.15),
                Tex("side", color=SIDE, font_size=36).next_to(shape[2], RIGHT, 0.15),
            )
        )
        with self.beat() as b:
            self.play(FadeIn(strip_words), run_time=0.8)
            self.play(
                Circumscribe(shape[1], color=STRIP, buff=0.06),
                Circumscribe(shape[2], color=STRIP, buff=0.06),
                run_time=1,
            )
            b.wait_until(0.7)
            self.play(Indicate(live_readout[1], color=STRIP), run_time=0.9)


# The last scene is schematic: any side x, with the nudge drawn large enough to see.
B3 = np.array([-6.0, -2.6, 0.0])
U3 = 1.0


class NameIt(ExplainerScene):
    def construct(self):
        kw = {"base": B3, "unit": U3}
        s, h = 3.0, 0.4
        shape = growing_square(s, h, 0, **kw)
        bottom = Brace(Line(P(0, 0, **kw), P(s, 0, **kw)), DOWN, buff=0.12)
        side_word = Tex("side", color=SIDE).next_to(bottom, DOWN, 0.1)
        nudge_word = Tex("nudge", color=NUDGE, font_size=40).next_to(
            P(s + h, 0, **kw), DOWN + RIGHT, 0.15
        )
        nudge_tick = Line(
            P(s, -0.08, **kw), P(s + h, -0.08, **kw), color=NUDGE, stroke_width=6
        )
        self.add(shape)

        def words_row(pieces):
            return VGroup(*pieces).arrange(RIGHT, buff=0.28).move_to([2.4, 1.3, 0])

        new_area = Tex("new area", color=STRIP, font_size=52)
        divide = MathTex(r"\div", font_size=52)
        nudge = Tex("nudge", color=NUDGE, font_size=52)
        approx = MathTex(r"\approx", font_size=52)
        two = MathTex("2", font_size=52)
        times = MathTex(r"\times", font_size=52)
        side = Tex("side", color=SIDE, font_size=52)
        row = words_row([new_area, divide, nudge, approx, two, times, side])

        with self.beat() as b:
            self.play(
                FadeIn(bottom),
                FadeIn(side_word),
                Create(nudge_tick),
                FadeIn(nudge_word),
                run_time=1,
            )
            b.wait_until(0.4)
            self.play(
                Write(new_area),
                Circumscribe(VGroup(*shape[1:]), color=STRIP),
                run_time=1,
            )
            b.wait_until(0.58)
            self.play(
                Write(divide),
                Write(nudge),
                Indicate(nudge_word, color=NUDGE),
                run_time=1,
            )
            b.wait_until(0.78)
            self.play(
                Write(VGroup(approx, two, times, side)),
                Indicate(side_word, color=SIDE),
                run_time=1,
            )

        def swap(old, new, diagram_old=None, diagram_new=None):
            """Replace one word with its symbol, in the equation and the picture."""
            pieces = [new if piece is old else piece for piece in row]
            target = words_row([piece.copy() for piece in pieces])
            # A word and its symbol share no glyphs, so cross-fade between them.
            moves = [
                FadeTransform(old, target[i])
                if piece is new
                else piece.animate.move_to(target[i])
                for i, piece in enumerate(pieces)
            ]
            new.move_to(target[pieces.index(new)])
            if diagram_old is not None:
                moves.append(FadeTransform(diagram_old, diagram_new))
            self.play(*moves, run_time=1.4)
            self.remove(target[pieces.index(new)])
            self.add(new)
            row.submobjects = pieces

        x = MathTex("x", color=SIDE, font_size=60)
        x_label = MathTex("x", color=SIDE).next_to(bottom, DOWN, 0.1)
        with self.beat() as b:
            b.wait_until(0.5)
            swap(side, x, side_word, x_label)

        dx = MathTex("dx", color=NUDGE, font_size=60)
        dx_label = MathTex("dx", color=NUDGE).move_to(nudge_word)
        with self.beat() as b:
            b.wait_until(0.55)
            swap(nudge, dx, nudge_word, dx_label)

        dx2 = MathTex("d(x^2)", color=STRIP, font_size=60)
        with self.beat() as b:
            b.wait_until(0.4)
            swap(new_area, dx2)
            self.play(Circumscribe(VGroup(*shape[1:]), color=STRIP), run_time=1)

        final = MathTex(r"\frac{d(x^2)}{dx}", "=", "2", "x", font_size=72).move_to(
            [2.4, 1.1, 0]
        )
        fraction = final[0]
        fraction[0:5].set_color(STRIP)
        fraction[6:8].set_color(NUDGE)
        final[3].set_color(SIDE)
        name = Tex("the derivative", font_size=44)
        name_brace = Brace(final, DOWN, buff=0.2)
        name.next_to(name_brace, DOWN, 0.15)
        with self.beat() as b:
            b.wait_until(0.25)
            self.play(FadeOut(shape[3], scale=0.2), run_time=1)
            b.wait_until(0.5)
            # Each source is MathTex > part > glyphs; wrap targets to the same depth
            # so every glyph travels to its own place in the fraction.
            self.play(
                ReplacementTransform(dx2, VGroup(fraction[0:5])),
                ReplacementTransform(divide, VGroup(VGroup(fraction[5]))),
                ReplacementTransform(dx, VGroup(fraction[6:8])),
                ReplacementTransform(approx, VGroup(final[1])),
                ReplacementTransform(two, VGroup(final[2])),
                FadeOut(times),
                ReplacementTransform(x, VGroup(final[3])),
                run_time=1.6,
            )
            b.wait_until(0.85)
            self.play(
                GrowFromCenter(name_brace), FadeIn(name, shift=0.1 * UP), run_time=1
            )

        check = MathTex(
            "x",
            "=",
            "3",
            r"\quad\Rightarrow\quad",
            "2",
            r"\times",
            "3",
            "=",
            "6",
            font_size=52,
        )
        check[0].set_color(SIDE)
        check[2].set_color(SIDE)
        check[6].set_color(SIDE)
        check.move_to([2.4, -1.6, 0])
        with self.beat() as b:
            self.play(Write(check[:3]), run_time=0.8)
            self.play(Write(check[3:]), run_time=1.2)
            b.wait_until(0.7)
            self.play(
                Circumscribe(shape[1], color=STRIP, buff=0.06),
                Circumscribe(shape[2], color=STRIP, buff=0.06),
                run_time=1,
            )

        teaser = Tex("Your turn: grow a cube.", font_size=40)
        teaser.move_to([2.4, -2.85, 0])
        with self.beat() as b:
            self.play(
                shape[1].animate.set_fill(STRIP, 1),
                shape[2].animate.set_fill(STRIP, 1),
                Indicate(final[2:], color=STRIP),
                run_time=1.2,
            )
            b.wait_until(0.65)
            self.play(FadeIn(teaser, shift=0.1 * UP), run_time=1)

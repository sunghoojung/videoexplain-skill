import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const ink = "#f1f5f9",
  muted = "#94a3b8",
  blue = "#38bdf8",
  yellow = "#fbbf24";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };
const point = (x) => [56 + (x / 3.5) * 540, 326 - ((x * x) / 10) * 290];

const curve = Array.from({ length: 81 }, (_, i) => point((i / 80) * 3.2))
  .map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`)
  .join(" ");
const descriptions = [
  "Start with a guess",
  "Use the slope to take a step",
  "Repeat the same rule",
  "Understand the update",
];
const values = [
  "x = 3",
  "3 - 0.25 × 6 = 1.5",
  "1.5 - 0.25 × 3 = 0.75",
  "x_next = x - α · f′(x)",
];

export function GradientDescent({ beats }) {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  const index = beats.findLastIndex((beat) => frame >= beat.startFrame);
  const step = Math.max(index, 0);
  const progress = interpolate(
    frame - beats[step].startFrame,
    [0, Math.min(1.8 * fps, beats[step].durationInFrames - 1)],
    [0, 1],
    clamp,
  );
  const positions = [3, 1.5, 0.75, 0.75];
  const x = interpolate(
    progress,
    [0, 1],
    [positions[Math.max(step - 1, 0)], positions[step]],
  );
  const [px, py] = point(x);

  return (
    <AbsoluteFill
      style={{
        fontFamily: "Arial, sans-serif",
        color: ink,
        background:
          "radial-gradient(ellipse at 18% 30%, #14253b 0%, #0b1220 65%)",
      }}
    >
      <div
        style={{
          width: 1280,
          height: 720,
          transform: `scale(${width / 1280})`,
          transformOrigin: "top left",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 64,
            top: 30,
            color: blue,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 3,
          }}
        >
          OPTIMIZATION · A WORKED EXAMPLE
        </div>
        <div
          style={{
            position: "absolute",
            left: 64,
            top: 67,
            fontSize: 52,
            fontWeight: 700,
          }}
        >
          Gradient descent
        </div>
        <div
          style={{
            position: "absolute",
            left: 66,
            top: 135,
            fontSize: 24,
            color: muted,
          }}
        >
          Find a lower value by following the local slope.
        </div>

        <svg
          viewBox="0 0 660 360"
          style={{
            position: "absolute",
            left: 58,
            top: 174,
            width: 660,
            height: 360,
          }}
        >
          {[2, 4, 6, 8, 10].map((value) => (
            <g key={value}>
              <line
                x1="56"
                x2="606"
                y1={326 - value * 29}
                y2={326 - value * 29}
                stroke="#233449"
              />
              <text
                x="39"
                y={331 - value * 29}
                fill={muted}
                fontSize="15"
                textAnchor="end"
              >
                {value}
              </text>
            </g>
          ))}
          <path
            d="M56,26 V326 H615"
            fill="none"
            stroke="#607187"
            strokeWidth="2"
          />
          {[0, 1, 2, 3].map((value) => (
            <text
              key={value}
              x={point(value)[0]}
              y="350"
              fill={muted}
              fontSize="16"
              textAnchor="middle"
            >
              {value}
            </text>
          ))}
          <text x="619" y="330" fill={muted} fontSize="18">
            x
          </text>
          <text x="74" y="25" fill={blue} fontSize="20" fontWeight="700">
            f(x) = x²
          </text>
          <path d={curve} fill="none" stroke={blue} strokeWidth="4" />
          {step === 1 && (
            <line
              x1={point(2.4)[0]}
              y1={326 - 5.4 * 29}
              x2={point(3.12)[0]}
              y2={326 - 9.72 * 29}
              stroke={yellow}
              strokeWidth="3"
            />
          )}
          <line
            x1={px}
            x2={px}
            y1={py}
            y2="326"
            stroke={yellow}
            strokeDasharray="5 6"
            opacity="0.4"
          />
          <circle
            cx={px}
            cy={py}
            r="10"
            fill={yellow}
            stroke="#0b1220"
            strokeWidth="3"
          />
        </svg>

        <div
          style={{
            position: "absolute",
            left: 804,
            top: 198,
            width: 350,
            padding: 28,
            borderRadius: 20,
            border: "1px solid #2a3b50",
            background: "#101d2e",
          }}
        >
          <div
            style={{
              fontSize: 16,
              letterSpacing: 2,
              color: muted,
              marginBottom: 20,
            }}
          >
            STEP {step + 1} OF 4
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              height: 70,
              lineHeight: 1.2,
            }}
          >
            {descriptions[step]}
          </div>
          <div
            style={{
              fontSize: 38,
              color: yellow,
              fontVariantNumeric: "tabular-nums",
              marginTop: 16,
            }}
          >
            x = {x.toFixed(2)}
          </div>
          <div
            style={{
              fontSize: 28,
              color: muted,
              fontVariantNumeric: "tabular-nums",
              marginTop: 10,
            }}
          >
            f(x) = {(x * x).toFixed(4)}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            top: 550,
            left: 64,
            right: 64,
            fontSize: 29,
            fontWeight: 600,
            textAlign: "center",
            color: step === 3 ? ink : blue,
          }}
        >
          {values[step]}
        </div>
      </div>
    </AbsoluteFill>
  );
}

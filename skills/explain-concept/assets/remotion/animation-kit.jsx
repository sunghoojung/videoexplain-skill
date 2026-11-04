import React from "react";

export const palette = {
  background: "#090d16",
  ink: "#f0f3fa",
  muted: "#9caac1",
  grid: "#283449",
  first: "#63b3ff",
  second: "#ffd166",
  result: "#65ddb0",
};
export const identity = [
  [1, 0],
  [0, 1],
];
export const clamp01 = (value) => Math.max(0, Math.min(1, value));
export const smooth = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
export const mix = (a, b, t) => a + (b - a) * t;
export const mixPoint = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
export const add = (a, b) => a.map((v, i) => v + b[i]);
export const multiply = (v, scalar) => v.map((n) => n * scalar);
export const applyMatrix = (matrix, v) =>
  matrix.map((row) => row[0] * v[0] + row[1] * v[1]);
export const mixMatrix = (a, b, t) =>
  a.map((row, i) => row.map((v, j) => mix(v, b[i][j], t)));

// Fractions of a measured beat, not guessed wall-clock seconds.
export function beatProgress(frame, beat, from = 0.12, to = 0.72) {
  if (!beat || !(to > from))
    throw new Error("Use a beat and an increasing window.");
  const duration = Math.max(1, beat.durationInFrames - 1);
  return smooth(
    (frame - beat.startFrame - duration * from) / (duration * (to - from)),
  );
}

export function coordinateMap(origin, unit) {
  return ([x, y]) => [origin[0] + x * unit, origin[1] - y * unit];
}

export function polyline(points) {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
}

export function DrawPath({
  d,
  progress = 1,
  color = palette.ink,
  width = 3,
  ...props
}) {
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray="1"
      strokeDashoffset={1 - clamp01(progress)}
      opacity={progress > 0 ? 1 : 0}
      {...props}
    />
  );
}

export function Arrow({
  from,
  to,
  color = palette.ink,
  progress = 1,
  width = 4,
  opacity = 1,
  dashed = false,
}) {
  const end = mixPoint(from, to, clamp01(progress));
  const dx = end[0] - from[0],
    dy = end[1] - from[1];
  const length = Math.hypot(dx, dy);
  if (length < 0.1) return null;
  const ux = dx / length,
    uy = dy / length;
  const size = Math.min(13, length * 0.45);
  const base = [end[0] - ux * size, end[1] - uy * size];
  return (
    <g opacity={opacity}>
      <line
        x1={from[0]}
        y1={from[1]}
        x2={base[0]}
        y2={base[1]}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed ? "7 7" : undefined}
      />
      <polygon
        points={[
          end,
          [base[0] - uy * size * 0.45, base[1] + ux * size * 0.45],
          [base[0] + uy * size * 0.45, base[1] - ux * size * 0.45],
        ]
          .map((p) => p.join(","))
          .join(" ")}
        fill={color}
      />
    </g>
  );
}

export function PlaneGrid({
  matrix = identity,
  map,
  extent = 12,
  opacity = 1,
}) {
  const point = (v) => map(applyMatrix(matrix, v));
  return (
    <g opacity={opacity}>
      {Array.from({ length: extent * 2 + 1 }, (_, i) => i - extent).flatMap(
        (n) => {
          const axis = n === 0;
          return [
            [
              [n, -extent],
              [n, extent],
            ],
            [
              [-extent, n],
              [extent, n],
            ],
          ].map(([start, end], direction) => {
            const a = point(start),
              b = point(end);
            return (
              <line
                key={`${n}-${direction}`}
                x1={a[0]}
                y1={a[1]}
                x2={b[0]}
                y2={b[1]}
                stroke={axis ? palette.muted : palette.grid}
                strokeWidth={axis ? 1.8 : 1}
              />
            );
          });
        },
      )}
    </g>
  );
}

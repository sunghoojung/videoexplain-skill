import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import {
  Arrow,
  DrawPath,
  PlaneGrid,
  add,
  applyMatrix,
  beatProgress,
  coordinateMap,
  identity,
  mix,
  mixMatrix,
  mixPoint,
  multiply,
  palette as c,
  polyline,
} from "./animation-kit.jsx";

// One shared mathematical state drives geometry and displayed values.
const target = [
  [2, 1],
  [1, 2],
];
const input = [2, 1];
const origin = [335, 435];
const map = coordinateMap(origin, 62);
const square = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

function Label({ at, color = c.ink, children, size = 25, ...props }) {
  return (
    <text
      x={at[0]}
      y={at[1]}
      fill={color}
      fontSize={size}
      paintOrder="stroke"
      stroke={c.background}
      strokeWidth={7}
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </text>
  );
}

function Column({ at, values, color, opacity = 1 }) {
  return (
    <g transform={`translate(${at.join(" ")})`} opacity={opacity}>
      <text x={0} y={-23} fill={color} fontSize={31} textAnchor="middle">
        {values[0]}
      </text>
      <text x={0} y={23} fill={color} fontSize={31} textAnchor="middle">
        {values[1]}
      </text>
    </g>
  );
}

function Brackets({ x, y, width, height = 92, color = c.ink }) {
  return (
    <path
      d={`M${x + 9},${y} H${x} V${y + height} H${x + 9}
    M${x + width - 9},${y} H${x + width} V${y + height} H${x + width - 9}`}
      fill="none"
      stroke={color}
      strokeWidth={2}
    />
  );
}

export function LinearTransformation({ beats }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const scale = Math.min(width / 1280, height / 720);
  const step = Math.max(
    0,
    beats.findLastIndex((b) => frame >= b.startFrame),
  );
  const p = (index, from, to) => beatProgress(frame, beats[index], from, to);
  const build = p(0, 0.04, 0.48);
  const basis = p(1, 0.08, 0.55);
  const firstMove = p(2, 0.08, 0.36);
  const secondMove = p(2, 0.42, 0.72);
  // This interpolation has determinant 1 + 2t > 0 throughout.
  const transform = p(3, 0.32, 0.75);
  const matrix = mixMatrix(identity, target, transform);
  const e1 = mixPoint([1, 0], [2, 1], firstMove);
  const e2 = mixPoint([0, 1], [1, 2], secondMove);
  const v = applyMatrix(matrix, input);
  const vTip = map(v);
  const firstPart = multiply(e1, 2);
  const secondEnd = add(firstPart, e2);
  const twoCopies = p(4, 0.04, 0.37);
  const firstCopy = p(4, 0.04, 0.19);
  const secondCopy = p(4, 0.21, 0.37);
  const lastCopy = p(4, 0.4, 0.64);
  const equation = p(4, 0.7, 0.9);
  const area = p(5, 0.06, 0.48);
  const titles = [
    "What does a matrix do to an arrow?",
    "Coordinates count copies of two directions",
    "Record where those directions land",
    "Now move the whole plane",
    "The same combination, in new directions",
    "A unit square reveals the area scale",
  ];
  const currentSquare = square.map((v) => map(applyMatrix(matrix, v)));
  const squarePath = polyline([...currentSquare, currentSquare[0]]);
  const column1 = mixPoint(
    add(map([2, 1]), [105, 65]),
    [1000, 207],
    p(2, 0.72, 0.84),
  );
  // Route above the first column, then drop into place without crossing digits.
  const column2 = mixPoint(
    mixPoint(add(map([1, 2]), [-80, -45]), [1065, 112], p(2, 0.77, 0.88)),
    [1065, 207],
    p(2, 0.9, 0.96),
  );
  // Focus on area after holding the completed vector computation.
  const cameraScale = mix(1, 1.32, area);
  const cameraX = mix(0, -95, area);
  const cameraY = mix(0, -113, area);

  return (
    <AbsoluteFill
      style={{
        background: c.background,
        color: c.ink,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: 1280,
          height: 720,
          position: "absolute",
          left: (width - 1280 * scale) / 2,
          top: (height - 720 * scale) / 2,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <svg viewBox="0 0 1280 720" width={1280} height={720}>
          <defs>
            <clipPath id="diagram-clip">
              <rect x={60} y={130} width={800} height={405} />
            </clipPath>
          </defs>
          <text x={60} y={48} fill={c.muted} fontSize={17} letterSpacing={2}>
            LINEAR ALGEBRA / A VISUAL ARGUMENT
          </text>
          <text x={60} y={94} fill={c.ink} fontSize={36}>
            {titles[step]}
          </text>

          <g clipPath="url(#diagram-clip)">
            <g
              transform={`translate(${cameraX} ${cameraY}) scale(${cameraScale})`}
            >
              {transform > 0 && <PlaneGrid map={map} opacity={0.22} />}
              <PlaneGrid
                map={map}
                matrix={matrix}
                opacity={mix(0.65, 0.5, area)}
              />
              {step >= 3 && (
                <>
                  <polygon
                    points={currentSquare.map((v) => v.join(",")).join(" ")}
                    fill={c.result}
                    fillOpacity={mix(0.08, 0.28, area)}
                  />
                  <DrawPath
                    d={squarePath}
                    progress={p(3, 0.08, 0.27)}
                    color={c.result}
                    width={mix(2, 4, area)}
                  />
                </>
              )}
              {step >= 3 && (
                <Arrow
                  from={origin}
                  to={map(input)}
                  color={c.result}
                  opacity={0.3 * (1 - area)}
                  dashed
                />
              )}
              <Arrow
                from={origin}
                to={vTip}
                color={c.result}
                progress={build}
                width={5}
                opacity={mix(step === 1 || step === 2 ? 0.3 : 1, 0.23, area)}
              />

              {/* Decompose the input before introducing matrix notation. */}
              <g opacity={step === 0 || step === 1 ? 1 : 0}>
                <Arrow
                  from={origin}
                  to={map([1, 0])}
                  color={c.first}
                  progress={p(0, 0.5, 0.64)}
                />
                <Arrow
                  from={map([1, 0])}
                  to={map([2, 0])}
                  color={c.first}
                  progress={p(0, 0.65, 0.79)}
                />
                <Arrow
                  from={map([2, 0])}
                  to={map(input)}
                  color={c.second}
                  progress={p(0, 0.8, 0.95)}
                />
                <Label
                  at={map([1, -0.48])}
                  color={c.first}
                  textAnchor="middle"
                  opacity={p(0, 0.5, 0.64) * (1 - p(1, 0.06, 0.2))}
                >
                  2 across
                </Label>
                <Label
                  at={map([2.25, 0.45])}
                  color={c.second}
                  opacity={p(0, 0.8, 0.95) * (1 - p(1, 0.06, 0.2))}
                >
                  1 up
                </Label>
              </g>

              {/* Source directions remain visible while their targets are probed. */}
              {step >= 2 && (
                <g opacity={mix(0.35, 0, transform)}>
                  <Arrow
                    from={origin}
                    to={map([1, 0])}
                    color={c.first}
                    dashed
                  />
                  <Arrow
                    from={origin}
                    to={map([0, 1])}
                    color={c.second}
                    dashed
                  />
                </g>
              )}
              <Arrow
                from={origin}
                to={map(e1)}
                color={c.first}
                progress={basis}
              />
              <Arrow
                from={origin}
                to={map(e2)}
                color={c.second}
                progress={basis}
              />
              <g opacity={basis}>
                <Label at={add(map(e1), [13, 22])} color={c.first} size={23}>
                  {firstMove > 0 ? "Ae₁" : "e₁"}
                </Label>
                <Label at={add(map(e2), [-34, -18])} color={c.second} size={23}>
                  {secondMove > 0 ? "Ae₂" : "e₂"}
                </Label>
              </g>
              {step >= 4 && (
                <g opacity={1 - area}>
                  <Arrow
                    from={origin}
                    to={map(e1)}
                    color={c.first}
                    progress={firstCopy}
                    width={6}
                  />
                  <Arrow
                    from={map(e1)}
                    to={map(firstPart)}
                    color={c.first}
                    progress={secondCopy}
                    width={6}
                  />
                  <Arrow
                    from={map(firstPart)}
                    to={map(secondEnd)}
                    color={c.second}
                    progress={lastCopy}
                    width={6}
                  />
                  <Label
                    at={add(map(firstPart), [20, 30])}
                    color={c.first}
                    opacity={twoCopies}
                  >
                    2 × (2, 1)
                  </Label>
                  <Label
                    at={add(map(secondEnd), [18, 36])}
                    color={c.second}
                    opacity={lastCopy}
                  >
                    + (1, 2)
                  </Label>
                </g>
              )}
              <Label
                at={add(vTip, [18, -16])}
                color={c.result}
                opacity={
                  p(0, 0.48, 0.6) * (step === 5 ? 0 : step === 2 ? 0.3 : 1)
                }
              >
                {transform === 0
                  ? "v = (2, 1)"
                  : transform === 1
                    ? "Av = (5, 4)"
                    : "Av"}
              </Label>
              <circle cx={origin[0]} cy={origin[1]} r={4} fill={c.ink} />
              <Label at={add(origin, [-17, 24])} color={c.muted} size={19}>
                0
              </Label>
              <Label
                at={map([1.5, 1.35])}
                color={c.result}
                opacity={area}
                size={24}
                textAnchor="middle"
              >
                area = 3
              </Label>
            </g>
          </g>

          {/* Destination coordinates travel into the corresponding columns. */}
          {step >= 2 && (
            <>
              <text
                x={920}
                y={150}
                fill={c.muted}
                fontSize={23}
                opacity={p(2, 0.96, 1)}
              >
                Basis destinations
              </text>
              <text
                x={902}
                y={217}
                fill={c.ink}
                fontSize={36}
                opacity={p(2, 0.96, 1)}
              >
                A =
              </text>
              <g opacity={p(2, 0.96, 1)}>
                <Brackets x={966} y={161} width={135} />
              </g>
              <Column
                at={column1}
                values={[2, 1]}
                color={c.first}
                opacity={p(2, 0.36, 0.4)}
              />
              <Column
                at={column2}
                values={[1, 2]}
                color={c.second}
                opacity={p(2, 0.72, 0.74)}
              />
            </>
          )}

          {step === 3 && (
            <g opacity={1 - transform}>
              <text x={918} y={338} fill={c.result} fontSize={27}>
                Where will (2, 1)
              </text>
              <text x={918} y={374} fill={c.result} fontSize={27}>
                land?
              </text>
            </g>
          )}

          {step === 4 && (
            <g opacity={equation}>
              <text x={920} y={325} fill={c.muted} fontSize={23}>
                Add the contributions
              </text>
              <text x={920} y={370} fontSize={28} fill={c.first}>
                2 × 2
              </text>
              <text x={999} y={370} fontSize={28} fill={c.second}>
                + 1
              </text>
              <text x={1063} y={370} fontSize={28} fill={c.result}>
                = 5
              </text>
              <text x={920} y={415} fontSize={28} fill={c.first}>
                2 × 1
              </text>
              <text x={999} y={415} fontSize={28} fill={c.second}>
                + 2
              </text>
              <text x={1063} y={415} fontSize={28} fill={c.result}>
                = 4
              </text>
            </g>
          )}

          {step === 5 && (
            <g opacity={area}>
              <text x={920} y={325} fill={c.muted} fontSize={23}>
                Signed area scale
              </text>
              <text x={920} y={372} fill={c.ink} fontSize={27}>
                det A = 2 × 2 - 1 × 1
              </text>
              <text x={920} y={428} fill={c.result} fontSize={46}>
                = 3
              </text>
            </g>
          )}

          <g opacity={step >= 4 ? equation : basis}>
            <text x={60} y={568} fill={c.ink} fontSize={28}>
              {step < 4 ? "v = " : "Av = "}
              <tspan fill={c.first}>{step < 4 ? "2 e₁" : "2 (Ae₁)"}</tspan>
              <tspan> + </tspan>
              <tspan fill={c.second}>{step < 4 ? "e₂" : "Ae₂"}</tspan>
              {step >= 4 && <tspan fill={c.result}> = (5, 4)</tspan>}
            </text>
            {step === 5 && (
              <text x={750} y={568} fill={c.muted} fontSize={23}>
                Origin fixed. Parallel lines stay parallel.
              </text>
            )}
          </g>
        </svg>
      </div>
    </AbsoluteFill>
  );
}

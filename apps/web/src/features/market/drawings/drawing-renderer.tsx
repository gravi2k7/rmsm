"use client";

import type { Drawing, DrawingPoint } from "./types";
import {
  forecastEnd,
  measurement,
  patternSegments,
  projectionEnd,
} from "./tools/patterns-measuring";
import {
  fibonacciExtensionLevels,
  fibonacciProjectionLevels,
  fibonacciRetracementLevels,
  fibonacciTimeLevels,
} from "./tools/fibonacci";

interface DrawingRendererProps {
  drawings: Drawing[];
  width: number;
  height: number;
  timeToX: (time: number) => number | null;
  priceToY: (price: number) => number | null;
  timezone: string;
  pricePrecision: number;
  selectedDrawingId: string | null;
}

function pointToScreen(
  point: DrawingPoint,
  timeToX: DrawingRendererProps["timeToX"],
  priceToY: DrawingRendererProps["priceToY"],
) {
  const x = timeToX(point.time);
  const y = priceToY(point.price);

  if (x === null || y === null) {
    return null;
  }

  return { x, y };
}

function lineAcrossViewport(
  start: { x: number; y: number },
  end: { x: number; y: number },
  width: number,
  height: number,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.abs(dx) < 0.0001) {
    return [
      { x: start.x, y: 0 },
      { x: start.x, y: height },
    ] as const;
  }

  const slope = dy / dx;

  const yAtX = (x: number) =>
    start.y + slope * (x - start.x);

  const candidates = [
    { x: 0, y: yAtX(0) },
    { x: width, y: yAtX(width) },
  ];

  const xAtY = (y: number) =>
    start.x + (y - start.y) / slope;

  if (Math.abs(slope) > 0.0001) {
    candidates.push(
      { x: xAtY(0), y: 0 },
      { x: xAtY(height), y: height },
    );
  }

  const visible = candidates.filter(
    (point) =>
      point.x >= -0.001 &&
      point.x <= width + 0.001 &&
      point.y >= -0.001 &&
      point.y <= height + 0.001,
  );

  if (visible.length >= 2) {
    return [visible[0]!, visible[1]!] as const;
  }

  return [
    { x: start.x, y: start.y },
    { x: end.x, y: end.y },
  ] as const;
}

function channelLines(
  points: Array<{ x: number; y: number }>,
  width: number,
  height: number,
) {
  if (points.length < 3) {
    return null;
  }

  const start = points[0]!;
  const end = points[1]!;
  const offsetPoint = points[2]!;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared < 0.0001) {
    return null;
  }

  const projection =
    ((offsetPoint.x - start.x) * dx +
      (offsetPoint.y - start.y) * dy) /
    lengthSquared;

  const projected = {
    x: start.x + projection * dx,
    y: start.y + projection * dy,
  };

  const offset = {
    x: offsetPoint.x - projected.x,
    y: offsetPoint.y - projected.y,
  };

  const parallelStart = {
    x: start.x + offset.x,
    y: start.y + offset.y,
  };

  const parallelEnd = {
    x: end.x + offset.x,
    y: end.y + offset.y,
  };

  return {
    base: lineAcrossViewport(
      start,
      end,
      width,
      height,
    ),
    parallel: lineAcrossViewport(
      parallelStart,
      parallelEnd,
      width,
      height,
    ),
  };
}

function fibonacciPriceLines(
  drawing: Drawing,
  points: Array<{ x: number; y: number }>,
  width: number,
  priceToY: (price: number) => number | null,
) {
  if (
    (drawing.type === "FIB_RETRACEMENT" &&
      drawing.points.length < 2) ||
    (drawing.type !== "FIB_RETRACEMENT" &&
      drawing.points.length < 3)
  ) {
    return [];
  }

  const levels =
    drawing.type === "FIB_RETRACEMENT"
      ? fibonacciRetracementLevels(
          drawing.points[0]!,
          drawing.points[1]!,
        )
      : drawing.type === "FIB_EXTENSION"
        ? fibonacciExtensionLevels(
            drawing.points[0]!,
            drawing.points[1]!,
            drawing.points[2]!,
          )
        : fibonacciProjectionLevels(
            drawing.points[0]!,
            drawing.points[1]!,
            drawing.points[2]!,
          );

  const startX = Math.min(
    ...points.map((point) => point.x),
  );
  const endX = Math.max(
    width,
    ...points.map((point) => point.x),
  );

  return levels
    .map((level) => {
      if (level.price === undefined) {
        return null;
      }

      const y = priceToY(level.price);

      if (y === null) {
        return null;
      }

      return {
        ...level,
        x1: startX,
        x2: endX,
        y,
      };
    })
    .filter(
      (
        level,
      ): level is {
        ratio: number;
        price: number;
        label: string;
        x1: number;
        x2: number;
        y: number;
      } => level !== null,
    );
}

function fibonacciTimeLines(
  drawing: Drawing,
  points: Array<{ x: number; y: number }>,
  height: number,
  timeToX: (time: number) => number | null,
) {
  if (
    drawing.type !== "FIB_TIME" ||
    drawing.points.length < 2
  ) {
    return [];
  }

  const levels = fibonacciTimeLevels(
    drawing.points[0]!,
    drawing.points[1]!,
  );

  return levels
    .map((level) => {
      if (level.time === undefined) {
        return null;
      }

      const x = timeToX(level.time);

      if (x === null) {
        return null;
      }

      return {
        ...level,
        x,
        y1: 0,
        y2: height,
      };
    })
    .filter(
      (
        level,
      ): level is {
        ratio: number;
        time: number;
        label: string;
        x: number;
        y1: number;
        y2: number;
      } => level !== null,
    );
}

function strokeDasharray(
  lineStyle: Drawing["style"]["lineStyle"],
) {
  switch (lineStyle) {
    case "dashed":
      return "8 5";
    case "dotted":
      return "2 4";
    case "solid":
    default:
      return undefined;
  }
}

function lineEndForRay(
  start: { x: number; y: number },
  end: { x: number; y: number },
  width: number,
  height: number,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.abs(dx) < 0.0001) {
    return {
      x: end.x,
      y: dy >= 0 ? height : 0,
    };
  }

  const scale =
    dx > 0
      ? (width - start.x) / dx
      : -start.x / dx;

  const x = start.x + dx * Math.max(1, scale);
  const y = start.y + dy * Math.max(1, scale);

  return {
    x: Math.max(-width, Math.min(width * 2, x)),
    y: Math.max(-height, Math.min(height * 2, y)),
  };
}

function SelectionHandles({
  points,
}: {
  points: Array<{ x: number; y: number }>;
}) {
  return (
    <g
      data-testid="drawing-selection-handles"
      pointerEvents="none"
    >
      {points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={4}
          fill="hsl(var(--background))"
          stroke="currentColor"
          strokeWidth={1.5}
        />
      ))}
    </g>
  );
}

function formatDrawingPrice(
  price: number,
  precision: number,
): string {
  return price.toFixed(precision);
}

function parseDrawingUtcOffsetMinutes(
  timezone: string,
): number | null {
  if (timezone === "Etc/UTC") {
    return 0;
  }

  const match = /^UTC([+-])(\\d{1,2})(?::(\\d{2}))?$/.exec(
    timezone,
  );

  if (!match) {
    return null;
  }

  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours > 14 ||
    minutes >= 60
  ) {
    return null;
  }

  const total = hours * 60 + minutes;

  return match[1] === "+" ? total : -total;
}

function formatDrawingTime(
  time: number,
  timezone: string,
): string {
  try {
    const offsetMinutes =
      parseDrawingUtcOffsetMinutes(timezone);

    if (offsetMinutes !== null) {
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Etc/UTC",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(
        new Date((time + offsetMinutes * 60) * 1000),
      );
    }

    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(time * 1000));
  } catch {
    return new Date(time * 1000)
      .toISOString()
      .slice(0, 16)
      .replace("T", " ");
  }
}

function DrawingEdgeLabel({
  x,
  y,
  text,
  anchor = "middle",
  color,
}: {
  x: number;
  y: number;
  text: string;
  anchor?: "start" | "middle" | "end";
  color?: string;
}) {
  const paddingX = 6;
  const labelHeight = 18;
  const approximateWidth = Math.max(
    38,
    text.length * 6.2 + paddingX * 2,
  );

  let rectX = x - approximateWidth / 2;

  if (anchor === "start") {
    rectX = x;
  } else if (anchor === "end") {
    rectX = x - approximateWidth;
  }

  return (
    <g pointerEvents="none">
      <rect
        x={rectX}
        y={y - labelHeight / 2}
        width={approximateWidth}
        height={labelHeight}
        rx={2}
        fill={color ?? "hsl(var(--popover))"}
        stroke={color ?? "hsl(var(--border))"}
        strokeWidth={0.75}
        opacity={0.96}
      />
      <text
        x={
          anchor === "start"
            ? rectX + paddingX
            : anchor === "end"
              ? rectX + approximateWidth - paddingX
              : x
        }
        y={y + 3.5}
        textAnchor={anchor}
        fontSize={10}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontWeight={500}
        fill="#ffffff"
      >
        {text}
      </text>
    </g>
  );
}

export function DrawingRenderer({
  drawings,
  width,
  height,
  timeToX,
  priceToY,
  timezone,
  pricePrecision,
  selectedDrawingId,
}: DrawingRendererProps) {
  return (
    <svg
      data-testid="drawing-renderer"
      width={width}
      height={height}
      className="pointer-events-none absolute inset-0 z-20"
      aria-hidden="true"
    >
      <defs>
        <marker
          id="rmsm-drawing-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
        </marker>
      </defs>

      {drawings
        .filter((drawing) => drawing.visible && drawing.points.length > 0)
        .map((drawing) => {
          const points = drawing.points
            .map((point) =>
              pointToScreen(point, timeToX, priceToY),
            )
            .filter(
              (
                point,
              ): point is { x: number; y: number } =>
                point !== null,
            );

          if (points.length === 0) {
            return null;
          }

          const strokeWidth = drawing.style.width;

          const stroke = drawing.style.color;

          if (drawing.type === "HORIZONTAL_LINE") {
            return (
              <g key={drawing.id}>
                <line
                  x1={0}
                  y1={points[0]!.y}
                  x2={width}
                  y2={points[0]!.y}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  opacity={drawing.style.opacity}
                  strokeDasharray={strokeDasharray(
                    drawing.style.lineStyle,
                  )}
                />

                <DrawingEdgeLabel
                  x={width - 2}
                  y={points[0]!.y}
                  text={formatDrawingPrice(
                    drawing.points[0]!.price,
                    pricePrecision,
                  )}
                  anchor="end"
                  color={stroke}
                />
              </g>
            );
          }

          if (drawing.type === "VERTICAL_LINE") {
            return (
              <g key={drawing.id}>
                <line
                  x1={points[0]!.x}
                  y1={0}
                  x2={points[0]!.x}
                  y2={height}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  opacity={drawing.style.opacity}
                  strokeDasharray={strokeDasharray(
                    drawing.style.lineStyle,
                  )}
                />

                <DrawingEdgeLabel
                  x={points[0]!.x}
                  y={height - 10}
                  text={formatDrawingTime(
                    drawing.points[0]!.time,
                    timezone,
                  )}
                  color={stroke}
                />
              </g>
            );
          }

          if (
            drawing.type === "TREND_LINE" ||
            drawing.type === "ARROW"
          ) {
            if (points.length < 2) {
              return null;
            }

            return (
              <line
                key={drawing.id}
                x1={points[0]!.x}
                y1={points[0]!.y}
                x2={points[1]!.x}
                y2={points[1]!.y}
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={drawing.style.opacity}
                markerEnd={
                  drawing.type === "ARROW"
                    ? "url(#rmsm-drawing-arrow)"
                    : undefined
                }
              />
            );
          }

          if (
            drawing.type === "PARALLEL_CHANNEL" ||
            drawing.type === "PRICE_CHANNEL" ||
            drawing.type === "REGRESSION_CHANNEL"
          ) {
            const lines = channelLines(
              points,
              width,
              height,
            );

            if (!lines) {
              return null;
            }

            return (
              <g key={drawing.id}>
                <line
                  x1={lines.base[0].x}
                  y1={lines.base[0].y}
                  x2={lines.base[1].x}
                  y2={lines.base[1].y}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  opacity={drawing.style.opacity}
                />
                <line
                  x1={lines.parallel[0].x}
                  y1={lines.parallel[0].y}
                  x2={lines.parallel[1].x}
                  y2={lines.parallel[1].y}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  opacity={drawing.style.opacity}
                />
              </g>
            );
          }

          if (
            drawing.type === "FIB_RETRACEMENT" ||
            drawing.type === "FIB_EXTENSION" ||
            drawing.type === "FIB_PROJECTION"
          ) {
            const levels = fibonacciPriceLines(
              drawing,
              points,
              width,
              priceToY,
            );

            return (
              <g key={drawing.id}>
                {levels.map((level) => (
                  <g key={`${drawing.id}-${level.ratio}`}>
                    <line
                      x1={level.x1}
                      y1={level.y}
                      x2={level.x2}
                      y2={level.y}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      opacity={drawing.style.opacity}
                      strokeDasharray={strokeDasharray(
                        drawing.style.lineStyle,
                      )}
                    />
                    <text
                      x={level.x1 + 4}
                      y={level.y - 4}
                      fill={stroke}
                      fontSize={11}
                      opacity={drawing.style.opacity}
                    >
                      {level.label}
                    </text>
                  </g>
                ))}
              </g>
            );
          }

          if (drawing.type === "FIB_TIME") {
            const levels = fibonacciTimeLines(
              drawing,
              points,
              height,
              timeToX,
            );

            return (
              <g key={drawing.id}>
                {levels.map((level) => (
                  <g key={`${drawing.id}-${level.ratio}`}>
                    <line
                      x1={level.x}
                      y1={level.y1}
                      x2={level.x}
                      y2={level.y2}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      opacity={drawing.style.opacity}
                      strokeDasharray={strokeDasharray(
                        drawing.style.lineStyle,
                      )}
                    />
                    <text
                      x={level.x + 4}
                      y={16}
                      fill={stroke}
                      fontSize={11}
                      opacity={drawing.style.opacity}
                    >
                      {level.label}
                    </text>
                  </g>
                ))}
              </g>
            );
          }

          if (drawing.type === "RAY") {
            if (points.length < 2) {
              return null;
            }

            const end = lineEndForRay(
              points[0]!,
              points[1]!,
              width,
              height,
            );

            return (
              <line
                key={drawing.id}
                x1={points[0]!.x}
                y1={points[0]!.y}
                x2={end.x}
                y2={end.y}
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={drawing.style.opacity}
                strokeDasharray={strokeDasharray(
                  drawing.style.lineStyle,
                )}
              />
            );
          }

          if (drawing.type === "RECTANGLE") {
            if (points.length < 2) {
              return null;
            }

            const left = Math.min(
              points[0]!.x,
              points[1]!.x,
            );
            const top = Math.min(
              points[0]!.y,
              points[1]!.y,
            );
            const rectWidth = Math.abs(
              points[1]!.x - points[0]!.x,
            );
            const rectHeight = Math.abs(
              points[1]!.y - points[0]!.y,
            );

            return (
              <rect
                key={drawing.id}
                x={left}
                y={top}
                width={rectWidth}
                height={rectHeight}
                fill={drawing.style.fillColor ?? stroke}
                fillOpacity={
                  drawing.style.fillOpacity ?? 0.15
                }
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={drawing.style.opacity}
                strokeDasharray={strokeDasharray(
                  drawing.style.lineStyle,
                )}
              />
            );
          }

          if (
            drawing.type === "ABCD" ||
            drawing.type === "XABCD" ||
            drawing.type === "HEAD_SHOULDERS" ||
            drawing.type === "TRIANGLE" ||
            drawing.type === "WEDGE"
          ) {
            const segments = patternSegments(
              drawing.type,
              drawing.points,
            );

            return (
              <g key={drawing.id}>
                {segments.map((segment, index) => {
                  const start = pointToScreen(
                    segment.start,
                    timeToX,
                    priceToY,
                  );
                  const end = pointToScreen(
                    segment.end,
                    timeToX,
                    priceToY,
                  );

                  if (!start || !end) {
                    return null;
                  }

                  return (
                    <line
                      key={`${drawing.id}-${index}`}
                      x1={start.x}
                      y1={start.y}
                      x2={end.x}
                      y2={end.y}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      opacity={drawing.style.opacity}
                    />
                  );
                })}
              </g>
            );
          }

          if (
            drawing.type === "FORECAST" ||
            drawing.type === "PROJECTION"
          ) {
            const endpoint =
              drawing.type === "FORECAST"
                ? forecastEnd(drawing.points)
                : projectionEnd(drawing.points);

            if (
              !endpoint ||
              drawing.points.length < 2
            ) {
              return null;
            }

            const start = pointToScreen(
              drawing.points[0]!,
              timeToX,
              priceToY,
            );
            const end = pointToScreen(
              endpoint,
              timeToX,
              priceToY,
            );

            if (!start || !end) {
              return null;
            }

            return (
              <line
                key={drawing.id}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={drawing.style.opacity}
                strokeDasharray={strokeDasharray(
                  drawing.style.lineStyle,
                )}
              />
            );
          }

          if (
            drawing.type === "MEASURE_PRICE" ||
            drawing.type === "MEASURE_TIME" ||
            drawing.type === "MEASURE_PRICE_TIME" ||
            drawing.type === "MEASURE_RANGE"
          ) {
            if (drawing.points.length < 2) {
              return null;
            }

            const start = pointToScreen(
              drawing.points[0]!,
              timeToX,
              priceToY,
            );
            const end = pointToScreen(
              drawing.points[1]!,
              timeToX,
              priceToY,
            );

            if (!start || !end) {
              return null;
            }

            const result = measurement(
              drawing.points[0]!,
              drawing.points[1]!,
            );

            const label =
              drawing.type === "MEASURE_PRICE"
                ? `ΔP ${formatDrawingPrice(result.priceDelta, pricePrecision)}`
                : drawing.type === "MEASURE_TIME"
                  ? `ΔT ${result.timeDelta}`
                  : drawing.type === "MEASURE_RANGE"
                    ? `Range ${formatDrawingPrice(result.priceRange, pricePrecision)}`
                    : `ΔP ${formatDrawingPrice(result.priceDelta, pricePrecision)} · ΔT ${result.timeDelta}`;

            const midX =
              (start.x + end.x) / 2;
            const midY =
              (start.y + end.y) / 2;

            return (
              <g key={drawing.id}>
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  opacity={drawing.style.opacity}
                  strokeDasharray={strokeDasharray(
                    drawing.style.lineStyle,
                  )}
                />
                <text
                  x={midX}
                  y={midY - 6}
                  fill={stroke}
                  fontSize={12}
                  opacity={drawing.style.opacity}
                >
                  {label}
                </text>
              </g>
            );
          }

          if (drawing.type === "TEXT") {
            const textDrawing = drawing as Drawing & {
              text?: string;
              fontSize?: number;
            };

            return (
              <text
                key={drawing.id}
                x={points[0]!.x}
                y={points[0]!.y}
                fill={stroke}
                fontSize={textDrawing.fontSize ?? 14}
                opacity={drawing.style.opacity}
              >
                {textDrawing.text ?? "Text"}
              </text>
            );
          }

          return null;
        })}

      {drawings
        .filter(
          (drawing) =>
            drawing.visible &&
            drawing.id === selectedDrawingId &&
            drawing.points.length > 0,
        )
        .map((drawing) => {
          const points = drawing.points
            .map((point) =>
              pointToScreen(point, timeToX, priceToY),
            )
            .filter(
              (
                point,
              ): point is { x: number; y: number } =>
                point !== null,
            );

          if (points.length === 0) {
            return null;
          }

          return (
            <SelectionHandles
              key={`handles-${drawing.id}`}
              points={points}
            />
          );
        })}
    </svg>
  );
}

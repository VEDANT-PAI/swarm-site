import React from 'react';
import { SwarmEngine } from '../engine/SwarmEngine';

interface CanvasRulersProps {
  engine: SwarmEngine;
}

const RULER_SIZE = 20;

export const CanvasRulers: React.FC<CanvasRulersProps> = ({ engine }) => {
  const rulerOpacity = engine.rulers.t;
  if (rulerOpacity <= 0.001) return null;

  const { s: scale, left, vw: viewportW, vh: viewportH, scrollY } = engine.vp;

  // Adaptive tick intervals
  const step = scale > 0.6 ? 100 : scale > 0.3 ? 200 : 500;
  const halfStep = step / 2;

  // Horizontal ticks (top ruler)
  const topTicks: React.ReactNode[] = [];
  const startX = Math.floor(-left / scale / step) * step;

  for (let x = startX; left + x * scale < viewportW; x += halfStep) {
    const screenX = left + x * scale;
    const isMajor = x % step === 0;

    topTicks.push(
      <line
        key={`tx-${x}`}
        x1={screenX}
        x2={screenX}
        y1={isMajor ? 13 : 16}
        y2={RULER_SIZE}
        stroke="#5E5E5E"
      />
    );

    if (isMajor) {
      topTicks.push(
        <text key={`lx-${x}`} x={screenX + 3} y={11} className="rtext">
          {x}
        </text>
      );
    }
  }

  // Vertical ticks (left ruler)
  const leftTicks: React.ReactNode[] = [];
  const startY = Math.floor(scrollY / scale / step) * step;

  for (let y = startY; y * scale - scrollY < viewportH; y += halfStep) {
    const screenY = y * scale - scrollY;
    const isMajor = y % step === 0;

    leftTicks.push(
      <line
        key={`ty-${y}`}
        x1={isMajor ? 13 : 16}
        x2={RULER_SIZE}
        y1={screenY}
        y2={screenY}
        stroke="#5E5E5E"
      />
    );

    if (isMajor) {
      leftTicks.push(
        <text
          key={`ly-${y}`}
          x={11}
          y={screenY - 3}
          className="rtext"
          transform={`rotate(-90 11 ${screenY - 3})`}
        >
          {y}
        </text>
      );
    }
  }

  // Mouse coordinate indicator
  const mouse = engine.mouse;
  const mouseScreenX = mouse?.x;
  const mouseScreenY = mouse?.y;

  return (
    <>
      {/* Top ruler */}
      <div
        className="ruler ruler-top"
        style={{
          opacity: rulerOpacity,
          transform: `translateY(${(rulerOpacity - 1) * RULER_SIZE}px)`,
          transition: 'transform 120ms ease-out',
        }}
      >
        <svg width={viewportW} height={RULER_SIZE}>
          {topTicks}
          {mouseScreenX != null && (
            <rect
              x={mouseScreenX - 1}
              y={0}
              width={2}
              height={RULER_SIZE}
              fill="#0D99FF"
            />
          )}
        </svg>
      </div>

      {/* Left ruler */}
      <div
        className="ruler ruler-left"
        style={{
          opacity: rulerOpacity,
          transform: `translateX(${(rulerOpacity - 1) * RULER_SIZE}px)`,
          transition: 'transform 120ms ease-out',
        }}
      >
        <svg width={RULER_SIZE} height={viewportH}>
          {leftTicks}
          {mouseScreenY != null && (
            <rect
              x={0}
              y={mouseScreenY - 1}
              width={RULER_SIZE}
              height={2}
              fill="#0D99FF"
            />
          )}
        </svg>
      </div>

      {/* Top-left corner */}
      <div
        className="ruler-corner"
        style={{
          opacity: rulerOpacity,
          transform: `translate(${(rulerOpacity - 1) * RULER_SIZE}px, ${(rulerOpacity - 1) * RULER_SIZE}px)`,
          transition: 'transform 120ms ease-out',
        }}
      >
        <svg width={RULER_SIZE} height={RULER_SIZE}>
          <rect x={9} y={9} width={2} height={2} fill="#7A7A7A" />
        </svg>
      </div>
    </>
  );
};

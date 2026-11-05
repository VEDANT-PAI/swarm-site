import React from 'react';
import { SwarmEngine } from '../engine/SwarmEngine';
import { THEME } from '../engine/typography';

interface CanvasOverlayProps {
  engine: SwarmEngine;
}

export const CanvasOverlay: React.FC<CanvasOverlayProps> = ({ engine }) => {
  const { s: scale, left, vw: viewportW, scrollY } = engine.vp;
  const toScreenX = (x: number) => left + x * scale;
  const toScreenY = (y: number) => y * scale;
  const overlayHeight = engine.height * scale;

  const svgItems: React.ReactNode[] = [];
  const badgeItems: React.ReactNode[] = [];
  let itemKey = 0;

  // 1. Render Scene Guides
  for (const el of engine.list) {
    if (el.kind === 'guide' && el.vis && el.op > 0) {
      const isGuideFlash = el.flash > 0;
      const strokeWidth = 1 + el.flash;
      const filter = isGuideFlash
        ? `drop-shadow(0 0 ${2 + el.flash * 3}px ${THEME.guideRed})`
        : undefined;

      if (el.axis === 'x') {
        const sx = toScreenX(el.cur);
        svgItems.push(
          <line
            key={`g-${itemKey++}`}
            x1={sx}
            x2={sx}
            y1={0}
            y2={overlayHeight}
            stroke={THEME.guideRed}
            strokeWidth={strokeWidth}
            opacity={el.op}
            style={{ filter }}
          />
        );
      } else {
        const sy = toScreenY(el.cur);
        svgItems.push(
          <line
            key={`g-${itemKey++}`}
            x1={0}
            x2={viewportW}
            y1={sy}
            y2={sy}
            stroke={THEME.guideRed}
            strokeWidth={strokeWidth}
            opacity={el.op}
            style={{ filter }}
          />
        );
      }
    }

    // Paths in active edit mode
    if (el.kind === 'path' && el.edit) {
      const stickyOffset = el.sticky ? engine.stick : 0;
      const placedPts = el.pts.slice(0, el.placed).map((pt) => ({
        x: toScreenX(pt.x),
        y: toScreenY(pt.y + stickyOffset),
      }));

      const ownerCursor =
        el.owner != null ? engine.cursors.find((c) => c.id === el.owner) : null;
      const allPts = [
        ...placedPts,
        ...(ownerCursor
          ? [
              {
                x: toScreenX(ownerCursor.x),
                y: toScreenY(ownerCursor.y + stickyOffset),
              },
            ]
          : []),
      ];

      const polylineStr =
        allPts.map((p) => `${p.x},${p.y}`).join(' ') +
        (el.shut ? ` ${placedPts[0].x},${placedPts[0].y}` : '');

      svgItems.push(
        <polyline
          key={`p-line-${itemKey++}`}
          points={polylineStr}
          fill="none"
          stroke={THEME.selectBlue}
          strokeWidth={1.5}
        />
      );

      placedPts.forEach((pt, pIdx) => {
        svgItems.push(
          <circle
            key={`p-pt-${itemKey++}-${pIdx}`}
            cx={pt.x}
            cy={pt.y}
            r={3.6}
            fill="#FFFFFF"
            stroke={THEME.selectBlue}
            strokeWidth={1.5}
          />
        );
      });
    }
  }

  // 2. Render Agent Cursor Overlays
  const rulerVisibility = engine.rulers.t;
  for (const cursor of engine.cursors) {
    if (!cursor.ov) continue;

    const stickyY = (yVal: number) =>
      (yVal + (cursor.sticky ? engine.stick : 0)) * scale;

    const overlays = cursor.ov();
    for (const ov of overlays) {
      if (ov.t === 'box') {
        const bx = toScreenX(ov.b.x);
        const by = stickyY(ov.b.y);
        const bw = ov.b.w * scale;
        const bh = ov.b.h * scale;
        const color = ov.color === 'red' ? THEME.guideRed : THEME.selectBlue;

        svgItems.push(
          <rect
            key={`box-${itemKey++}`}
            x={bx}
            y={by}
            width={bw}
            height={bh}
            fill="none"
            stroke={color}
            strokeWidth={1}
          />
        );

        if (ov.underline && ov.underline.w > 0) {
          const u = ov.underline;
          svgItems.push(
            <line
              key={`u-${itemKey++}`}
              x1={toScreenX(u.x)}
              x2={toScreenX(u.x + u.w)}
              y1={stickyY(u.y)}
              y2={stickyY(u.y)}
              stroke={THEME.selectBlue}
              strokeWidth={1.5}
            />
          );
        }

        if (ov.rulerLines && rulerVisibility > 0.05) {
          svgItems.push(
            <g
              key={`rl-${itemKey++}`}
              stroke={THEME.selectBlue}
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={rulerVisibility}
            >
              <line x1={20} x2={bx} y1={by + bh / 2} y2={by + bh / 2} />
              <line x1={bx + bw / 2} x2={bx + bw / 2} y1={scrollY + 20} y2={by} />
            </g>
          );
        }

        if (ov.handles) {
          const corners = [
            [bx, by],
            [bx + bw, by],
            [bx, by + bh],
            [bx + bw, by + bh],
          ];
          corners.forEach(([cx, cy], hIdx) => {
            svgItems.push(
              <rect
                key={`h-${itemKey++}-${hIdx}`}
                x={cx - 3.5}
                y={cy - 3.5}
                width={7}
                height={7}
                fill="#FFFFFF"
                stroke={THEME.selectBlue}
                strokeWidth={1}
              />
            );
          });
        }

        if (ov.badge && bw > 0) {
          badgeItems.push(
            <div
              key={`badge-${itemKey++}`}
              className="badge"
              style={{
                left: bx + bw / 2,
                top: by + bh + 8,
                background: color,
              }}
            >
              {ov.badge}
            </div>
          );
        }
      } else {
        // Line overlay (e.g. distance measurement between duplicated elements)
        const ax = toScreenX(ov.a.x);
        const ay = stickyY(ov.a.y);
        const bx = toScreenX(ov.b.x);
        const by = stickyY(ov.b.y);

        svgItems.push(
          <line
            key={`dist-${itemKey++}`}
            x1={ax}
            y1={ay}
            x2={bx}
            y2={by}
            stroke={THEME.guideRed}
            strokeWidth={1}
          />
        );

        const isHorizontal = ay === by;
        badgeItems.push(
          <div
            key={`dist-badge-${itemKey++}`}
            className="badge"
            style={{
              left: isHorizontal ? (ax + bx) / 2 : ax + 18,
              top: isHorizontal ? ay + 8 : (ay + by) / 2 - 9,
              background: THEME.guideRed,
            }}
          >
            {ov.label}px
          </div>
        );
      }
    }
  }

  // 3. User Selection (Inspector Mode)
  if (engine.selectedElId) {
    const selEl = engine.els.get(engine.selectedElId);
    if (selEl && selEl.vis) {
      const b = engine.bounds(selEl);
      const bx = toScreenX(b.x);
      const by = (b.y + (selEl.sticky ? engine.stick : 0)) * scale;
      const bw = b.w * scale;
      const bh = b.h * scale;

      // Selection box
      svgItems.push(
        <rect
          key="user-sel-box"
          x={bx}
          y={by}
          width={bw}
          height={bh}
          fill="rgba(13, 153, 255, 0.08)"
          stroke={THEME.selectBlue}
          strokeWidth={1.5}
        />
      );

      // Coordinate lines to rulers
      svgItems.push(
        <g
          key="user-sel-guides"
          stroke={THEME.selectBlue}
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.8}
        >
          <line x1={20} x2={bx} y1={by} y2={by} />
          <line x1={bx} x2={bx} y1={scrollY + 20} y2={by} />
        </g>
      );

      // 8 Handles
      const handles = [
        [bx, by],
        [bx + bw / 2, by],
        [bx + bw, by],
        [bx, by + bh / 2],
        [bx + bw, by + bh / 2],
        [bx, by + bh],
        [bx + bw / 2, by + bh],
        [bx + bw, by + bh],
      ];
      handles.forEach(([hx, hy], idx) => {
        svgItems.push(
          <rect
            key={`user-h-${idx}`}
            x={hx - 4}
            y={hy - 4}
            width={8}
            height={8}
            fill="#FFFFFF"
            stroke={THEME.selectBlue}
            strokeWidth={1.5}
          />
        );
      });

      // Top Tag
      badgeItems.push(
        <div
          key="user-sel-tag"
          className="badge"
          style={{
            left: bx + bw / 2,
            top: by - 22,
            background: THEME.selectBlue,
            fontSize: '11px',
            letterSpacing: '0.02em',
          }}
        >
          {selEl.id} · {Math.round(b.w)} × {Math.round(b.h)}
        </div>
      );
    }
  }

  return (
    <div className="overlay" style={{ height: overlayHeight }}>
      <svg width={viewportW} height={overlayHeight}>
        {svgItems}
      </svg>
      {badgeItems}
    </div>
  );
};

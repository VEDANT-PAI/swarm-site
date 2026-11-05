import React, { memo } from 'react';
import { SceneElement, TextElement, RectElement, PathElement } from '../engine/types';
import { getFontFamily, getLineHeightPx } from '../engine/typography';
import { CANVAS_WIDTH } from '../engine/scene';

interface ElementProps<T extends SceneElement> {
  el: T;
  v: number;
  onSelect?: (id: string) => void;
}

function renderSyntaxHighlightedYaml(code: string) {
  if (code.trimStart().startsWith('#')) {
    return <span style={{ color: '#6B7078' }}>{code}</span>;
  }

  const tokens: React.ReactNode[] = [];
  const regex = /([A-Za-z_]+)(?=:)|([{}:,])|([^{}:,A-Za-z_]+|[A-Za-z_]+)/g;
  let match: RegExpExecArray | null;
  let keyIdx = 0;
  let isFirstKey = true;

  while ((match = regex.exec(code)) !== null) {
    if (match[1]) {
      tokens.push(
        <span
          key={keyIdx++}
          style={{ color: isFirstKey ? '#8FC9D6' : '#AEB6EE' }}
        >
          {match[1]}
        </span>
      );
      isFirstKey = false;
    } else if (match[2]) {
      tokens.push(
        <span key={keyIdx++} style={{ color: '#81868D' }}>
          {match[2]}
        </span>
      );
    } else {
      tokens.push(match[3]);
    }
  }

  return tokens;
}

export const TextElementView = memo(
  ({ el, onSelect }: ElementProps<TextElement>) => {
    if (!el.vis) return null;

    const style = el.st;
    let content: React.ReactNode;

    if (el.selAll) {
      content = <span className="text-sel">{el.shown}</span>;
    } else if (style.code) {
      content = renderSyntaxHighlightedYaml(el.shown);
    } else {
      content = el.shown;
    }

    return (
      <div
        className="el-text"
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(el.id);
        }}
        style={{
          left: el.x + el.dx,
          top: el.y + el.dy,
          width: el.w,
          whiteSpace: el.w != null && !style.pre ? 'pre-wrap' : 'pre',
          fontFamily: getFontFamily(style),
          fontSize: el.size,
          fontWeight: style.weight,
          lineHeight: `${getLineHeightPx(style, el.size)}px`,
          letterSpacing: `${style.ls ?? 0}em`,
          color: style.color,
          textAlign: el.align,
          cursor: 'pointer',
        }}
      >
        {content}
        {el.editing && !el.selAll && (
          <span className="caret" style={{ height: el.size * 1.15 }} />
        )}
      </div>
    );
  },
  (prev, next) => prev.v === next.v
);

export const RectElementView = memo(
  ({ el, onSelect }: ElementProps<RectElement>) => {
    if (!el.vis) return null;

    const width = el.draw?.w ?? el.w;
    const height = el.draw?.h ?? el.h;

    return (
      <div
        className="el-rect"
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(el.id);
        }}
        style={{
          left: el.x + el.dx,
          top: el.y + el.dy,
          width,
          height,
          background: el.styled ? el.fill : '#D9D9D9',
          borderRadius: el.styled ? el.r : 0,
          boxShadow:
            el.styled && el.stroke ? `inset 0 0 0 1px ${el.stroke}` : 'none',
          cursor: 'pointer',
        }}
      />
    );
  },
  (prev, next) => prev.v === next.v
);

export const PathElementView = memo(
  ({ el }: ElementProps<PathElement>) => {
    if (!el.vis || el.placed === 0) return null;

    if (el.d && el.tf) {
      const progress = Math.min(1, (el.placed - 1) / el.pts.length);
      return (
        <path
          d={el.d}
          transform={`translate(${el.tf.x} ${el.tf.y}) scale(${el.tf.s})`}
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - progress}
          stroke={el.stroke}
          strokeWidth={1.2 / el.tf.s}
          fill={el.fill}
          fillOpacity={el.fillOn ? 1 : 0}
          style={{
            transition: 'fill-opacity 220ms ease, stroke-dashoffset 120ms linear',
          }}
        />
      );
    }

    const d = el.pts
      .slice(0, el.placed)
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${pt.x} ${pt.y}`)
      .join(' ') + (el.shut ? ' Z' : '');

    return (
      <path
        d={d}
        stroke={el.stroke}
        strokeWidth={el.sw}
        fill={el.fill ?? 'none'}
      />
    );
  },
  (prev, next) => prev.v === next.v
);

export interface CanvasLayerProps {
  elements: SceneElement[];
  height: number;
  onSelect?: (id: string) => void;
}

export const CanvasLayer: React.FC<CanvasLayerProps> = ({ elements, height, onSelect }) => {
  return (
    <>
      {elements.map((el) => {
        if (el.kind === 'rect') {
          return <RectElementView key={el.id} el={el} v={el.v} onSelect={onSelect} />;
        }
        return null;
      })}

      <svg className="paths" width={CANVAS_WIDTH} height={height}>
        {elements.map((el) => {
          if (el.kind === 'path') {
            return <PathElementView key={el.id} el={el} v={el.v} />;
          }
          return null;
        })}
      </svg>

      {elements.map((el) => {
        if (el.kind === 'text') {
          return <TextElementView key={el.id} el={el} v={el.v} onSelect={onSelect} />;
        }
        return null;
      })}
    </>
  );
};

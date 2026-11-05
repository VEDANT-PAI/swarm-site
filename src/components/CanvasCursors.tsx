import React from 'react';
import { AgentCursor, CursorShape } from '../engine/types';
import { CURSOR_HOTSPOTS } from '../engine/physics';
import { SwarmEngine } from '../engine/SwarmEngine';

const ARROW_PATH =
  'M4.6 3.9 C4.2 3.1 4.9 2.4 5.7 2.8 L20.6 9.4 C21.5 9.8 21.4 11.1 20.4 11.3 L13.9 12.9 C13.4 13 13 13.4 12.9 13.9 L11.3 20.4 C11.1 21.4 9.8 21.5 9.4 20.6 Z';

const CursorSvgIcon: React.FC<{ shape: CursorShape; color: string }> = ({
  shape,
  color,
}) => {
  const commonStroke = {
    stroke: '#FFFFFF',
    strokeWidth: 1.5,
    strokeLinejoin: 'round' as const,
  };

  switch (shape) {
    case 'arrow':
      return <path d={ARROW_PATH} fill={color} {...commonStroke} />;

    case 'dup':
      return (
        <>
          <path
            d={ARROW_PATH}
            transform="translate(4 3.5)"
            fill="#FFFFFF"
            stroke={color}
            strokeWidth={1.3}
            strokeLinejoin="round"
          />
          <path d={ARROW_PATH} fill={color} {...commonStroke} />
        </>
      );

    case 'pen':
    case 'pen-add':
    case 'pen-close':
      return (
        <>
          <path
            d="M17.4 10.6 L20.6 13.8 L13.8 20.6 L10.6 17.4 Z"
            fill={color}
            {...commonStroke}
          />
          <path
            d="M3 3 L13.1 6.3 L17.4 10.6 L10.6 17.4 L6.3 13.1 Z"
            fill={color}
            {...commonStroke}
          />
          <path
            d="M3.6 3.6 L8.9 8.9"
            stroke="#FFFFFF"
            strokeWidth={1.2}
            strokeLinecap="round"
          />
          <circle
            cx={10.2}
            cy={10.2}
            r={1.75}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={1.2}
          />
          {shape === 'pen-add' && (
            <g strokeLinecap="round">
              <path
                d="M23 19.5 V26.5 M19.5 23 H26.5"
                stroke="#FFFFFF"
                strokeWidth={3.4}
              />
              <path
                d="M23 19.5 V26.5 M19.5 23 H26.5"
                stroke="#1E1E1E"
                strokeWidth={1.3}
              />
            </g>
          )}
          {shape === 'pen-close' && (
            <>
              <circle
                cx={23}
                cy={23}
                r={2.8}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={3.2}
              />
              <circle
                cx={23}
                cy={23}
                r={2.8}
                fill="none"
                stroke="#1E1E1E"
                strokeWidth={1.2}
              />
            </>
          )}
        </>
      );

    case 'cross':
      return (
        <g strokeLinecap="round">
          <path
            d="M12 3.5 V20.5 M3.5 12 H20.5"
            stroke="#FFFFFF"
            strokeWidth={3.6}
          />
          <path
            d="M12 3.5 V20.5 M3.5 12 H20.5"
            stroke={color}
            strokeWidth={1.5}
          />
        </g>
      );

    case 'ibeam': {
      const beamD =
        'M8.5 4.5 H10.5 Q12 4.5 12 6 Q12 4.5 13.5 4.5 H15.5 M12 6 V18 M8.5 19.5 H10.5 Q12 19.5 12 18 Q12 19.5 13.5 19.5 H15.5';
      return (
        <g fill="none" strokeLinecap="round">
          <path d={beamD} stroke="#FFFFFF" strokeWidth={3.6} />
          <path d={beamD} stroke={color} strokeWidth={1.5} />
        </g>
      );
    }

    case 'ew':
    case 'ns':
      return (
        <path
          d="M2.5 12 L7 7.5 V10.4 H17 V7.5 L21.5 12 L17 16.5 V13.6 H7 V16.5 Z"
          transform={shape === 'ns' ? 'rotate(90 12 12)' : undefined}
          fill={color}
          {...commonStroke}
        />
      );
  }
};

const SingleCursor: React.FC<{
  cursor: AgentCursor;
  screenX: number;
  screenY: number;
  showLabel: boolean;
}> = ({ cursor, screenX, screenY, showLabel }) => {
  const [originX, originY] = CURSOR_HOTSPOTS[cursor.shape] || [5, 3.5];
  const scale = 1 - cursor.press * 0.12;

  return (
    <div
      className="cursor"
      style={{
        transform: `translate(${screenX}px, ${screenY}px)`,
      }}
    >
      <svg
        width={28}
        height={28}
        viewBox="0 0 28 28"
        style={{
          transform: `translate(${-originX}px, ${-originY}px) rotate(${cursor.angle}deg) scale(${scale})`,
          transformOrigin: `${originX}px ${originY}px`,
        }}
      >
        <CursorSvgIcon shape={cursor.shape} color={cursor.color} />
      </svg>

      {showLabel && (
        <div
          className="cursor-label"
          style={{
            left: 14,
            top: 14,
            background: cursor.color,
            color: '#FFFFFF',
          }}
        >
          {cursor.name}
        </div>
      )}
    </div>
  );
};

export const CanvasCursors: React.FC<{ engine: SwarmEngine }> = ({ engine }) => {
  const { s: scale, left } = engine.vp;

  return (
    <div
      className="cursors"
      style={{ height: engine.height * scale }}
    >
      {engine.cursors.map((c) => {
        const screenX = left + c.x * scale;
        const screenY = (c.y + (c.sticky ? engine.stick : 0)) * scale;

        return (
          <SingleCursor
            key={c.id}
            cursor={c}
            screenX={screenX}
            screenY={screenY}
            showLabel={engine.showAgentLabels}
          />
        );
      })}
    </div>
  );
};

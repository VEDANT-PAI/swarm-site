import React from 'react';
import { SwarmEngine } from '../engine/SwarmEngine';
import { X, Layers, Maximize2, Type, Move } from 'lucide-react';

interface InspectorPopupProps {
  engine: SwarmEngine;
  onClose: () => void;
}

export const InspectorPopup: React.FC<InspectorPopupProps> = ({ engine, onClose }) => {
  const elId = engine.selectedElId;
  if (!elId) return null;

  const el = engine.els.get(elId);
  if (!el) return null;

  const b = engine.bounds(el);

  return (
    <div className="inspector-panel">
      <div className="inspector-header">
        <div className="inspector-title">
          <Layers size={13} className="text-blue mr-1.5" />
          <span className="font-semibold">{el.id}</span>
          <span className="inspector-kind">({el.kind})</span>
        </div>
        <button className="inspector-close" onClick={onClose} title="Deselect (Esc)">
          <X size={14} />
        </button>
      </div>

      <div className="inspector-grid">
        <div className="inspector-row">
          <span className="label">
            <Move size={12} className="inline mr-1 opacity-60" /> Position
          </span>
          <span className="value">
            X: {Math.round(b.x)}px, Y: {Math.round(b.y)}px
          </span>
        </div>

        <div className="inspector-row">
          <span className="label">
            <Maximize2 size={12} className="inline mr-1 opacity-60" /> Size
          </span>
          <span className="value">
            {Math.round(b.w)} × {Math.round(b.h)} px
          </span>
        </div>

        {el.kind === 'text' && (
          <div className="inspector-row">
            <span className="label">
              <Type size={12} className="inline mr-1 opacity-60" /> Font
            </span>
            <span className="value">
              {el.st.weight} {el.size}px / {el.st.font}
            </span>
          </div>
        )}

        {el.kind === 'rect' && (
          <div className="inspector-row">
            <span className="label">Fill</span>
            <div className="color-swatch-row">
              <span
                className="color-dot"
                style={{ background: el.fill || '#FFFFFF' }}
              />
              <span className="value">{el.fill}</span>
              {el.r > 0 && <span className="value ml-2">r: {el.r}px</span>}
            </div>
          </div>
        )}
      </div>

      <div className="inspector-hint">
        Click anywhere on canvas to deselect or select another layer.
      </div>
    </div>
  );
};

import React from 'react';
import { SwarmEngine } from '../engine/SwarmEngine';
import {
  Play,
  Pause,
  Zap,
  Ruler,
  Users,
  Compass,
  PlusCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface ControlBarProps {
  engine: SwarmEngine;
  onOpenDispatch: () => void;
  onUpdate: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  engine,
  onOpenDispatch,
  onUpdate,
}) => {
  const activeCount = engine.cursors.filter((c) => c.task).length;
  const totalCount = engine.cursors.length;
  const isPaused = engine.isPaused;
  const speed = engine.speedMultiplier;
  const isRulerPinned = engine.rulers.pinned;
  const showLabels = engine.showAgentLabels;

  const handleTogglePause = () => {
    engine.togglePause();
    onUpdate();
  };

  const handleCycleSpeed = () => {
    if (engine.speedMultiplier === 1) engine.speedMultiplier = 2;
    else if (engine.speedMultiplier === 2) engine.speedMultiplier = 4;
    else engine.speedMultiplier = 1;
    onUpdate();
  };

  const handleToggleRulers = () => {
    engine.toggleRulers();
    onUpdate();
  };

  const handleToggleLabels = () => {
    engine.showAgentLabels = !engine.showAgentLabels;
    onUpdate();
  };

  const handleSpawnBurst = () => {
    engine.spawnBurst(6);
    onUpdate();
  };

  return (
    <div className="canvas-toolbar">
      {/* Agent Status Pill */}
      <div
        className="toolbar-pill cursor-pointer"
        onClick={handleSpawnBurst}
        title="Click to summon 6 more autonomous agents"
      >
        <span className="live-dot" />
        <span className="toolbar-text">
          <strong>{totalCount}</strong> agents ({activeCount} active)
        </span>
        <PlusCircle size={13} className="text-muted hover:text-ink ml-1" />
      </div>

      <div className="toolbar-divider" />

      {/* Play / Pause */}
      <button
        className="toolbar-btn"
        onClick={handleTogglePause}
        title={isPaused ? 'Resume Swarm Simulation' : 'Pause Swarm Simulation'}
      >
        {isPaused ? <Play size={14} /> : <Pause size={14} />}
      </button>

      {/* Speed multiplier */}
      <button
        className="toolbar-btn text-mono"
        onClick={handleCycleSpeed}
        title="Adjust Swarm Simulation Speed"
      >
        <Zap size={13} className="mr-0.5" />
        <span>{speed}x</span>
      </button>

      {/* Rulers Toggle */}
      <button
        className={`toolbar-btn ${isRulerPinned ? 'active' : ''}`}
        onClick={handleToggleRulers}
        title="Toggle Figma Canvas Rulers (Pinned / Auto)"
      >
        <Ruler size={14} />
      </button>

      {/* Nametags Toggle */}
      <button
        className={`toolbar-btn ${showLabels ? 'active' : ''}`}
        onClick={handleToggleLabels}
        title="Toggle Agent Name Badges on Cursors"
      >
        {showLabels ? <Users size={14} /> : <EyeOff size={14} />}
      </button>

      <div className="toolbar-divider" />

      {/* Dispatch Task CTA */}
      <button
        className="toolbar-btn-action"
        onClick={onOpenDispatch}
        title="Dispatch a new task to the orchestrator"
      >
        <Compass size={14} className="mr-1.5" />
        <span>Dispatch Task</span>
      </button>
    </div>
  );
};

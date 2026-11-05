import React, { useState } from 'react';
import { SwarmEngine } from '../engine/SwarmEngine';
import { X, Send, Cpu, CheckCircle2, Terminal } from 'lucide-react';

interface SwarmModalProps {
  engine: SwarmEngine;
  isOpen: boolean;
  onClose: () => void;
  onTaskDispatched: () => void;
}

const PRESET_TASKS = [
  {
    name: 'Research & Synthesize Market Comps',
    agent: 'agent/research',
    replicas: '8 replicas',
    tokens: '14.2k tokens',
  },
  {
    name: 'Fan-out Distributed Code Migration',
    agent: 'agent/refactor',
    replicas: '16 replicas',
    tokens: '48.9k tokens',
  },
  {
    name: 'Security Vulnerability Red-Teaming',
    agent: 'agent/security',
    replicas: '6 replicas',
    tokens: '22.0k tokens',
  },
  {
    name: 'Automated Pull Request Verification',
    agent: 'agent/review',
    replicas: '4 replicas',
    tokens: '9.4k tokens',
  },
];

export const SwarmModal: React.FC<SwarmModalProps> = ({
  engine,
  isOpen,
  onClose,
  onTaskDispatched,
}) => {
  const [taskInput, setTaskInput] = useState('Optimize parallel vector index routing');
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [dispatchedLogs, setDispatchedLogs] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    setIsSubmitting(true);
    const newLog = `[${new Date().toLocaleTimeString()}] DISPATCH -> "${taskInput}" routed to orchestrator (fleet load: 12% -> 24%)`;
    setDispatchedLogs((prev) => [newLog, ...prev.slice(0, 4)]);

    // Summon extra agents to simulate the task fan-out
    engine.spawnBurst(4);
    onTaskDispatched();

    setTimeout(() => {
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Cpu size={18} className="text-blue mr-2" />
            <span>Orchestrator Task Dispatcher</span>
          </div>
          <button className="inspector-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleDispatch} className="modal-body">
          <p className="modal-desc">
            Test how Swarm schedules, routes, and fans out tasks to parallel autonomous
            agents with shared state and automatic supervision.
          </p>

          <div className="form-group">
            <label className="form-label">Task Instruction</label>
            <div className="input-wrapper">
              <input
                type="text"
                className="task-input"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="e.g. Run deterministic benchmark against 100 endpoints"
              />
              <button
                type="submit"
                className="dispatch-submit-btn"
                disabled={isSubmitting}
              >
                <Send size={14} className="mr-1" />
                <span>Dispatch</span>
              </button>
            </div>
          </div>

          <div className="presets-section">
            <label className="form-label">Quick Presets</label>
            <div className="presets-list">
              {PRESET_TASKS.map((preset, idx) => (
                <div
                  key={idx}
                  className={`preset-item ${selectedPreset === idx ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedPreset(idx);
                    setTaskInput(preset.name);
                  }}
                >
                  <div className="preset-name">{preset.name}</div>
                  <div className="preset-meta">
                    <span className="preset-agent">{preset.agent}</span>
                    <span className="preset-rep">{preset.replicas}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terminal / Live Dispatch Logs */}
          <div className="terminal-box">
            <div className="terminal-header">
              <Terminal size={12} className="mr-1.5" />
              <span>Live Orchestration Stream</span>
            </div>
            <div className="terminal-content">
              <div>
                <span className="text-green">●</span> Orchestrator listening on port 7080 · 0
                conflicts
              </div>
              <div>
                <span className="text-blue">ℹ</span> Memory ring buffer active: 512 MB shared context
              </div>
              {dispatchedLogs.map((log, i) => (
                <div key={i} className="text-amber animate-fadeIn">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </form>

        <div className="modal-footer">
          <span className="footer-stat">
            <CheckCircle2 size={13} className="text-green inline mr-1" />
            {engine.cursors.length} agents standing by in active swarm
          </span>
          <button className="btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

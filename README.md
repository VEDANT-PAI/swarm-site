# Swarm Site · Collaborative Canvas Orchestration

An interactive web application inspired by [califa.github.io/swarm-site](https://califa.github.io/swarm-site/). The website demonstrates multi-agent orchestration by embodying it directly on the canvas: an autonomous swarm of AI agents (with pioneer nametags like Ada, Linus, Grace, Alan, Margaret, Tim) actively builds, measures, types, and aligns the page live in front of the visitor.

## Features

- **Live Multi-Agent Simulation**: Autonomous agents move with realistic physics, steering behaviors, flocking patterns, and spring dynamics.
- **Figma Design System Emulation**:
  - Live top and left rulers with dynamic millimeter/pixel coordinate ticks.
  - Snap guides that agents pull from rulers to align typography and layout boxes.
  - Authentic Figma SVG cursor shapes (Arrow, Alt-Duplicate, Pen tool with anchor points, Crosshairs, I-beam, Resize EW/NS).
  - Character-by-character typing with blinking carets, text selection highlights, and stepping font sizes.
  - Rectangle drawing with live dimension badges (`388 × 64`) and corner handles.
  - Option-drag component duplication with distance indicator pills (`24px`).
- **Architecture Flowchart**: Interactive dispatch orchestrator branching into worker node replicas with live load monitors.
- **YAML Spec Editor**: Code window displaying declarative `swarm.yaml` with custom syntax highlighting.
- **Interactive Control Deck**:
  - Live fleet status with pulsating indicator.
  - Simulation controls: Play / Pause, Speed multipliers (1x, 2x, 4x), Rulers toggle (Pinned / Auto), and Nametag visibility.
  - One-click trigger to spawn agent wave bursts.
- **Figma Inspector Mode**: Click any element on the page to inspect its layer ID, coordinates `(X, Y)`, dimensions `(W × H)`, and styles, complete with dashed coordinate projection lines to the rulers.
- **Task Dispatcher Modal**: Test orchestrator routing by typing custom agent tasks with simulated log streams.

## Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **Lucide Icons**
- **Offscreen Canvas 2D** text measurement cache for high performance 60fps rendering

## Getting Started

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

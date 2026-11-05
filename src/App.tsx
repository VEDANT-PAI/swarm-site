import React, { useEffect, useMemo, useState, useRef } from 'react';
import { SwarmEngine } from './engine/SwarmEngine';
import { CanvasLayer } from './components/CanvasElements';
import { CanvasOverlay } from './components/CanvasOverlay';
import { CanvasCursors } from './components/CanvasCursors';
import { CanvasRulers } from './components/CanvasRulers';
import { ControlBar } from './components/ControlBar';
import { InspectorPopup } from './components/InspectorPopup';
import { SwarmModal } from './components/SwarmModal';
import { CANVAS_WIDTH, LOGO_PATHS } from './engine/scene';
import { THEME } from './engine/typography';

const NAV_MARGIN_TOP = 24;
const NAV_HEIGHT = 64;
const RULER_THICKNESS = 20;

export const App: React.FC = () => {
  const engine = useMemo(() => new SwarmEngine(), []);
  const [, setTick] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const forceUpdate = () => setTick((c) => c + 1);

  // Set up animation loop and event listeners
  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      engine.vp.vw = vw;
      engine.vp.vh = vh;

      // Maintain high readability: auto-scale if viewport is narrower than canvas width
      if (vw < CANVAS_WIDTH + 60) {
        const scale = Math.max(0.68, (vw - 40) / CANVAS_WIDTH);
        engine.vp.s = scale;
        engine.vp.left = Math.max(0, (vw - CANVAS_WIDTH * scale) / 2);
      } else {
        engine.vp.s = 1;
        engine.vp.left = Math.round((vw - CANVAS_WIDTH) / 2);
      }
    };

    const handleScroll = () => {
      engine.setScroll(window.scrollY);
    };

    const handlePointerMove = (e: PointerEvent) => {
      engine.mouse = { x: e.clientX, y: e.clientY };
    };

    const handlePointerLeave = () => {
      engine.mouse = null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        engine.selectElement(null);
        setIsModalOpen(false);
      }
    };

    handleResize();
    handleScroll();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('keydown', handleKeyDown);

    let animId = 0;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      engine.step(dt);
      setTick((c) => c + 1);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [engine]);

  const { s: scale, left } = engine.vp;

  // Partition elements into sticky (nav) and non-sticky (main canvas)
  const stickyEls = useMemo(
    () => engine.list.filter((el) => el.sticky),
    [engine.list]
  );
  const mainEls = useMemo(
    () => engine.list.filter((el) => !el.sticky),
    [engine.list]
  );
  const hasVisibleSticky = stickyEls.some((el) => el.vis);

  const handleSelectElement = (id: string) => {
    // If clicking CTA buttons, also open interactive modal
    if (id.includes('btn') || id === 'h-btn1' || id === 'nav-btn' || id === 'x-btn') {
      setIsModalOpen(true);
    }
    engine.selectElement(id);
    forceUpdate();
  };

  const handlePageClick = () => {
    if (engine.selectedElId) {
      engine.selectElement(null);
      forceUpdate();
    }
  };

  return (
    <>
      <div
        className="page"
        onClick={handlePageClick}
        style={{ height: engine.height * scale }}
      >
        {/* Sticky Nav Layer */}
        <div
          className="nav-sticky"
          style={{
            marginTop: NAV_MARGIN_TOP * scale,
            height: NAV_HEIGHT * scale,
            top: RULER_THICKNESS * engine.rulers.t,
          }}
        >
          {hasVisibleSticky && <div className="nav-backdrop" />}
          <div
            className="nav-canvas"
            style={{
              width: CANVAS_WIDTH,
              transform: `translateX(${left}px) scale(${scale}) translateY(${-NAV_MARGIN_TOP}px)`,
            }}
          >
            <CanvasLayer
              elements={stickyEls}
              height={NAV_MARGIN_TOP + NAV_HEIGHT + 30}
              onSelect={handleSelectElement}
            />
          </div>
        </div>

        {/* Main Canvas Elements */}
        <div
          className="canvas"
          style={{
            width: CANVAS_WIDTH,
            height: engine.height,
            transform: `translateX(${left}px) scale(${scale})`,
          }}
        >
          <CanvasLayer
            elements={mainEls}
            height={engine.height}
            onSelect={handleSelectElement}
          />
        </div>

        {/* Center Intro Logo (dissolves when started) */}
        <div
          className={`intro-logo ${engine.started ? 'gone' : ''}`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 120 140" width={60} height={70}>
            {LOGO_PATHS.map((lp, idx) => (
              <path key={idx} d={lp.d} fill={THEME.line} />
            ))}
          </svg>
        </div>

        {/* Dynamic Canvas Overlay (guides, badges, handles, selection) */}
        <CanvasOverlay engine={engine} />

        {/* Autonomous Swarm Agent Cursors */}
        <CanvasCursors engine={engine} />
      </div>

      {/* Top & Left Figma Canvas Rulers */}
      <CanvasRulers engine={engine} />

      {/* Floating Canvas Control Toolbar */}
      <ControlBar
        engine={engine}
        onOpenDispatch={() => setIsModalOpen(true)}
        onUpdate={forceUpdate}
      />

      {/* Figma Element Properties Inspector */}
      <InspectorPopup
        engine={engine}
        onClose={() => {
          engine.selectElement(null);
          forceUpdate();
        }}
      />

      {/* Interactive Swarm Task Dispatcher Modal */}
      <SwarmModal
        engine={engine}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTaskDispatched={forceUpdate}
      />
    </>
  );
};

export default App;

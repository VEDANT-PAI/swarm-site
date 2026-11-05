import {
  SceneElement,
  SceneTask,
  ElementGroup,
  AgentCursor,
  ViewportState,
  OverlayItem,
  OverlayBox,
  RectElement,
  TextElement,
  GuideElement,
  PathElement,
} from './types';
import {
  buildScene,
  CANVAS_WIDTH,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  INF_LEFT,
  INF_RIGHT,
  LOGO_PATHS,
} from './scene';
import {
  AGENT_NAMES,
  FIGMA_COLORS,
  randomRange,
  clamp,
  easeInOutCubic,
  easeOutCubic,
} from './physics';
import { measureText, getLineHeightPx, THEME } from './typography';

const INITIAL_SWARM_SIZE = 18;
const MIN_AGENTS = 6;
const MAX_AGENTS = 48;
const FLOCK_MAX = 36;
const NAV_STICKY_TOP = 24;
const RULER_THICKNESS = 20;

export class SwarmEngine {
  els = new Map<string, SceneElement>();
  list: SceneElement[] = [];
  tasks: SceneTask[] = [];
  byTask = new Map<string, SceneTask>();
  groups = new Map<string, ElementGroup>();
  cursors: AgentCursor[] = [];

  vp: ViewportState = {
    scrollY: 0,
    vh: 800,
    vw: 1280,
    s: 1,
    left: 0,
  };

  started = false;
  frontier = 0;
  vel = 0;
  tempo = 1;
  time = 0;
  speedMultiplier = 1;
  isPaused = false;

  rulers = {
    want: 0,
    t: 0,
    lastNeed: -10,
    pinned: false,
  };

  lastScroll = 0;
  nextId = 0;
  spawnCooldown = 0;
  flocking = false;
  lastT: { x: number; y: number } | null = null;
  tv = { x: 0, y: 0 };
  mouse: { x: number; y: number } | null = null;
  guideDeps = new Map<string, SceneTask[]>();
  retiredWorkers = 0;
  height = 4060;

  // Interactive user selection (Figma inspector)
  selectedElId: string | null = null;
  hoveredElId: string | null = null;
  showAgentLabels = true;

  constructor() {
    const scene = buildScene(() => this.cursors.filter((c) => c.worked).length + this.retiredWorkers);
    this.height = scene.height;

    for (const el of scene.els) {
      this.els.set(el.id, el);
      this.list.push(el);
    }

    for (const task of scene.tasks) {
      this.tasks.push(task);
      this.byTask.set(task.id, task);

      if (task.spec.type === 'text' && task.spec.snap) {
        const deps = this.guideDeps.get(task.spec.snap) ?? [];
        deps.push(task);
        this.guideDeps.set(task.spec.snap, deps);
      }
    }

    for (const grp of scene.groups) {
      this.groups.set(grp.id, grp);
    }

    // Spawn initial swarm flocking in center
    for (let i = 0; i < INITIAL_SWARM_SIZE; i++) {
      const angle = (i / INITIAL_SWARM_SIZE) * Math.PI * 2;
      const cursor = this.makeCursor(
        CANVAS_WIDTH / 2 + Math.cos(angle) * 160,
        400 + Math.sin(angle) * 160,
        i < MIN_AGENTS ? { x: CANVAS_WIDTH / 2, y: 400 } : null
      );
      cursor.follow = true;
      this.cursors.push(cursor);
    }
  }

  makeCursor(x: number, y: number, home: { x: number; y: number } | null = null): AgentCursor {
    const id = this.nextId++;
    const isFast = Math.random() < 0.25;

    return {
      id,
      x,
      y,
      home,
      name: AGENT_NAMES[id % AGENT_NAMES.length],
      color: FIGMA_COLORS[id % FIGMA_COLORS.length],
      shape: 'arrow',
      press: 0,
      task: null,
      gen: null,
      ov: null,
      idleFor: 0,
      leaving: false,
      worked: false,
      sticky: false,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: isFast ? randomRange(1000, 1500) : randomRange(300, 750),
      force: isFast ? randomRange(3500, 6000) : randomRange(700, 1800),
      spin: isFast ? randomRange(2.2, 3.4) : randomRange(0.8, 1.8),
      curl: randomRange(-1, 1),
      ph: randomRange(0, Math.PI * 2),
      orbit: randomRange(70, 170),
      follow: false,
    };
  }

  get viewTop(): number {
    return this.vp.scrollY / this.vp.s;
  }

  get viewBot(): number {
    return (this.vp.scrollY + this.vp.vh) / this.vp.s;
  }

  get stick(): number {
    return Math.max(0, this.viewTop + (RULER_THICKNESS * this.rulers.t) / this.vp.s - NAV_STICKY_TOP);
  }

  isSticky(task: SceneTask): boolean {
    const spec = task.spec;
    const elId = spec.type === 'dup' ? this.groups.get(spec.group)!.ids[0] : (spec as any).el;
    const el = this.els.get(elId);
    return !!(el && el.sticky);
  }

  fromViewport(vx: number, vy: number): { x: number; y: number } {
    return {
      x: (vx - this.vp.left) / this.vp.s,
      y: (this.vp.scrollY + vy) / this.vp.s,
    };
  }

  start() {
    if (!this.started) {
      this.started = true;
      for (const c of this.cursors) {
        c.follow = false;
        c.gen = null;
        c.angle = (((c.angle + 180) % 360) + 360) % 360 - 180;
      }
    }
  }

  bounds(el: SceneElement): { x: number; y: number; w: number; h: number } {
    if (el.kind === 'text') {
      const tm = measureText(el.shown || ' ', el.st, el.size, el.w);
      return {
        x: el.x + el.dx,
        y: el.y + el.dy,
        w: el.w ?? Math.max(tm.w, 2),
        h: Math.max(tm.h, getLineHeightPx(el.st, el.size)),
      };
    }
    if (el.kind === 'rect') {
      return {
        x: el.x + el.dx,
        y: el.y + el.dy,
        w: el.draw?.w ?? el.w,
        h: el.draw?.h ?? el.h,
      };
    }
    if (el.kind === 'path') {
      const xs = el.pts.map((p) => p.x);
      const ys = el.pts.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return {
        x: minX,
        y: minY,
        w: Math.max(...xs) - minX,
        h: Math.max(...ys) - minY,
      };
    }
    return { x: el.pos, y: 0, w: 0, h: 0 };
  }

  unionBounds(ids: string[]): { x: number; y: number; w: number; h: number } {
    const boundsList = ids.map((id) => this.bounds(this.els.get(id)!));
    const minX = Math.min(...boundsList.map((b) => b.x));
    const minY = Math.min(...boundsList.map((b) => b.y));
    const maxX = Math.max(...boundsList.map((b) => b.x + b.w));
    const maxY = Math.max(...boundsList.map((b) => b.y + b.h));
    return {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
    };
  }

  textUnderline(el: TextElement): { x: number; y: number; w: number; h: number } {
    const tm = measureText(el.shown || ' ', el.st, el.size, el.w);
    const b = this.bounds(el);
    const firstLineWidth = tm.lines[0] ?? 0;
    return {
      x: el.align === 'center' && el.w ? b.x + (el.w - firstLineWidth) / 2 : b.x,
      y: b.y + getLineHeightPx(el.st, el.size) * 0.5 + el.size * 0.42,
      w: firstLineWidth,
      h: 0,
    };
  }

  selection(el: SceneElement, extra: Partial<OverlayBox> = {}): OverlayBox {
    const b = this.bounds(el);
    return {
      t: 'box',
      b,
      handles: true,
      badge: `${Math.round(b.w)} × ${Math.round(b.h)}`,
      rulerLines: true,
      underline: el.kind === 'text' ? this.textUnderline(el) : undefined,
      ...extra,
    };
  }

  setScroll(top: number) {
    this.vp.scrollY = top;
    if (top > 4) {
      this.start();
    }
  }

  available(): SceneTask[] {
    const frontierY = this.frontier + 120;
    return this.tasks.filter((t) => {
      if (t.state !== 'wait') return false;
      if (t.y > frontierY) return false;
      return t.deps.every((depId) => {
        const dep = this.byTask.get(depId);
        return dep && dep.state === 'done';
      });
    });
  }

  pick(cursor: AgentCursor, avail: SceneTask[]): SceneTask | null {
    let best: SceneTask | null = null;
    let minCost = Infinity;
    const viewTop = this.viewTop - 40;
    const viewBot = this.viewBot;

    for (const task of avail) {
      const priorityTier = task.y >= viewTop && task.y <= viewBot ? 0 : task.y < viewTop ? 1 : 2;
      const cost =
        priorityTier * 1e6 +
        (priorityTier === 1 ? viewTop - task.y : task.y) * 0.6 +
        Math.abs(task.y - cursor.y) * 0.4;

      if (cost < minCost) {
        minCost = cost;
        best = task;
      }
    }
    return best;
  }

  step(dtRaw: number) {
    if (this.isPaused) return;

    const dt = Math.min(dtRaw, 0.05) * this.speedMultiplier;
    this.time += dt;

    const scale = this.vp.s;
    const scrollDelta = Math.abs(this.vp.scrollY - this.lastScroll) / scale / Math.max(dt, 0.001);
    this.lastScroll = this.vp.scrollY;
    this.vel = Math.max(this.vel * Math.exp(-dt * 1.2), this.vel * 0.7 + scrollDelta * 0.3);

    if (this.started) {
      this.frontier = Math.max(this.frontier, this.viewBot);
    }

    const availTasks = this.started ? this.available() : [];
    const workingCount = this.cursors.filter((c) => c.task).length;

    this.tempo = clamp(
      2.1 + this.vel / 900 + (availTasks.length / Math.max(1, this.cursors.length)) * 0.5,
      2.1,
      4.5
    );

    // Ruler slide kinematics
    if (this.rulers.want > 0 || this.rulers.pinned) {
      this.rulers.lastNeed = this.time;
    }
    const rulerActive = this.rulers.pinned || this.time - this.rulers.lastNeed < 0.7 ? 1 : 0;
    this.rulers.t += (rulerActive - this.rulers.t) * Math.min(1, dt * 10);
    if (Math.abs(rulerActive - this.rulers.t) < 0.002) {
      this.rulers.t = rulerActive;
    }

    // Guides flash and fade
    for (const el of this.list) {
      if (el.kind !== 'guide' || !el.vis) continue;
      if (el.flash > 0) {
        el.flash = Math.max(0, el.flash - dt * 1.5);
        el.v++;
      }
      const deps = this.guideDeps.get(el.id) ?? [];
      if (!el.dragging && deps.every((t) => t.state === 'done')) {
        const maxDoneAt = Math.max(...deps.map((t) => t.doneAt));
        if (this.time - maxDoneAt > 1.2 && el.op > 0) {
          el.op = Math.max(0, el.op - dt * 1.2);
          el.v++;
        }
      }
    }

    // Check flocking state
    if (!this.flocking && this.started && this.tasks.every((t) => t.state !== 'wait')) {
      for (const c of this.cursors) {
        if (!c.task && !c.follow) {
          c.follow = true;
          c.gen = null;
          c.leaving = false;
          c.ov = null;
          c.shape = 'arrow';
        }
      }
      if (this.cursors.every((c) => c.follow)) {
        this.flocking = true;
      }
    }

    if (this.flocking) {
      this.flock(dt);
      return;
    }

    if (!this.started) {
      const center = this.fromViewport(this.vp.vw / 2, this.vp.vh / 2);
      if (this.follow(dt, this.cursors, center, 0.7)) {
        this.start();
      }
      return;
    }

    // Follow mouse or center if some cursors are flocking
    if (this.cursors.some((c) => c.follow)) {
      this.follow(dt, this.cursors.filter((c) => c.follow));
    }

    // Dynamic agent scaling based on scroll velocity and task load
    this.spawnCooldown -= dt;
    const targetWorkerCount = clamp(
      MIN_AGENTS + Math.floor(this.vel / 50) + Math.floor(availTasks.length / 3),
      MIN_AGENTS,
      MAX_AGENTS
    );
    const nonLeavingCount = this.cursors.filter((c) => !c.leaving).length;

    if (
      this.started &&
      nonLeavingCount < targetWorkerCount &&
      availTasks.length > nonLeavingCount - workingCount &&
      this.spawnCooldown <= 0
    ) {
      const fromLeft = Math.random() < 0.5;
      const spawnPt = this.fromViewport(
        fromLeft ? -40 : this.vp.vw + 40,
        randomRange(0.2, 0.8) * this.vp.vh
      );
      this.cursors.push(this.makeCursor(spawnPt.x, spawnPt.y));
      this.spawnCooldown = 0.035;
    }

    // Assign tasks to idle agents
    for (const c of this.cursors) {
      if (c.task || c.leaving || c.follow || !this.started) continue;
      const task = this.pick(c, availTasks);
      if (task) {
        availTasks.splice(availTasks.indexOf(task), 1);
        task.state = 'active';
        c.task = task;
        c.worked = true;
        if (this.isSticky(task)) {
          c.sticky = true;
          c.y -= this.stick;
        }
        c.idleFor = 0;
        c.gen = this.run(c, task);
      }
    }

    // Step each cursor's state generator
    for (const c of [...this.cursors]) {
      if (c.follow) continue;

      c.press = Math.max(0, c.press - dt * 6);
      if (c.angle !== 0) {
        c.angle = Math.abs(c.angle) < 0.5 ? 0 : c.angle * (1 - Math.min(1, dt * 10));
      }

      if (!c.task) {
        c.idleFor += dt;
        if (
          !c.leaving &&
          this.started &&
          c.idleFor > 2.5 &&
          this.cursors.filter((m) => !m.leaving).length > MIN_AGENTS &&
          !c.home
        ) {
          c.leaving = true;
          c.gen = this.leave(c);
        }
        if (!c.gen) {
          c.gen = this.idle(c);
        }
      }

      if (c.gen) {
        const stepRes = c.gen.next(dt);
        if (stepRes.done) {
          if (c.task) {
            c.task.state = 'done';
            c.task.doneAt = this.time;
            c.task = null;
            c.ov = null;
            if (c.sticky) {
              c.sticky = false;
              c.y += this.stick;
            }
            c.shape = 'arrow';
          }
          c.gen = null;
          if (c.leaving) {
            if (c.worked) this.retiredWorkers++;
            const idx = this.cursors.indexOf(c);
            if (idx !== -1) this.cursors.splice(idx, 1);
          }
        }
      }
    }
  }

  flockTarget(): { x: number; y: number } {
    if (this.mouse) {
      return this.fromViewport(this.mouse.x, this.mouse.y);
    }
    const t = this.time;
    return this.fromViewport(
      this.vp.vw * (0.5 + 0.28 * Math.sin(t * 0.37)),
      this.vp.vh * (0.5 + 0.25 * Math.sin(t * 0.53 + 1))
    );
  }

  flock(dt: number) {
    this.spawnCooldown -= dt;
    if (this.cursors.length < FLOCK_MAX && this.spawnCooldown <= 0) {
      const fromLeft = Math.random() < 0.5;
      const pt = this.fromViewport(
        fromLeft ? -30 : this.vp.vw + 30,
        randomRange(0.1, 0.9) * this.vp.vh
      );
      const c = this.makeCursor(pt.x, pt.y);
      c.follow = true;
      this.cursors.push(c);
      this.spawnCooldown = 0.04;
    }
    this.follow(dt, this.cursors);
  }

  follow(
    dt: number,
    agents: AgentCursor[],
    targetOverride?: { x: number; y: number },
    damp = 1
  ): boolean {
    const mousePt = this.mouse ? this.fromViewport(this.mouse.x, this.mouse.y) : null;
    const target = targetOverride ?? this.flockTarget();
    const t = this.time;

    if (mousePt && this.lastT && dt > 0) {
      const smoothing = Math.min(1, dt * 18);
      this.tv.x += ((mousePt.x - this.lastT.x) / dt - this.tv.x) * smoothing;
      this.tv.y += ((mousePt.y - this.lastT.y) / dt - this.tv.y) * smoothing;
    }
    this.lastT = mousePt;

    const baseRadius = 135 * damp * (1 + 0.18 * Math.sin(t * 0.55));
    const swirl = Math.tanh(Math.cos(t * 0.11) * 3);

    for (const c of agents) {
      const dx = c.x - target.x;
      const dy = c.y - target.y;
      const dist = Math.hypot(dx, dy) || 1;
      const idealDist = baseRadius * (c.orbit / 120);
      const distErr = dist - idealDist;

      // Radial spring force
      const fRadial = -distErr * 1.8;
      // Tangential orbital force
      const fTangential = (c.curl * 220 + swirl * 160) * (idealDist / dist);

      const ux = dx / dist;
      const uy = dy / dist;

      c.vx += (ux * fRadial - uy * fTangential) * dt;
      c.vy += (uy * fRadial + ux * fTangential) * dt;

      // Damping
      c.vx *= Math.exp(-dt * 2.8);
      c.vy *= Math.exp(-dt * 2.8);

      c.x += c.vx * dt;
      c.y += c.vy * dt;

      // Cursor rotation towards direction of motion
      const speed = Math.hypot(c.vx, c.vy);
      if (speed > 8) {
        const targetAngle = (Math.atan2(c.vy, c.vx) * 180) / Math.PI + 45;
        c.angle += (targetAngle - c.angle) * Math.min(1, dt * 8);
      }
    }

    return false;
  }

  *wait(duration: number) {
    let elapsed = 0;
    while (elapsed < duration) {
      elapsed += (yield) * this.tempo;
    }
  }

  *moveTo(
    c: AgentCursor,
    target: { x: number; y: number } | (() => { x: number; y: number }),
    opts: {
      speed?: number;
      drag?: boolean;
      bend?: number;
      onStep?: () => void;
    } = {}
  ) {
    const getTarget = typeof target === 'function' ? target : () => target;
    const startX = c.x;
    const startY = c.y;
    const finalPt = getTarget();
    const distance = Math.hypot(finalPt.x - startX, finalPt.y - startY);

    if (distance < 0.5) {
      c.x = finalPt.x;
      c.y = finalPt.y;
      opts.onStep?.();
      return;
    }

    const duration =
      clamp(0.12 + Math.sqrt(distance) * 0.021, 0.14, 0.9) / (opts.speed ?? 1);
    const bendFactor =
      (opts.bend ?? (Math.random() < 0.5 ? -1 : 1) * randomRange(0.04, 0.14)) *
      Math.min(distance, 600);

    let t = 0;
    while (t < duration) {
      t += (yield) * this.tempo;
      const progress = Math.min(1, t / duration);
      const eased = opts.drag || progress < 0.15 ? easeInOutCubic(progress) : easeOutCubic(progress);
      const curTarget = getTarget();
      const dx = curTarget.x - startX;
      const dy = curTarget.y - startY;
      const totalLen = Math.hypot(dx, dy) || 1;
      const normalAmp = Math.sin(Math.PI * eased) * bendFactor;

      c.x = startX + dx * eased + (-dy / totalLen) * normalAmp;
      c.y = startY + dy * eased + (dx / totalLen) * normalAmp;
      opts.onStep?.();
    }

    const endPt = getTarget();
    c.x = endPt.x;
    c.y = endPt.y;
    opts.onStep?.();
  }

  *click(c: AgentCursor) {
    c.press = 1;
    yield* this.wait(0.07);
  }

  *type(el: TextElement, fullText: string, replace = false) {
    for (let i = 0; i < fullText.length; i++) {
      if (i === 0 && replace) {
        el.shown = '';
      }
      el.shown += fullText[i];
      el.selAll = false;
      el.v++;

      let delay = randomRange(0.012, 0.04);
      if (fullText[i] === ' ') delay += randomRange(0, 0.03);
      if (fullText[i] === '\n') delay += 0.1;
      if (Math.random() < 0.025) delay += randomRange(0.08, 0.2);

      yield* this.wait(delay);
    }
  }

  *idle(c: AgentCursor) {
    if (!this.started && c.home) {
      const home = c.home;
      const phase = randomRange(0, 6);
      while (!this.started) {
        const time = this.time;
        c.x = home.x + Math.sin(time * 1.3 + phase) * 3;
        c.y = home.y + Math.cos(time * 1.7 + phase) * 2.5;
        yield;
      }
    }

    while (true) {
      const top = this.viewTop;
      const bot = this.viewBot;
      const wanderTarget = {
        x: randomRange(220, 1060),
        y: randomRange(top + (bot - top) * 0.2, top + (bot - top) * 0.8),
      };
      yield* this.moveTo(c, wanderTarget, { speed: 0.35 });

      let pause = randomRange(0.4, 1.4);
      while (pause > 0) {
        pause -= yield;
        if (c.y < this.viewTop || c.y > this.viewBot) break;
      }
    }
  }

  *leave(c: AgentCursor) {
    const toRight = c.x > CANVAS_WIDTH / 2;
    yield* this.moveTo(
      c,
      () => this.fromViewport(toRight ? this.vp.vw + 60 : -60, (c.y - this.viewTop) * this.vp.s),
      { speed: 0.8 }
    );
  }

  run(c: AgentCursor, task: SceneTask): Generator<void, void, number> {
    const spec = task.spec;
    switch (spec.type) {
      case 'path':
        return this.drawPath(c, this.els.get(spec.el) as PathElement);
      case 'rect':
        return this.drawRect(c, this.els.get(spec.el) as RectElement);
      case 'text':
        return this.drawText(
          c,
          this.els.get(spec.el) as TextElement,
          spec.snap ? (this.els.get(spec.snap) as GuideElement) : null,
          !!spec.grow
        );
      case 'guide':
        return this.dragGuide(c, this.els.get(spec.el) as GuideElement);
      case 'dup':
        return this.duplicate(c, this.groups.get(spec.group)!, spec.k);
      case 'edit':
        return this.editText(c, this.els.get(spec.el) as TextElement);
    }
  }

  anchor(pt: { x: number; y: number }): { x: number; y: number } | (() => { x: number; y: number }) {
    if (pt.x <= INF_LEFT) {
      return () => ({ x: this.fromViewport(6, 0).x, y: pt.y });
    }
    if (pt.x >= INF_RIGHT) {
      return () => ({ x: this.fromViewport(this.vp.vw - 6, 0).x, y: pt.y });
    }
    return pt;
  }

  *drawPath(c: AgentCursor, el: PathElement) {
    if (el.d) {
      yield* this.drawLogo(c, el);
      return;
    }

    c.shape = el.add ? 'pen-add' : 'pen';
    yield* this.moveTo(c, this.anchor(el.pts[0]));
    yield* this.click(c);
    el.vis = true;
    el.edit = true;
    el.placed = 1;
    el.owner = c.id;
    el.v++;
    c.shape = 'pen';

    for (let i = 1; i < el.pts.length; i++) {
      yield* this.moveTo(c, this.anchor(el.pts[i]), { bend: randomRange(-0.03, 0.03) });
      yield* this.click(c);
      el.placed = i + 1;
      el.v++;
      yield* this.wait(randomRange(0.04, 0.12));
    }

    if (el.closed) {
      c.shape = 'pen-close';
      yield* this.moveTo(c, el.pts[0], { bend: randomRange(-0.03, 0.03) });
      yield* this.click(c);
      el.shut = true;
      el.v++;
    }

    el.owner = null;
    el.v++;
    c.shape = 'pen';
    yield* this.moveTo(c, { x: c.x + randomRange(14, 30), y: c.y + randomRange(10, 24) }, { speed: 1.4 });
    yield* this.wait(0.3);
    el.edit = false;
    if (el.fill) el.fillOn = true;
    el.v++;
  }

  *drawLogo(c: AgentCursor, el: PathElement) {
    c.shape = 'pen';
    yield* this.moveTo(c, this.anchor(el.pts[0]));
    el.vis = true;
    el.placed = 1;
    el.v++;

    for (let i = 1; i <= el.pts.length; i++) {
      yield* this.moveTo(c, el.pts[i % el.pts.length], { speed: 1.6 });
      el.placed = i + 1;
      el.v++;
    }

    el.shut = true;
    el.fillOn = true;
    el.v++;
    yield* this.moveTo(c, { x: c.x + randomRange(14, 30), y: c.y + randomRange(10, 24) }, { speed: 1.4 });
  }

  *drawRect(c: AgentCursor, el: RectElement) {
    c.shape = 'cross';
    yield* this.moveTo(c, { x: el.x, y: el.y });
    c.press = 1;
    el.vis = true;
    el.draw = { w: 0, h: 0 };
    el.v++;
    c.ov = () => [this.selection(el)];

    yield* this.moveTo(c, { x: el.x + el.w, y: el.y + el.h }, {
      speed: 0.75,
      drag: true,
      bend: 0,
      onStep: () => {
        el.draw = { w: Math.max(0, c.x - el.x), h: Math.max(0, c.y - el.y) };
        el.v++;
      },
    });

    el.draw = null;
    el.v++;
    c.shape = 'arrow';
    yield* this.wait(randomRange(0.18, 0.3));
    el.styled = true;
    el.v++;
    yield* this.wait(0.35);
    c.ov = null;
  }

  *drawText(c: AgentCursor, el: TextElement, guide: GuideElement | null, grow: boolean) {
    if (el.dyn) {
      el.text = el.dyn();
    }

    if (guide) {
      if (guide.axis === 'x') {
        el.dx = randomRange(28, 64);
        el.dy = randomRange(-8, 8);
      } else {
        el.dx = randomRange(-8, 8);
        el.dy = randomRange(18, 34) * (Math.random() < 0.5 ? -1 : 1);
      }
    }

    if (grow) {
      el.size = 18;
    }

    const startX = el.x + el.dx;
    const startY = el.y + el.dy;

    c.shape = 'cross';
    yield* this.moveTo(c, { x: startX, y: startY });

    if (el.w == null) {
      yield* this.click(c);
      el.vis = true;
      el.editing = true;
      el.v++;
    } else {
      c.press = 1;
      const dragDummyRect: RectElement = {
        kind: 'rect',
        id: '',
        v: 0,
        vis: true,
        dx: 0,
        dy: 0,
        x: startX,
        y: startY,
        w: 0,
        h: 0,
        r: 0,
        fill: '',
        draw: null,
        styled: true,
      };
      const initialH = getLineHeightPx(el.st, el.size);
      c.ov = () => [this.selection(dragDummyRect)];

      yield* this.moveTo(c, { x: startX + el.w, y: startY + initialH }, {
        speed: 0.9,
        drag: true,
        bend: 0,
        onStep: () => {
          dragDummyRect.w = Math.max(0, c.x - startX);
          dragDummyRect.h = Math.max(0, c.y - startY);
        },
      });

      el.vis = true;
      el.editing = true;
      el.v++;
    }

    c.shape = 'ibeam';
    c.ov = () => [{ t: 'box', b: this.bounds(el) }];
    yield* this.moveTo(c, { x: c.x + randomRange(-30, 10), y: c.y + randomRange(10, 30) }, { speed: 1.5 });

    yield* this.type(el, el.text);
    yield* this.wait(0.12);
    el.editing = false;
    el.v++;
    c.shape = 'arrow';
    c.ov = () => [this.selection(el)];

    if (grow) {
      const stepSizes = [24, 32, 40, 48, 56, 64, 72].filter((s) => s < el.st.size);
      for (const stepSize of [...stepSizes, el.st.size]) {
        yield* this.wait(0.06);
        el.size = stepSize;
        el.v++;
      }
      yield* this.wait(0.15);
    }

    if (guide) {
      const guideTask = this.byTask.get(`g:${guide.id}`)!;
      while (guideTask.state !== 'done') {
        yield;
      }

      const curBounds = this.bounds(el);
      const grabPoint = {
        x: curBounds.x + Math.min(curBounds.w * 0.4, 60) + randomRange(-6, 6),
        y: curBounds.y + Math.min(curBounds.h * 0.5, 22),
      };

      yield* this.moveTo(c, grabPoint);
      c.press = 1;

      const origin = { x: grabPoint.x - el.dx, y: grabPoint.y - el.dy };
      const overshoot = {
        x: origin.x + (guide.axis === 'x' ? -randomRange(2, 5) : randomRange(-6, 6)),
        y: origin.y + (guide.axis === 'y' ? -randomRange(2, 5) : randomRange(-3, 3)),
      };

      const snapStep = () => {
        let offsetX = c.x - origin.x;
        let offsetY = c.y - origin.y;
        if (guide.axis === 'x' && Math.abs(offsetX) < 9) {
          if (offsetX !== 0 && el.dx !== 0) guide.flash = 1;
          offsetX = 0;
        }
        if (guide.axis === 'y' && Math.abs(offsetY) < 9) {
          if (offsetY !== 0 && el.dy !== 0) guide.flash = 1;
          offsetY = 0;
        }
        el.dx = offsetX;
        el.dy = offsetY;
        el.v++;
        guide.v++;
      };

      yield* this.moveTo(c, overshoot, { speed: 0.6, drag: true, onStep: snapStep });
      yield* this.wait(0.1);
      yield* this.moveTo(c, origin, { speed: 2, onStep: snapStep });
      el.dx = 0;
      el.dy = 0;
      el.v++;
      yield* this.wait(0.25);
    } else {
      yield* this.wait(0.2);
    }

    c.ov = null;
  }

  *dragGuide(c: AgentCursor, guide: GuideElement) {
    this.rulers.want++;
    try {
      const jitter = randomRange(-0.15, 0.15);
      const rulerStart = () =>
        guide.axis === 'x'
          ? this.fromViewport(10, this.vp.vh * (0.45 + jitter))
          : this.fromViewport(this.vp.left + (guide.pos > 0 ? 400 : 300) * this.vp.s + jitter * 200, 10);

      c.shape = 'arrow';
      yield* this.moveTo(c, rulerStart);

      while (this.rulers.t < 0.95) {
        yield;
      }

      yield* this.moveTo(c, rulerStart, { speed: 3 });
      c.press = 1;
      c.shape = guide.axis === 'x' ? 'ew' : 'ns';
      guide.vis = true;
      guide.dragging = true;
      guide.op = 1;

      const track = () => {
        guide.cur = guide.axis === 'x' ? c.x : c.y;
        guide.v++;
      };
      track();

      const dropTarget = () => {
        const start = rulerStart();
        return guide.axis === 'x'
          ? { x: guide.pos, y: start.y + 40 }
          : { x: start.x + 30, y: guide.pos };
      };

      yield* this.moveTo(c, dropTarget, { speed: 0.55, drag: true, onStep: track });
      guide.cur = guide.pos;
      guide.dragging = false;
      guide.v++;
      c.shape = 'arrow';
      yield* this.wait(0.25);
    } finally {
      this.rulers.want--;
    }
  }

  *duplicate(c: AgentCursor, group: ElementGroup, copyIndex: number) {
    const copy = group.copies[copyIndex];
    const prevDoneCopies = [
      { dx: 0, dy: 0, ids: group.ids },
      ...group.copies.filter((_, idx) => this.byTask.get(`d:${group.id}:${idx}`)?.state === 'done'),
    ];

    let nearest = prevDoneCopies[0];
    for (const item of prevDoneCopies) {
      if (Math.hypot(item.dx - copy.dx, item.dy - copy.dy) < Math.hypot(nearest.dx - copy.dx, nearest.dy - copy.dy)) {
        nearest = item;
      }
    }

    const srcBounds = this.unionBounds(nearest.ids);
    c.shape = 'arrow';
    const grabPoint = {
      x: srcBounds.x + Math.min(srcBounds.w * 0.45, 70) + randomRange(-8, 8),
      y: srcBounds.y + Math.min(srcBounds.h * 0.45, 30) + randomRange(-4, 4),
    };

    yield* this.moveTo(c, grabPoint);
    yield* this.click(c);
    c.ov = () => [{ t: 'box', b: srcBounds, handles: true, badge: `${Math.round(srcBounds.w)} × ${Math.round(srcBounds.h)}` }];
    yield* this.wait(randomRange(0.15, 0.3));

    c.shape = 'dup';
    yield* this.wait(0.12);
    c.press = 1;

    const deltaX = nearest.dx - copy.dx;
    const deltaY = nearest.dy - copy.dy;

    copy.ids.forEach((copyId, idx) => {
      const copyEl = this.els.get(copyId)!;
      const origEl = this.els.get(group.ids[idx])!;
      copyEl.vis = true;
      copyEl.dx = deltaX;
      copyEl.dy = deltaY;
      if (copyEl.kind === 'text' && origEl.kind === 'text') {
        copyEl.shown = origEl.text;
      }
      if (copyEl.kind === 'rect') {
        copyEl.styled = true;
      }
      copyEl.v++;
    });

    const targetPos = { x: grabPoint.x - deltaX, y: grabPoint.y - deltaY };
    c.ov = () => {
      const copyBounds = this.unionBounds(copy.ids);
      const items: OverlayItem[] = [
        { t: 'box', b: srcBounds, color: 'red' },
        { t: 'box', b: copyBounds, color: 'red' },
      ];
      const spacingItem = this.spacing(srcBounds, copyBounds);
      if (spacingItem) items.push(spacingItem);
      return items;
    };

    yield* this.moveTo(c, targetPos, {
      speed: 0.6,
      drag: true,
      onStep: () => {
        copy.ids.forEach((copyId) => {
          const el = this.els.get(copyId)!;
          el.dx = c.x - targetPos.x;
          el.dy = c.y - targetPos.y;
          el.v++;
        });
      },
    });

    yield* this.wait(0.1);
    c.shape = 'arrow';
    c.ov = () => {
      const copyBounds = this.unionBounds(copy.ids);
      return [{ t: 'box', b: copyBounds, handles: true, badge: `${Math.round(copyBounds.w)} × ${Math.round(copyBounds.h)}` }];
    };
    yield* this.wait(0.35);
  }

  spacing(
    b1: { x: number; y: number; w: number; h: number },
    b2: { x: number; y: number; w: number; h: number }
  ): OverlayItem | null {
    const overlapY = Math.min(b1.y + b1.h, b2.y + b2.h) - Math.max(b1.y, b2.y);
    const overlapX = Math.min(b1.x + b1.w, b2.x + b2.w) - Math.max(b1.x, b2.x);

    if (overlapY > 0) {
      const midY = Math.max(b1.y, b2.y) + overlapY / 2;
      const [left, right] = b1.x < b2.x ? [b1, b2] : [b2, b1];
      const gap = right.x - (left.x + left.w);
      if (gap > 0) {
        return {
          t: 'line',
          a: { x: left.x + left.w, y: midY },
          b: { x: right.x, y: midY },
          label: `${Math.round(gap)}`,
        };
      }
    }

    if (overlapX > 0) {
      const midX = Math.max(b1.x, b2.x) + overlapX / 2;
      const [top, bot] = b1.y < b2.y ? [b1, b2] : [b2, b1];
      const gap = bot.y - (top.y + top.h);
      if (gap > 0) {
        return {
          t: 'line',
          a: { x: midX, y: top.y + top.h },
          b: { x: midX, y: bot.y },
          label: `${Math.round(gap)}`,
        };
      }
    }
    return null;
  }

  *editText(c: AgentCursor, el: TextElement) {
    c.shape = 'arrow';
    const b = this.bounds(el);
    const firstLineW = measureText(el.shown, el.st, el.size, el.w).lines[0] ?? b.w;
    const startX = el.align === 'center' && el.w ? b.x + (el.w - firstLineW) / 2 : b.x;

    yield* this.moveTo(c, {
      x: startX + Math.min(firstLineW * 0.5, 50) + randomRange(-5, 5),
      y: b.y + getLineHeightPx(el.st, el.size) * 0.55,
    });
    yield* this.click(c);
    yield* this.wait(0.08);
    yield* this.click(c);

    el.editing = true;
    el.selAll = true;
    el.v++;
    c.shape = 'ibeam';
    c.ov = () => [{ t: 'box', b: this.bounds(el) }];
    yield* this.wait(randomRange(0.2, 0.35));

    yield* this.type(el, el.text, true);
    yield* this.wait(0.12);
    el.editing = false;
    el.v++;
    c.shape = 'arrow';
    c.ov = () => [this.selection(el)];
    yield* this.wait(0.3);
  }

  // Interactive controls
  spawnBurst(count = 6) {
    for (let i = 0; i < count; i++) {
      const fromLeft = Math.random() < 0.5;
      const pt = this.fromViewport(
        fromLeft ? -40 : this.vp.vw + 40,
        randomRange(0.1, 0.9) * this.vp.vh
      );
      const c = this.makeCursor(pt.x, pt.y);
      c.worked = true;
      this.cursors.push(c);
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
  }

  toggleRulers() {
    this.rulers.pinned = !this.rulers.pinned;
    if (this.rulers.pinned) {
      this.rulers.t = 1;
    }
  }

  selectElement(id: string | null) {
    this.selectedElId = id;
  }
}

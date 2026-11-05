import {
  SceneElement,
  SceneTask,
  ElementGroup,
  RectElement,
  TextElement,
  GuideElement,
  PathElement,
  TaskSpec,
} from './types';
import { TYPOGRAPHY, THEME, measureText, createSansStyle } from './typography';

export const CANVAS_WIDTH = 1280;
export const MARGIN_LEFT = 80;
export const MARGIN_RIGHT = 1200;
export const X_START = MARGIN_LEFT + 36; // 116
export const INF_LEFT = -10000;
export const INF_RIGHT = 10000;

export const LOGO_PATHS = [
  {
    d: 'M0 61V70V95.5L16.16 87.6891C17.8793 86.8582 18.3949 84.6538 17.2227 83.1464L0 61Z',
    anchors: [
      { x: 0, y: 61 },
      { x: 0, y: 95.5 },
      { x: 16.2, y: 87.7 },
      { x: 17.2, y: 83.1 },
    ],
  },
  {
    d: 'M120 79V70V45L103.54 52.3455C101.748 53.1452 101.194 55.4216 102.417 56.9557L120 79Z',
    anchors: [
      { x: 120, y: 79 },
      { x: 120, y: 45 },
      { x: 103.5, y: 52.3 },
      { x: 102.4, y: 57 },
    ],
  },
  {
    d: 'M120 35V5C120 2.23858 117.761 0 115 0H35H20C8.95431 0 0 8.95432 0 20V50.9252L74.5897 101.343C76.2237 102.447 75.442 105 73.4697 105H0V135C0 137.761 2.23858 140 5 140H35H85H100C111.046 140 120 131.046 120 120V89.0748L45.4103 38.657C43.7763 37.5525 44.558 35 46.5303 35H120Z',
    anchors: [
      { x: 120, y: 35 },
      { x: 120, y: 5 },
      { x: 115, y: 0 },
      { x: 20, y: 0 },
      { x: 0, y: 20 },
      { x: 0, y: 50.9 },
      { x: 74.6, y: 101.3 },
      { x: 73.5, y: 105 },
      { x: 0, y: 105 },
      { x: 0, y: 135 },
      { x: 5, y: 140 },
      { x: 100, y: 140 },
      { x: 120, y: 120 },
      { x: 120, y: 89.1 },
      { x: 45.4, y: 38.7 },
      { x: 46.5, y: 35 },
      { x: 120, y: 35 },
    ],
  },
];

export interface SceneGraph {
  els: SceneElement[];
  tasks: SceneTask[];
  groups: ElementGroup[];
  height: number;
}

export function buildScene(getBuiltCount: () => number): SceneGraph {
  const elements: SceneElement[] = [];
  const tasks: SceneTask[] = [];
  const groups: ElementGroup[] = [];
  const elementMap = new Map<string, SceneElement>();

  let sectionDeps: string[] = [];

  const addEl = <T extends SceneElement>(el: T): T => {
    elements.push(el);
    elementMap.set(el.id, el);
    return el;
  };

  const addTask = (id: string, y: number, spec: TaskSpec, deps = sectionDeps): string => {
    tasks.push({
      id,
      y,
      spec,
      deps: [...deps],
      state: 'wait',
      doneAt: 0,
    });
    return id;
  };

  function addPath(
    id: string,
    pts: { x: number; y: number }[],
    opts: Partial<PathElement> & { deps?: string[] } = {}
  ): PathElement {
    const el = addEl<PathElement>({
      kind: 'path',
      id,
      v: 0,
      vis: false,
      dx: 0,
      dy: 0,
      pts,
      closed: !!opts.closed,
      stroke: opts.stroke ?? THEME.line,
      sw: opts.sw ?? 1,
      fill: opts.fill,
      d: opts.d,
      tf: opts.tf,
      add: opts.add ?? true,
      placed: 0,
      shut: false,
      edit: false,
      owner: null,
      fillOn: false,
      sticky: opts.sticky,
    });
    addTask(`p:${id}`, Math.min(...pts.map((p) => p.y)), { type: 'path', el: id }, opts.deps ?? []);
    return el;
  }

  function addRect(
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    opts: { r?: number; fill?: string; stroke?: string; deps?: string[]; sticky?: boolean } = {}
  ): RectElement {
    const el = addEl<RectElement>({
      kind: 'rect',
      id,
      v: 0,
      vis: false,
      dx: 0,
      dy: 0,
      x,
      y,
      w,
      h,
      r: opts.r ?? 0,
      fill: opts.fill ?? THEME.card,
      stroke: opts.stroke,
      draw: null,
      styled: false,
      sticky: opts.sticky,
    });
    addTask(`r:${id}`, y, { type: 'rect', el: id }, opts.deps ?? []);
    return el;
  }

  function addText(
    id: string,
    x: number,
    y: number,
    text: string,
    style = TYPOGRAPHY.body,
    opts: {
      w?: number;
      align?: 'left' | 'center' | 'right';
      snap?: string;
      grow?: boolean;
      dyn?: () => string;
      deps?: string[];
      sticky?: boolean;
    } = {}
  ): TextElement {
    const finalText = style.upper ? text.toUpperCase() : text;
    const el = addEl<TextElement>({
      kind: 'text',
      id,
      v: 0,
      vis: false,
      dx: 0,
      dy: 0,
      x,
      y,
      w: opts.w,
      align: opts.align ?? 'left',
      text: finalText,
      shown: '',
      st: style,
      size: style.size,
      editing: false,
      selAll: false,
      dyn: opts.dyn,
      sticky: opts.sticky,
    });
    addTask(
      `t:${id}`,
      y,
      { type: 'text', el: id, snap: opts.snap, grow: opts.grow },
      opts.deps ?? []
    );
    return el;
  }

  function addGuide(id: string, axis: 'x' | 'y', pos: number, taskY: number): GuideElement {
    const el = addEl<GuideElement>({
      kind: 'guide',
      id,
      v: 0,
      vis: false,
      dx: 0,
      dy: 0,
      axis,
      pos,
      cur: pos,
      op: 1,
      flash: 0,
      dragging: false,
    });
    addTask(`g:${id}`, taskY, { type: 'guide', el: id }, []);
    return el;
  }

  function duplicate(
    groupId: string,
    sourceIds: string[],
    copies: { dx: number; dy: number; edits?: string[] }[]
  ) {
    const group: ElementGroup = { id: groupId, ids: sourceIds, copies: [] };
    const sourceTaskIds = tasks
      .filter((t) => 'el' in t.spec && sourceIds.includes((t.spec as any).el))
      .map((t) => t.id);

    const dupTaskIds: string[] = [];

    copies.forEach((copySpec, copyIdx) => {
      const copyElIds: string[] = [];
      let editCursor = 0;

      for (const srcId of sourceIds) {
        const srcEl = elementMap.get(srcId)!;
        const newId = `${srcId}~${copyIdx + 1}`;
        copyElIds.push(newId);

        if (srcEl.kind === 'text') {
          const editVal = copySpec.edits ? copySpec.edits[editCursor] : undefined;
          const editedText = editVal
            ? srcEl.st.upper
              ? editVal.toUpperCase()
              : editVal
            : srcEl.text;
          addEl({
            ...srcEl,
            id: newId,
            x: srcEl.x + copySpec.dx,
            y: srcEl.y + copySpec.dy,
            text: editedText,
          });
          editCursor++;
        } else if (srcEl.kind === 'rect') {
          addEl({
            ...srcEl,
            id: newId,
            x: srcEl.x + copySpec.dx,
            y: srcEl.y + copySpec.dy,
          });
        }
      }

      group.copies.push({ dx: copySpec.dx, dy: copySpec.dy, ids: copyElIds });
      const minY = Math.min(
        ...copyElIds.map((id) => (elementMap.get(id) as TextElement | RectElement).y)
      );
      dupTaskIds.push(
        addTask(`d:${groupId}:${copyIdx}`, minY, { type: 'dup', group: groupId, k: copyIdx }, sourceTaskIds)
      );
    });

    group.copies.forEach((copy) => {
      copy.ids.forEach((copyElId, idx) => {
        const cEl = elementMap.get(copyElId)!;
        const sEl = elementMap.get(sourceIds[idx])!;
        if (cEl.kind === 'text' && sEl.kind === 'text' && cEl.text !== sEl.text) {
          addTask(`e:${copyElId}`, cEl.y, { type: 'edit', el: copyElId }, dupTaskIds);
        }
      });
    });

    groups.push(group);
  }

  function addSectionFrame(id: string, topY: number, botY: number, hasHorizontal = false) {
    sectionDeps = [];
    const hX = hasHorizontal ? [INF_RIGHT, INF_LEFT] : [INF_LEFT, INF_RIGHT];
    addPath(`rule-${id}`, [
      { x: hX[0], y: botY },
      { x: hX[1], y: botY },
    ]);
    addPath(`left-${id}`, [
      { x: MARGIN_LEFT, y: topY },
      { x: MARGIN_LEFT, y: botY },
    ]);
    addPath(`right-${id}`, [
      { x: MARGIN_RIGHT, y: botY },
      { x: MARGIN_RIGHT, y: topY },
    ]);
  }

  const addVLine = (id: string, x: number, y1: number, y2: number, deps?: string[]) =>
    addPath(id, [{ x, y: y1 }, { x, y: y2 }], { deps });

  const addHLine = (id: string, y: number, x1 = INF_LEFT, x2 = INF_RIGHT, deps?: string[]) =>
    addPath(id, [{ x: x1, y }, { x: x2, y }], { deps });

  const addLogoMark = (prefix: string, x: number, y: number, height: number, sticky = false) => {
    const scale = height / 140;
    LOGO_PATHS.forEach((lp, idx) => {
      addPath(
        `${prefix}${idx}`,
        lp.anchors.map((p) => ({ x: x + p.x * scale, y: y + p.y * scale })),
        {
          closed: true,
          stroke: THEME.ink,
          fill: THEME.ink,
          add: false,
          d: lp.d,
          tf: { x, y, s: scale },
          sticky,
        }
      );
    });
  };

  // --- 1. NAVIGATION BAR (Sticky) ---
  sectionDeps = [];
  const initialCount = elements.length;
  addPath('rule-top', [{ x: INF_LEFT, y: 24 }, { x: INF_RIGHT, y: 24 }], { add: false, sticky: true });
  addSectionFrame('nav', 24, 88, true);
  addLogoMark('mark', MARGIN_LEFT + 24, 45, 22, true);
  addText('brand', MARGIN_LEFT + 52, 44, 'Swarm', TYPOGRAPHY.brand, { sticky: true });
  addText('nav0', 540, 46, 'Product', TYPOGRAPHY.nav, { sticky: true });
  duplicate('nav', ['nav0'], [
    { dx: 96, dy: 0, edits: ['Agents'] },
    { dx: 192, dy: 0, edits: ['Docs'] },
    { dx: 288, dy: 0, edits: ['Pricing'] },
  ]);
  addVLine('nav-div', MARGIN_RIGHT - 176, 24, 88);
  addRect('nav-btn', MARGIN_RIGHT - 156, 36, 136, 40, { r: 8, fill: THEME.ink, sticky: true });
  addText('nav-btn-t', MARGIN_RIGHT - 156, 46, 'Get access', TYPOGRAPHY.btn, {
    w: 136,
    align: 'center',
    deps: ['r:nav-btn'],
    sticky: true,
  });

  // Mark nav elements as sticky
  elements.slice(initialCount).forEach((el) => (el.sticky = true));

  // --- 2. HERO SECTION ---
  addSectionFrame('hero', 88, 660);
  addVLine('hero-div', 740, 88, 660);
  addGuide('g-hero', 'x', X_START, 120);
  addGuide('g-hero-r', 'x', 776, 120);

  addText(
    'h-title',
    X_START,
    192,
    'Run a thousand\nagents as one.',
    TYPOGRAPHY.h1,
    { w: 580, snap: 'g-hero', grow: true }
  );

  addText(
    'h-lead',
    X_START,
    356,
    'Swarm schedules, routes and supervises AI agents across your stack, and runs their work in parallel.',
    TYPOGRAPHY.lead,
    { w: 500, snap: 'g-hero' }
  );

  addRect('h-btn1', X_START, 488, 184, 48, { r: 8, fill: THEME.ink });
  addText('h-btn1-t', X_START, 501, 'Start building', TYPOGRAPHY.btn, {
    w: 184,
    align: 'center',
    deps: ['r:h-btn1'],
  });

  addRect('h-btn2', X_START + 196, 488, 156, 48, { r: 8, fill: THEME.card, stroke: THEME.line });
  addText('h-btn2-t', X_START + 196, 501, 'Read the docs', TYPOGRAPHY.btnDark, {
    w: 156,
    align: 'center',
    deps: ['r:h-btn2'],
  });

  // Hero Architecture Diagram (Right Column)
  addRect('g-disp', 776, 162, 388, 64, { r: 10, fill: THEME.ink });
  addText('g-disp-t', 800, 172, 'swarm.dispatch(task)', TYPOGRAPHY.nodeWhite, {
    deps: ['r:g-disp'],
  });
  addText('g-disp-s', 800, 194, 'orchestrator · 18 tasks queued', TYPOGRAPHY.small, {
    deps: ['r:g-disp'],
  });

  const stem = addPath('g-stem', [{ x: 970, y: 226 }, { x: 970, y: 258 }], {
    stroke: '#9DA2A9',
    deps: ['r:g-disp'],
  });

  addPath(
    'g-bus',
    [
      { x: 866, y: 290 },
      { x: 866, y: 258 },
      { x: 1074, y: 258 },
      { x: 1074, y: 290 },
    ],
    { stroke: '#9DA2A9', deps: [`p:${stem.id}`] }
  );

  addRect('w0', 776, 290, 180, 64, { r: 10, fill: THEME.card, stroke: THEME.line });
  addText('w0-n', 796, 301, 'agent/research', TYPOGRAPHY.nodeName, { deps: ['r:w0'] });
  addText('w0-s', 796, 323, '● 12 replicas', createSansStyle(12, 500, 1.4, THEME.accent), {
    deps: ['r:w0'],
  });

  duplicate('workers', ['w0', 'w0-n', 'w0-s'], [
    { dx: 208, dy: 0, edits: ['agent/writer', '● 4 replicas'] },
    { dx: 0, dy: 104, edits: ['agent/review', '● 2 replicas'] },
    { dx: 208, dy: 104, edits: ['agent/deploy', '○ waiting'] },
  ]);

  addPath('g-l1', [{ x: 866, y: 354 }, { x: 866, y: 394 }], {
    stroke: '#9DA2A9',
    deps: ['d:workers:2'],
  });
  addPath('g-l2', [{ x: 1074, y: 354 }, { x: 1074, y: 394 }], {
    stroke: '#9DA2A9',
    deps: ['d:workers:2'],
  });

  addRect('g-track', 776, 540, 388, 6, { r: 3, fill: '#E1E3E6' });
  addRect('g-fill', 776, 540, 252, 6, { r: 3, fill: THEME.accent, deps: ['r:g-track'] });
  addText('g-stat', 776, 562, '4 agents · 18 tasks in flight · 0 conflicts', TYPOGRAPHY.small, {
    snap: 'g-hero-r',
  });

  // --- 3. SOCIAL PROOF / LOGOS ---
  addSectionFrame('logos', 660, 772, true);
  addText('l-label', X_START, 699, 'Used by teams at', TYPOGRAPHY.small, { w: 230 });
  for (let i = 0; i < 5; i++) {
    addVLine(`l-div${i}`, 360 + i * 168, 660, 772);
  }
  addText('logo0', 388, 703, 'Northwind', TYPOGRAPHY.logo);
  duplicate(
    'logos',
    ['logo0'],
    ['Halcyon', 'Parallax', 'Meridian', 'Kestrel'].map((name, i) => ({
      dx: 168 * (i + 1),
      dy: 0,
      edits: [name],
    }))
  );

  // --- 4. FEATURES GRID ---
  addSectionFrame('fhead', 772, 960);
  addGuide('g-feat', 'x', X_START, 790);
  addGuide('g-feat-r', 'x', 760, 790);

  addText(
    'f-title',
    X_START,
    834,
    'Built for running agents\nin production.',
    TYPOGRAPHY.h2,
    { w: 580, snap: 'g-feat', grow: true }
  );

  addText(
    'f-lead',
    760,
    840,
    'Routing, memory, supervision, fan-out, tracing and guardrails all come with the orchestrator.',
    TYPOGRAPHY.body,
    { w: 380, snap: 'g-feat-r' }
  );

  addSectionFrame('fgrid', 960, 1440, true);
  addHLine('f-mid', 1200);
  addVLine('f-v1', 453, 960, 1440);
  addVLine('f-v2', 826, 960, 1440);

  addGuide('g-cell', 'x', X_START, 975);
  addGuide('g-cell-y', 'y', 1000, 975);

  addText('fc-title', X_START, 1000, 'Smart routing', TYPOGRAPHY.h3, { snap: 'g-cell-y' });
  addText(
    'fc-body',
    X_START,
    1036,
    'Send every task to the agent best equipped for it, based on skills, cost and live load.',
    TYPOGRAPHY.body,
    { w: 296, snap: 'g-cell' }
  );

  duplicate('features', ['fc-title', 'fc-body'], [
    {
      dx: 373,
      dy: 0,
      edits: [
        'Shared memory',
        'Agents read and write one consistent context, so nobody does the same work twice.',
      ],
    },
    {
      dx: 746,
      dy: 0,
      edits: [
        'Supervisors',
        'Retry, escalate or hand off automatically when an agent gets stuck or drifts.',
      ],
    },
    {
      dx: 0,
      dy: 240,
      edits: [
        'Fan-out, fan-in',
        'Split big jobs across hundreds of workers and merge the results deterministically.',
      ],
    },
    {
      dx: 373,
      dy: 240,
      edits: [
        'Live traces',
        'Watch every decision as it happens, with replays down to a single tool call.',
      ],
    },
    {
      dx: 746,
      dy: 240,
      edits: [
        'Guardrails',
        'Budgets, approvals and policies that every agent in the swarm respects by default.',
      ],
    },
  ]);

  // --- 5. CODE / DECLARATIVE SPEC ---
  addSectionFrame('code', 1440, 1920);
  addVLine('c-div', 600, 1440, 1920);
  addGuide('g-code', 'x', X_START, 1460);
  addGuide('g-code-y', 'y', 1772, 1600);

  addText(
    'c-title',
    X_START,
    1522,
    'One file describes\nthe whole swarm.',
    TYPOGRAPHY.h2,
    { w: 440, snap: 'g-code', grow: true }
  );

  addText(
    'c-body',
    X_START,
    1630,
    'One declarative file sets your agents, how work is routed between them, and what they’re allowed to spend. Review it in a pull request like any other code.',
    TYPOGRAPHY.body,
    { w: 400, snap: 'g-code' }
  );

  addText('c-link', X_START, 1772, 'Read the spec', createSansStyle(13, 500, 1.4, THEME.ink), {
    snap: 'g-code-y',
  });

  const codeWin = addRect('c-win', 640, 1488, 520, 384, { r: 12, fill: THEME.code });
  for (let i = 0; i < 3; i++) {
    addRect(`c-dot${i}`, 664 + i * 18, 1507, 10, 10, {
      r: 5,
      fill: '#30343A',
      deps: [`r:${codeWin.id}`],
    });
  }

  const tabWidth = measureText('swarm.yaml', TYPOGRAPHY.codeDim, TYPOGRAPHY.codeDim.size).w;
  addText('c-file', 1136 - tabWidth, 1503, 'swarm.yaml', TYPOGRAPHY.codeDim, {
    deps: [`r:${codeWin.id}`],
  });

  addPath('c-sep', [{ x: 640, y: 1536 }, { x: 1160, y: 1536 }], {
    stroke: '#25282D',
    deps: [`r:${codeWin.id}`],
  });

  const yamlLines = [
    '# swarm.yaml',
    'swarm: launch-week',
    'agents:',
    '  research: { model: fast, replicas: 12 }',
    '  writer:   { model: smart, replicas: 4 }',
    '  reviewer: { model: smart, replicas: 2 }',
    'routing:',
    '  strategy: skills-first',
    '  fallback: reviewer',
    'budget:',
    '  max_spend: $40/day',
    '  on_exceed: pause',
  ];

  yamlLines.forEach((line, idx) => {
    addText(`c-ln${idx}`, 664, 1556 + idx * 23, line, TYPOGRAPHY.code, {
      deps: [`r:${codeWin.id}`],
    });
  });

  // --- 6. STATS METRICS ---
  addSectionFrame('stats', 1920, 2120, true);
  for (const x of [360, 640, 920]) {
    addVLine(`s-div${x}`, x, 1920, 2120);
  }
  addGuide('g-stats', 'y', 1960, 1930);
  addGuide('g-stats-x', 'x', X_START, 1930);

  addText('st-n', X_START, 1960, '10k+', TYPOGRAPHY.stat, { snap: 'g-stats' });
  addText('st-l', X_START, 2028, 'agents in a single swarm', TYPOGRAPHY.body, {
    w: 220,
    snap: 'g-stats-x',
  });

  duplicate('stats', ['st-n', 'st-l'], [
    { dx: 280, dy: 0, edits: ['38ms', 'median agent-to-agent handoff'] },
    { dx: 560, dy: 0, edits: ['99.99%', 'orchestrator uptime, last 12 months'] },
    { dx: 840, dy: 0, edits: ['0', 'tasks dropped last quarter'] },
  ]);

  // --- 7. PROCESS / WORKFLOW ---
  addSectionFrame('steps', 2120, 2640);
  addGuide('g-steps', 'x', X_START, 2140);
  addGuide('g-steps-c', 'x', X_START, 2330);

  addText(
    'p-title',
    X_START,
    2194,
    'How a task moves\nthrough Swarm.',
    TYPOGRAPHY.h2,
    { w: 640, snap: 'g-steps', grow: true }
  );

  const stepDividerH = addHLine('p-mid', 2320);
  addVLine('p-v1', 453, 2320, 2640, [`p:${stepDividerH.id}`]);
  addVLine('p-v2', 826, 2320, 2640, [`p:${stepDividerH.id}`]);

  addText('ps-t', X_START, 2364, 'Define', createSansStyle(26, 600, 1.2, THEME.ink, -0.02), {
    snap: 'g-steps-c',
  });
  addText(
    'ps-b',
    X_START,
    2404,
    'Declare agents, skills and budgets in one file, versioned right next to your code.',
    TYPOGRAPHY.body,
    { w: 296, snap: 'g-steps-c' }
  );

  duplicate('steps', ['ps-t', 'ps-b'], [
    {
      dx: 373,
      dy: 0,
      edits: [
        'Dispatch',
        'Swarm fans tasks out to the best agents and keeps every handoff ordered and observable.',
      ],
    },
    {
      dx: 746,
      dy: 0,
      edits: [
        'Converge',
        'Results stream back, get checked by supervisors, and land as one coherent change.',
      ],
    },
  ]);

  // --- 8. PRICING ---
  addSectionFrame('pricing', 2640, 3280, true);
  addGuide('g-price', 'x', X_START, 2660);
  addGuide('g-price-r', 'x', 760, 2660);
  addGuide('g-plan', 'x', 144, 2860);

  addText(
    '$-title',
    X_START,
    2714,
    'Priced by the size\nof your swarm.',
    TYPOGRAPHY.h2,
    { w: 520, snap: 'g-price', grow: true }
  );

  addText(
    '$-lead',
    760,
    2730,
    'Every plan includes the full orchestrator. You only pay more when your swarm gets bigger.',
    TYPOGRAPHY.body,
    { w: 380, snap: 'g-price-r' }
  );

  const priceCard = addRect('pc', 116, 2850, 330, 398, { r: 14, fill: THEME.card, stroke: THEME.line });
  const pDeps = [`r:${priceCard.id}`];

  addText('pc-name', 144, 2878, 'Hive', createSansStyle(16, 600, 1.3), {
    deps: pDeps,
    snap: 'g-plan',
  });
  addText('pc-price', 144, 2912, '$0', TYPOGRAPHY.price, { deps: pDeps, snap: 'g-plan' });
  addText('pc-per', 144, 2966, 'free forever', TYPOGRAPHY.small, { deps: pDeps });
  addText(
    'pc-desc',
    144,
    3000,
    'For tinkering with your first swarm on a weekend.',
    TYPOGRAPHY.body,
    { w: 274, deps: pDeps, snap: 'g-plan' }
  );

  addRect('pc-rule', 144, 3070, 274, 1, { fill: THEME.line, deps: pDeps });
  addText('pc-f1', 144, 3088, '✓  Up to 10 agents', TYPOGRAPHY.item, { deps: pDeps });
  addText('pc-f2', 144, 3116, '✓  Community support', TYPOGRAPHY.item, { deps: pDeps });
  addText('pc-f3', 144, 3144, '✓  7-day trace history', TYPOGRAPHY.item, { deps: pDeps });
  addRect('pc-btn', 144, 3176, 274, 44, { r: 8, fill: THEME.ink, deps: pDeps });
  addText('pc-btn-t', 144, 3187, 'Start free', TYPOGRAPHY.btn, {
    w: 274,
    align: 'center',
    deps: ['r:pc-btn'],
  });

  duplicate(
    'plans',
    ['pc', 'pc-name', 'pc-price', 'pc-per', 'pc-desc', 'pc-rule', 'pc-f1', 'pc-f2', 'pc-f3', 'pc-btn', 'pc-btn-t'],
    [
      {
        dx: 355,
        dy: 0,
        edits: [
          'Colony',
          '$49',
          'per month, billed monthly',
          'For teams running agents in production, every day.',
          '✓  Up to 500 agents',
          '✓  Shared memory + supervisors',
          '✓  30-day trace history',
          'Get Colony',
        ],
      },
      {
        dx: 710,
        dy: 0,
        edits: [
          'Swarm',
          'Let’s talk',
          'annual contract',
          'For fleets that never sleep and never stop shipping.',
          '✓  Unlimited agents',
          '✓  SSO, audit logs, VPC',
          '✓  Dedicated orchestrator',
          'Contact sales',
        ],
      },
    ]
  );

  // --- 9. FINAL CTA ---
  addSectionFrame('cta', 3280, 3690);
  addVLine('cta-div', 800, 3280, 3690);
  addGuide('g-cta', 'x', X_START, 3300);
  addGuide('g-cta-r', 'x', 840, 3300);

  addText('x-title', X_START, 3352, 'Let the swarm\nbuild it.', TYPOGRAPHY.h1, {
    w: 560,
    snap: 'g-cta',
    grow: true,
  });

  addText(
    'x-lead',
    X_START,
    3506,
    'Start with ten agents for free. Scale to ten thousand when you’re ready.',
    TYPOGRAPHY.lead,
    { w: 460, snap: 'g-cta' }
  );

  addRect('x-btn', X_START, 3596, 184, 48, { r: 8, fill: THEME.ink });
  addText('x-btn-t', X_START, 3609, 'Start building', TYPOGRAPHY.btn, {
    w: 184,
    align: 'center',
    deps: ['r:x-btn'],
  });

  addText('x-count', 840, 3352, '', createSansStyle(13, 500, 1.4, THEME.accent), {
    w: 320,
    snap: 'g-cta-r',
    dyn: () => `This page was built by ${getBuiltCount()} agents while you scrolled.`,
  });

  addText(
    'x-note',
    840,
    3414,
    'Every line, guide and word above was placed by a cursor working alongside the others.',
    TYPOGRAPHY.body,
    { w: 320, snap: 'g-cta-r' }
  );

  // --- 10. FOOTER ---
  addSectionFrame('footer', 3690, 3970, true);
  addGuide('g-foot', 'x', 560, 3700);
  addLogoMark('fmark', MARGIN_LEFT + 36, 3735, 22);
  addText('f-brand', MARGIN_LEFT + 62, 3734, 'Swarm', TYPOGRAPHY.brand);
  addText('f-copy', MARGIN_LEFT + 36, 3916, '© 2026 Swarm Labs, Inc.', TYPOGRAPHY.small);

  addText('fc-h', 560, 3738, 'Product', createSansStyle(14.5, 600, 1.4, THEME.ink), {
    snap: 'g-foot',
  });
  addText('fc-1', 560, 3772, 'Agents', TYPOGRAPHY.item, { snap: 'g-foot' });
  addText('fc-2', 560, 3802, 'Routing', TYPOGRAPHY.item);
  addText('fc-3', 560, 3832, 'Pricing', TYPOGRAPHY.item);

  duplicate('fcols', ['fc-h', 'fc-1', 'fc-2', 'fc-3'], [
    { dx: 200, dy: 0, edits: ['Company', 'About', 'Careers', 'Blog'] },
    { dx: 400, dy: 0, edits: ['Developers', 'Docs', 'API reference', 'Status'] },
  ]);

  return {
    els: elements,
    tasks,
    groups,
    height: 4060,
  };
}

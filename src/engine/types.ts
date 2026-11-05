export type Axis = 'x' | 'y';

export type CursorShape =
  | 'arrow'
  | 'dup'
  | 'pen'
  | 'pen-add'
  | 'pen-close'
  | 'cross'
  | 'ibeam'
  | 'ew'
  | 'ns';

export interface StyleSpec {
  font: 'sans' | 'mono';
  size: number;
  weight: number;
  lh: number;
  color: string;
  ls?: number;
  pre?: boolean;
  code?: boolean;
  upper?: boolean;
}

export interface RectElement {
  kind: 'rect';
  id: string;
  v: number;
  vis: boolean;
  dx: number;
  dy: number;
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  fill: string;
  stroke?: string;
  draw?: { w: number; h: number } | null;
  styled: boolean;
  sticky?: boolean;
}

export interface TextElement {
  kind: 'text';
  id: string;
  v: number;
  vis: boolean;
  dx: number;
  dy: number;
  x: number;
  y: number;
  w?: number;
  align?: 'left' | 'center' | 'right';
  text: string;
  shown: string;
  st: StyleSpec;
  size: number;
  editing: boolean;
  selAll: boolean;
  dyn?: () => string;
  sticky?: boolean;
}

export interface GuideElement {
  kind: 'guide';
  id: string;
  v: number;
  vis: boolean;
  dx: number;
  dy: number;
  axis: Axis;
  pos: number;
  cur: number;
  op: number;
  flash: number;
  dragging: boolean;
  sticky?: boolean;
}

export interface PathElement {
  kind: 'path';
  id: string;
  v: number;
  vis: boolean;
  dx: number;
  dy: number;
  pts: { x: number; y: number }[];
  closed: boolean;
  stroke: string;
  sw: number;
  fill?: string;
  d?: string;
  tf?: { x: number; y: number; s: number };
  add: boolean;
  placed: number;
  shut: boolean;
  edit: boolean;
  owner: number | null;
  fillOn: boolean;
  sticky?: boolean;
}

export type SceneElement = RectElement | TextElement | GuideElement | PathElement;

export interface TaskSpecPath {
  type: 'path';
  el: string;
}

export interface TaskSpecRect {
  type: 'rect';
  el: string;
}

export interface TaskSpecText {
  type: 'text';
  el: string;
  snap?: string;
  grow?: boolean;
}

export interface TaskSpecGuide {
  type: 'guide';
  el: string;
}

export interface TaskSpecDup {
  type: 'dup';
  group: string;
  k: number;
}

export interface TaskSpecEdit {
  type: 'edit';
  el: string;
}

export type TaskSpec =
  | TaskSpecPath
  | TaskSpecRect
  | TaskSpecText
  | TaskSpecGuide
  | TaskSpecDup
  | TaskSpecEdit;

export interface SceneTask {
  id: string;
  y: number;
  spec: TaskSpec;
  deps: string[];
  state: 'wait' | 'active' | 'done';
  doneAt: number;
}

export interface ElementGroup {
  id: string;
  ids: string[];
  copies: {
    dx: number;
    dy: number;
    ids: string[];
  }[];
}

export interface OverlayBox {
  t: 'box';
  b: { x: number; y: number; w: number; h: number };
  handles?: boolean;
  badge?: string;
  color?: 'blue' | 'red';
  rulerLines?: boolean;
  underline?: { x: number; y: number; w: number; h: number };
}

export interface OverlayLine {
  t: 'line';
  a: { x: number; y: number };
  b: { x: number; y: number };
  label: string;
}

export type OverlayItem = OverlayBox | OverlayLine;

export interface AgentCursor {
  id: number;
  x: number;
  y: number;
  home: { x: number; y: number } | null;
  name: string;
  color: string;
  shape: CursorShape;
  press: number;
  task: SceneTask | null;
  gen: Generator<void, void, number> | null;
  ov: (() => OverlayItem[]) | null;
  idleFor: number;
  leaving: boolean;
  worked: boolean;
  sticky: boolean;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  force: number;
  spin: number;
  curl: number;
  ph: number;
  orbit: number;
  follow: boolean;
}

export interface ViewportState {
  scrollY: number;
  vh: number;
  vw: number;
  s: number;
  left: number;
}

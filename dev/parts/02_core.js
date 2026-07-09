/* ================================================================
   Vector View — core: linear algebra, state, rendering
   Matrix convention: m = [a, b, c, d]  means  M = | a  b |
                                                   | c  d |
   Columns: M î = (a, c),  M ĵ = (b, d).
   ================================================================ */

const EPS = 1e-9;

/* ---------------- tiny linear algebra toolkit ---------------- */
const LA = {
  apply(m, v) { return [m[0]*v[0] + m[1]*v[1], m[2]*v[0] + m[3]*v[1]]; },
  det(m)   { return m[0]*m[3] - m[1]*m[2]; },
  trace(m) { return m[0] + m[3]; },
  lerpFromI(m, t) {
    // interpolate identity -> m, entrywise
    return [1 + (m[0]-1)*t, m[1]*t, m[2]*t, 1 + (m[3]-1)*t];
  },
  inverse(m) {
    const d = LA.det(m);
    if (Math.abs(d) < EPS) return null;
    return [m[3]/d, -m[1]/d, -m[2]/d, m[0]/d];
  },
  transpose(m) { return [m[0], m[2], m[1], m[3]]; },
  norm(v) { return Math.hypot(v[0], v[1]); },
  normalize(v) {
    const n = LA.norm(v);
    return n < EPS ? [0, 0] : [v[0]/n, v[1]/n];
  },
  rank(m) {
    const scale = Math.max(Math.abs(m[0]), Math.abs(m[1]), Math.abs(m[2]), Math.abs(m[3]));
    if (scale < 1e-7) return 0;
    return Math.abs(LA.det(m)) / (scale*scale) < 1e-6 ? 1 : 2;
  },
  /* eigen decomposition of a 2x2 matrix */
  eigen(m) {
    const [a, b, c, d] = m;
    const tr = a + d, det = a*d - b*c;
    const disc = tr*tr - 4*det;
    if (disc < -1e-10) {
      return { complex: true, re: tr/2, im: Math.sqrt(-disc)/2 };
    }
    const s = Math.sqrt(Math.max(disc, 0));
    const l1 = (tr + s) / 2, l2 = (tr - s) / 2;
    // uniform scaling M = λI : every vector is an eigenvector
    if (Math.abs(b) < 1e-9 && Math.abs(c) < 1e-9 && Math.abs(a - d) < 1e-9) {
      return { complex: false, uniform: true, l1: a, l2: a, vecs: [] };
    }
    const vecFor = (l) => {
      // rows of (M - λI) are (a-λ, b) and (c, d-λ); eigenvector ⟂ a nonzero row
      if (Math.abs(b) > 1e-9 || Math.abs(a - l) > 1e-9) return LA.normalize([b, l - a]);
      return LA.normalize([l - d, c]);
    };
    const v1 = vecFor(l1), v2 = vecFor(l2);
    const repeated = Math.abs(l1 - l2) < 1e-8;
    const sameDir = Math.abs(v1[0]*v2[1] - v1[1]*v2[0]) < 1e-6;
    if (repeated && sameDir) {
      return { complex: false, defective: true, l1, l2, vecs: [{ l: l1, v: v1 }] };
    }
    return { complex: false, l1, l2, vecs: [{ l: l1, v: v1 }, { l: l2, v: v2 }] };
  },
  /* direction of the null space of a rank-1 matrix */
  kernelDir(m) {
    const [a, b, c, d] = m;
    if (Math.hypot(a, b) > 1e-9) return LA.normalize([b, -a]);
    if (Math.hypot(c, d) > 1e-9) return LA.normalize([d, -c]);
    return null; // zero matrix: kernel is the whole plane
  },
  /* direction of the column space of a rank-1 matrix */
  colDir(m) {
    const c1 = [m[0], m[2]], c2 = [m[1], m[3]];
    return LA.norm(c1) > 1e-9 ? LA.normalize(c1) : (LA.norm(c2) > 1e-9 ? LA.normalize(c2) : null);
  },
};

/* number formatting */
function fmt(x, dp = 2) {
  if (!isFinite(x)) return "∞";
  if (Math.abs(x) < 5e-11) x = 0;
  let s = x.toFixed(dp);
  s = s.replace(/\.?0+$/, "");
  return s === "-0" ? "0" : s;
}

/* ---------------- state ---------------- */
const S = {
  m: [2, 1, 1, 2],        // target matrix
  t: 1,                    // animation parameter, 0 = identity, 1 = M
  playing: false,
  v: [1, 1.5],             // sample vector
  scale: 78,               // pixels per world unit
  origin: null,            // screen position of world (0,0); set on first resize
  show: { grid: true, square: true, eigen: true, vec: true, path: false, circle: false, kernel: false },
  snap: true,
  drag: null,              // "i" | "j" | "v" | "pan"
};

/* ---------------- canvas setup ---------------- */
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let W = 0, H = 0, DPR = 1;

function resize() {
  DPR = window.devicePixelRatio || 1;
  const r = canvas.getBoundingClientRect();
  W = r.width; H = r.height;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (!S.origin) S.origin = [W * 0.5, H * 0.5];
}
window.addEventListener("resize", resize);

const toScreen = (p) => [S.origin[0] + p[0]*S.scale, S.origin[1] - p[1]*S.scale];
const toWorld  = (sx, sy) => [(sx - S.origin[0]) / S.scale, (S.origin[1] - sy) / S.scale];

/* current interpolated matrix */
const curM = () => LA.lerpFromI(S.m, S.t);

/* ---------------- drawing helpers ---------------- */
function line(p, q, color, width = 1, dash = null) {
  ctx.save();
  if (dash) ctx.setLineDash(dash);
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(...toScreen(p)); ctx.lineTo(...toScreen(q));
  ctx.stroke();
  ctx.restore();
}

function arrow(from, to, color, width = 3, label = null, labelColor = null) {
  const [x1, y1] = toScreen(from), [x2, y2] = toScreen(to);
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const head = Math.min(11, len * 0.4);
  const ang = Math.atan2(dy, dx);
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
  ctx.lineCap = "round";
  // shaft stops where the head begins
  const bx = x2 - head * 0.75 * Math.cos(ang), by = y2 - head * 0.75 * Math.sin(ang);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(bx, by); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head*Math.cos(ang - 0.42), y2 - head*Math.sin(ang - 0.42));
  ctx.lineTo(x2 - head*Math.cos(ang + 0.42), y2 - head*Math.sin(ang + 0.42));
  ctx.closePath(); ctx.fill();
  if (label) {
    ctx.font = "600 15px ui-monospace, Menlo, monospace";
    ctx.fillStyle = labelColor || color;
    const off = 14;
    ctx.fillText(label, x2 + off*Math.cos(ang) - 5, y2 + off*Math.sin(ang) + 5);
  }
  ctx.restore();
}

function fullLine(dir, color, width = 2, dash = [7, 6]) {
  // an infinite line through the origin along dir
  const L = (W + H) / S.scale + 4;
  line([-dir[0]*L, -dir[1]*L], [dir[0]*L, dir[1]*L], color, width, dash);
}

/* ---------------- render ---------------- */
function render() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0e1016";
  ctx.fillRect(0, 0, W, H);

  const M = curM();
  const e1 = [M[0], M[2]], e2 = [M[1], M[3]];   // current basis images
  const css = getComputedStyle(document.documentElement);
  const C = (n) => css.getPropertyValue(n).trim();

  drawStaticGrid();
  if (S.show.grid) drawTransformedGrid(e1, e2);
  drawAxes();

  if (S.show.square) drawUnitSquare(e1, e2, M);
  if (S.show.circle) drawCircleImage(M);
  if (S.show.kernel) drawKernelAndColumnSpace();
  if (S.show.eigen) drawEigen();
  if (S.show.vec) drawVectors(M);

  // basis vectors last so their handles sit on top
  arrow([0, 0], e1, C("--ihat"), 3.5, "î");
  arrow([0, 0], e2, C("--jhat"), 3.5, "ĵ");
  handleDot(e1, C("--ihat"));
  handleDot(e2, C("--jhat"));
}

function handleDot(p, color) {
  const [x, y] = toScreen(p);
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, 6, 0, 7);
  ctx.fillStyle = "#0e1016"; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = color; ctx.stroke();
  ctx.restore();
}

function drawStaticGrid() {
  ctx.save();
  ctx.strokeStyle = "rgba(120,130,160,0.13)";
  ctx.lineWidth = 1;
  const x0 = Math.floor(toWorld(0, 0)[0]), x1 = Math.ceil(toWorld(W, 0)[0]);
  const y1 = Math.ceil(toWorld(0, 0)[1]), y0 = Math.floor(toWorld(0, H)[1]);
  ctx.beginPath();
  for (let x = x0; x <= x1; x++) { const s = toScreen([x, 0])[0]; ctx.moveTo(s, 0); ctx.lineTo(s, H); }
  for (let y = y0; y <= y1; y++) { const s = toScreen([0, y])[1]; ctx.moveTo(0, s); ctx.lineTo(W, s); }
  ctx.stroke();
  ctx.restore();
}

function drawAxes() {
  ctx.save();
  ctx.strokeStyle = "rgba(180,190,215,0.35)";
  ctx.lineWidth = 1.4;
  const [ox, oy] = toScreen([0, 0]);
  ctx.beginPath();
  ctx.moveTo(0, oy); ctx.lineTo(W, oy);
  ctx.moveTo(ox, 0); ctx.lineTo(ox, H);
  ctx.stroke();
  ctx.restore();
}

function drawTransformedGrid(e1, e2) {
  const n1 = LA.norm(e1), n2 = LA.norm(e2);
  ctx.save();
  const N = 24, L = 60; // grid line count and half-length in units
  for (const [dir, other, n] of [[e1, e2, n2], [e2, e1, n1]]) {
    if (LA.norm(dir) < 1e-6) continue;
    for (let k = -N; k <= N; k++) {
      if (n < 1e-6 && k !== 0) continue; // collapsed direction: only the line through origin survives
      const base = [other[0]*k, other[1]*k];
      const p = [base[0] - dir[0]*L, base[1] - dir[1]*L];
      const q = [base[0] + dir[0]*L, base[1] + dir[1]*L];
      const isAxis = k === 0;
      line(p, q,
        isAxis ? "rgba(91,167,247,0.75)" : "rgba(91,167,247,0.28)",
        isAxis ? 1.6 : 1);
    }
  }
  ctx.restore();
}

function drawUnitSquare(e1, e2, M) {
  const det = LA.det(M);
  const pts = [[0, 0], e1, [e1[0]+e2[0], e1[1]+e2[1]], e2].map(toScreen);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(...pts[0]); pts.slice(1).forEach(p => ctx.lineTo(...p));
  ctx.closePath();
  ctx.fillStyle = det >= 0 ? "rgba(74,222,128,0.16)" : "rgba(248,113,113,0.18)";
  ctx.strokeStyle = det >= 0 ? "rgba(74,222,128,0.75)" : "rgba(248,113,113,0.8)";
  ctx.lineWidth = 1.6;
  ctx.fill(); ctx.stroke();
  // area label at the centroid
  const cx = (pts[0][0]+pts[1][0]+pts[2][0]+pts[3][0]) / 4;
  const cy = (pts[0][1]+pts[1][1]+pts[2][1]+pts[3][1]) / 4;
  ctx.font = "600 13px ui-monospace, Menlo, monospace";
  ctx.fillStyle = det >= 0 ? "rgba(74,222,128,0.95)" : "rgba(248,113,113,0.95)";
  ctx.textAlign = "center";
  ctx.fillText(`area ${fmt(Math.abs(det))}${det < 0 ? " (flipped)" : ""}`, cx, cy);
  ctx.restore();
}

function drawCircleImage(M) {
  ctx.save();
  // faint original unit circle
  ctx.strokeStyle = "rgba(125,211,252,0.25)";
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  const [ox, oy] = toScreen([0, 0]);
  ctx.arc(ox, oy, S.scale, 0, 7);
  ctx.stroke();
  // its image: an ellipse (or a segment, if M is singular)
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(125,211,252,0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 96; i++) {
    const th = i / 96 * 2 * Math.PI;
    const p = toScreen(LA.apply(M, [Math.cos(th), Math.sin(th)]));
    i === 0 ? ctx.moveTo(...p) : ctx.lineTo(...p);
  }
  ctx.stroke();
  ctx.restore();
}

function drawKernelAndColumnSpace() {
  const r = LA.rank(S.m);
  if (r === 2) return;
  const css = getComputedStyle(document.documentElement);
  if (r === 1) {
    const k = LA.kernelDir(S.m);
    const c = LA.colDir(S.m);
    if (k) { fullLine(k, css.getPropertyValue("--kernel").trim(), 2.2, [9, 7]); lineLabel(k, "null space", css.getPropertyValue("--kernel").trim()); }
    if (c) { fullLine(c, css.getPropertyValue("--colspace").trim(), 2.2, [2, 5]); lineLabel(c, "column space", css.getPropertyValue("--colspace").trim(), 0.72); }
  }
  // rank 0: everything maps to the origin — analysis panel explains it
}

function lineLabel(dir, text, color, at = 0.82) {
  // place the label toward the edge of the view, along dir
  const reach = Math.min(W, H) / 2 / S.scale * at;
  const p = toScreen([dir[0]*reach, dir[1]*reach]);
  ctx.save();
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(text, Math.min(Math.max(p[0], 50), W - 60), Math.min(Math.max(p[1] - 8, 16), H - 10));
  ctx.restore();
}

function drawEigen() {
  const eg = LA.eigen(S.m);
  const css = getComputedStyle(document.documentElement);
  const col = css.getPropertyValue("--eigen").trim();
  if (eg.complex || eg.uniform) return; // nothing to draw (complex) / everything is one (uniform)
  const M = curM();
  for (const { l, v } of eg.vecs) {
    fullLine(v, "rgba(192,132,252,0.5)", 1.6, [8, 7]);
    // the eigenvector under the *current* animated matrix, so you can watch it stay on its line
    const img = LA.apply(M, v);
    arrow([0, 0], img, col, 2.6);
    // λ label near the tip of the target-image vector
    const tip = LA.apply(S.m, v);
    const [tx, ty] = toScreen(LA.norm(tip) > 0.4 ? tip : v);
    ctx.save();
    ctx.font = "600 13px ui-monospace, Menlo, monospace";
    ctx.fillStyle = col;
    ctx.fillText(`λ=${fmt(l)}`, tx + 10, ty - 8);
    ctx.restore();
  }
}

function drawVectors(M) {
  const css = getComputedStyle(document.documentElement);
  const cv = css.getPropertyValue("--vvec").trim();
  const img = LA.apply(M, S.v);

  if (S.show.path) {
    // Mv = v₁·(Mî) + v₂·(Mĵ): same coordinates, new basis vectors
    const e1 = [M[0], M[2]], e2 = [M[1], M[3]];
    const p1 = [e1[0]*S.v[0], e1[1]*S.v[0]];
    const p2 = [p1[0] + e2[0]*S.v[1], p1[1] + e2[1]*S.v[1]];
    line([0, 0], p1, "rgba(74,222,128,0.8)", 2, [6, 5]);
    line(p1, p2, "rgba(248,113,113,0.8)", 2, [6, 5]);
    ctx.save();
    ctx.font = "600 12px ui-monospace, Menlo, monospace";
    const m1 = toScreen([p1[0]/2, p1[1]/2]);
    ctx.fillStyle = "rgba(74,222,128,0.95)";
    ctx.fillText(`${fmt(S.v[0])}·î′`, m1[0] + 6, m1[1] - 6);
    const m2 = toScreen([(p1[0]+p2[0])/2, (p1[1]+p2[1])/2]);
    ctx.fillStyle = "rgba(248,113,113,0.95)";
    ctx.fillText(`${fmt(S.v[1])}·ĵ′`, m2[0] + 6, m2[1] - 6);
    ctx.restore();
  }

  // ghost of the original v once the animation departs from t=0
  if (S.t > 0.02) {
    ctx.save(); ctx.globalAlpha = 0.35;
    arrow([0, 0], S.v, cv, 2);
    ctx.restore();
  }
  arrow([0, 0], img, cv, 3.2, S.t < 0.02 ? "v" : "Mv");
  handleDot(S.t > 0.02 ? img : S.v, cv);
  if (S.t > 0.02) handleDot(S.v, "rgba(251,191,36,0.4)");
}

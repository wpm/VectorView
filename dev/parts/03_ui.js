/* ================================================================
   Vector View — interaction, UI wiring, presets, concept tours
   ================================================================ */

const $ = (id) => document.getElementById(id);
const matInputs = [$("m00"), $("m01"), $("m10"), $("m11")];

/* ---------------- matrix <-> inputs ---------------- */
function readMatrixInputs() {
  const vals = matInputs.map(el => parseFloat(el.value));
  if (vals.some(x => !isFinite(x))) return;
  S.m = vals;
  S.t = 1; syncSlider();
  refreshPanels();
}
function writeMatrixInputs() {
  matInputs.forEach((el, i) => { el.value = fmt(S.m[i], 2); });
}
matInputs.forEach(el => el.addEventListener("input", readMatrixInputs));

function setMatrix(m, animate = true) {
  S.m = m.slice();
  writeMatrixInputs();
  if (animate) { S.t = 0; play(); } else { S.t = 1; }
  syncSlider();
  refreshPanels();
}

/* ---------------- animation ---------------- */
const tSlider = $("tSlider"), tLabel = $("tLabel"), btnPlay = $("btnPlay");
const ease = (u) => u < 0.5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2) / 2;

let animStart = null, animFrom = 0;
function play() {
  // from wherever t is (restart from 0 if already at the end)
  animFrom = S.t >= 0.999 ? 0 : S.t;
  animStart = performance.now();
  S.playing = true;
  btnPlay.textContent = "❚❚ Pause";
}
function pause() {
  S.playing = false;
  btnPlay.textContent = "▶ Play";
}
btnPlay.addEventListener("click", () => (S.playing ? pause() : play()));

tSlider.addEventListener("input", () => {
  pause();
  S.t = parseFloat(tSlider.value);
  refreshPanels(false);
});
function syncSlider() {
  tSlider.value = S.t;
  tLabel.textContent = "t = " + S.t.toFixed(2);
}

const DURATION = 1700; // ms for a full 0 -> 1 sweep
function tick(now) {
  if (S.playing) {
    const u = Math.min(1, (now - animStart) / (DURATION * (1 - animFrom)));
    S.t = animFrom + (1 - animFrom) * ease(u);
    if (u >= 1) { S.t = 1; pause(); }
    syncSlider();
  }
  render();
  requestAnimationFrame(tick);
}

/* ---------------- toolbar buttons ---------------- */
$("btnIdentity").addEventListener("click", () => setMatrix([1, 0, 0, 1], false));
$("btnTranspose").addEventListener("click", () => setMatrix(LA.transpose(S.m), true));
$("btnInverse").addEventListener("click", () => {
  const inv = LA.inverse(S.m);
  if (inv) setMatrix(inv, true);
});
$("btnIterate").addEventListener("click", () => {
  S.v = LA.apply(S.m, S.v);
  refreshPanels(false);
});
$("btnResetV").addEventListener("click", () => { S.v = [1, 1.5]; refreshPanels(false); });

/* ---------------- toggles ---------------- */
const toggleMap = {
  tgGrid: "grid", tgSquare: "square", tgEigen: "eigen", tgVec: "vec",
  tgPath: "path", tgCircle: "circle", tgKernel: "kernel",
};
for (const [id, key] of Object.entries(toggleMap)) {
  $(id).addEventListener("change", (e) => { S.show[key] = e.target.checked; updateLegend(); });
}
$("tgSnap").addEventListener("change", (e) => { S.snap = e.target.checked; });
function syncToggles() {
  for (const [id, key] of Object.entries(toggleMap)) $(id).checked = S.show[key];
  $("tgSnap").checked = S.snap;
  updateLegend();
}

/* ---------------- presets ---------------- */
const PRESETS = [
  { name: "Rotate 45°",  m: [Math.SQRT1_2, -Math.SQRT1_2, Math.SQRT1_2, Math.SQRT1_2] },
  { name: "Rotate 90°",  m: [0, -1, 1, 0] },
  { name: "Scale",       m: [2, 0, 0, 0.5] },
  { name: "Shear",       m: [1, 1, 0, 1] },
  { name: "Reflect x",   m: [1, 0, 0, -1] },
  { name: "Reflect y=x", m: [0, 1, 1, 0] },
  { name: "Project → x", m: [1, 0, 0, 0] },
  { name: "Rank 1",      m: [1, 2, 0.5, 1] },
  { name: "Symmetric",   m: [2, 1, 1, 2] },
  { name: "Rotate + scale", m: [0.9, -0.7, 0.7, 0.9] },
];
const presetBox = $("presets");
for (const p of PRESETS) {
  const b = document.createElement("button");
  b.textContent = p.name;
  b.addEventListener("click", () => setMatrix(p.m));
  presetBox.appendChild(b);
}

/* ---------------- analysis panel ---------------- */
function refreshPanels(rewriteInputs = true) {
  if (rewriteInputs) writeMatrixInputs();
  syncSlider();

  const m = S.m;
  const det = LA.det(m), tr = LA.trace(m), rank = LA.rank(m);
  const eg = LA.eigen(m);

  const detCls = Math.abs(det) < 1e-9 ? "det-zero" : (det > 0 ? "det-pos" : "det-neg");
  const detNote = Math.abs(det) < 1e-9
    ? " — singular!"
    : (det < 0 ? " — orientation flips" : "");

  // characteristic polynomial λ² − (tr)λ + det
  const trTerm = Math.abs(tr) < 1e-9 ? "" : (tr > 0 ? ` − ${fmt(tr)}λ` : ` + ${fmt(-tr)}λ`);
  const dTerm = Math.abs(det) < 1e-9 ? "" : (det > 0 ? ` + ${fmt(det)}` : ` − ${fmt(-det)}`);
  const charPoly = `λ²${trTerm}${dTerm}`;

  let eigHtml;
  if (eg.complex) {
    const sgn = eg.im >= 0 ? "±" : "∓";
    eigHtml = `<span class="lbl">eigenvalues</span> <span class="eig">λ = ${fmt(eg.re)} ${sgn} ${fmt(Math.abs(eg.im))}i</span><br>` +
              `<span class="warn">complex — no real eigenvectors; M rotates every direction</span>`;
  } else if (eg.uniform) {
    eigHtml = `<span class="lbl">eigenvalues</span> <span class="eig">λ = ${fmt(eg.l1)} (repeated)</span><br>` +
              `<span class="lbl">M = λI — <i>every</i> vector is an eigenvector</span>`;
  } else if (eg.defective) {
    const v = eg.vecs[0].v;
    eigHtml = `<span class="lbl">eigenvalues</span> <span class="eig">λ = ${fmt(eg.l1)} (repeated)</span><br>` +
              `<span class="lbl">eigenvector</span> <span class="eig">(${fmt(v[0])}, ${fmt(v[1])})</span> <span class="warn">only one — defective</span>`;
  } else {
    eigHtml = eg.vecs.map(({ l, v }) =>
      `<span class="lbl">λ = </span><span class="eig">${fmt(l)}</span><span class="lbl"> along </span><span class="eig">(${fmt(v[0])}, ${fmt(v[1])})</span>`
    ).join("<br>");
  }

  let rankNote = "";
  if (rank === 1) rankNote = ` <span class="warn">— plane collapses to a line</span>`;
  if (rank === 0) rankNote = ` <span class="warn">— everything maps to the origin</span>`;

  $("analysis").innerHTML =
    `<span class="lbl">det M = </span><span class="${detCls}">${fmt(det)}${detNote}</span><br>` +
    `<span class="lbl">trace = </span>${fmt(tr)}<span class="lbl">&nbsp;&nbsp;rank = </span>${rank}${rankNote}<br>` +
    `<span class="lbl">char. poly&nbsp; </span>${charPoly}<br>` + eigHtml;

  // ---- vector panel ----
  const img = LA.apply(m, S.v);
  const inv = LA.inverse(m);
  let coordLine;
  if (inv) {
    const c = LA.apply(inv, S.v);
    coordLine = `<span class="lbl">v in basis {î′, ĵ′}:&nbsp;</span>(${fmt(c[0])}, ${fmt(c[1])})<br>` +
                `<span class="lbl">(solves M·c = v, i.e. c = M⁻¹v)</span>`;
  } else {
    coordLine = `<span class="lbl">M is singular — the new "basis" doesn't span the plane</span>`;
  }
  $("vecInfo").innerHTML =
    `<span class="lbl">v&nbsp; = </span><span class="v">(${fmt(S.v[0])}, ${fmt(S.v[1])})</span><br>` +
    `<span class="lbl">Mv = </span><span class="v">(${fmt(img[0])}, ${fmt(img[1])})</span>` +
    `<span class="lbl"> = ${fmt(S.v[0])}·(Mî) ${S.v[1] < 0 ? "−" : "+"} ${fmt(Math.abs(S.v[1]))}·(Mĵ)</span><br>` + coordLine;
}

/* ---------------- legend ---------------- */
function updateLegend() {
  const rows = [
    ["var(--ihat)", "î → column 1 of M", true],
    ["var(--jhat)", "ĵ → column 2 of M", true],
    ["var(--vvec)", "v and Mv", S.show.vec],
    ["var(--eigen)", "eigenvectors", S.show.eigen],
    ["var(--kernel)", "null space", S.show.kernel && LA.rank(S.m) === 1],
    ["var(--colspace)", "column space", S.show.kernel && LA.rank(S.m) === 1],
  ];
  $("legend").innerHTML = rows.filter(r => r[2])
    .map(([c, t]) => `<div class="row"><span class="chip" style="background:${c}"></span>${t}</div>`)
    .join("");
}

/* ---------------- pointer interaction ---------------- */
const HIT = 14; // px
function hitTest(sx, sy) {
  const M = curM();
  const near = (p) => { const s = toScreen(p); return Math.hypot(s[0]-sx, s[1]-sy) < HIT; };
  if (S.show.vec) {
    if (near(LA.apply(M, S.v))) return "vimg";
    if (S.t > 0.02 && near(S.v)) return "v";
  }
  if (near([M[0], M[2]])) return "i";
  if (near([M[1], M[3]])) return "j";
  return "pan";
}

function snapPt(p) {
  if (!S.snap) return [Math.round(p[0]*100)/100, Math.round(p[1]*100)/100];
  return [Math.round(p[0]*2)/2, Math.round(p[1]*2)/2];
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  const r = canvas.getBoundingClientRect();
  const sx = e.clientX - r.left, sy = e.clientY - r.top;
  S.drag = hitTest(sx, sy);
  if ((S.drag === "i" || S.drag === "j") && S.t < 0.999) {
    // grabbing a basis vector snaps the animation to the fully applied state
    pause(); S.t = 1; syncSlider();
  }
  S.dragLast = [sx, sy];
  canvas.classList.add("dragging");
});

canvas.addEventListener("pointermove", (e) => {
  const r = canvas.getBoundingClientRect();
  const sx = e.clientX - r.left, sy = e.clientY - r.top;
  if (!S.drag) {
    canvas.style.cursor = hitTest(sx, sy) === "pan" ? "grab" : "pointer";
    return;
  }
  const w = toWorld(sx, sy);
  if (S.drag === "pan") {
    S.origin[0] += sx - S.dragLast[0];
    S.origin[1] += sy - S.dragLast[1];
    S.dragLast = [sx, sy];
  } else if (S.drag === "i") {
    const p = snapPt(w); S.m[0] = p[0]; S.m[2] = p[1];
    S.t = 1; writeMatrixInputs(); refreshPanels(false);
  } else if (S.drag === "j") {
    const p = snapPt(w); S.m[1] = p[0]; S.m[3] = p[1];
    S.t = 1; writeMatrixInputs(); refreshPanels(false);
  } else if (S.drag === "v") {
    S.v = snapPt(w); refreshPanels(false);
  } else if (S.drag === "vimg") {
    // dragging the image Mv: move v so its image lands under the cursor
    const inv = LA.inverse(curM());
    S.v = inv ? snapPt(LA.apply(inv, w)) : S.v;
    if (S.t < 0.02) S.v = snapPt(w); // at t=0 the image *is* v
    refreshPanels(false);
  }
});

canvas.addEventListener("pointerup", () => { S.drag = null; canvas.classList.remove("dragging"); });
canvas.addEventListener("pointercancel", () => { S.drag = null; canvas.classList.remove("dragging"); });

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const sx = e.clientX - r.left, sy = e.clientY - r.top;
  const before = toWorld(sx, sy);
  S.scale = Math.min(400, Math.max(18, S.scale * Math.exp(-e.deltaY * 0.0012)));
  const after = toScreen(before);
  S.origin[0] += sx - after[0];
  S.origin[1] += sy - after[1];
}, { passive: false });

/* ---------------- concept tours ---------------- */
const TOURS = [
  {
    title: "A matrix is where the basis lands",
    body: `Every linear transformation is completely determined by what it does to
           <b style="color:var(--ihat)">î</b> and <b style="color:var(--jhat)">ĵ</b> —
           and those images are exactly the <b>columns of M</b>.
           <p>Press <b>▶ Play</b> and watch the grid carry î to column 1 and ĵ to column 2.
           Then <b>drag the arrow tips</b>: you are literally editing the matrix.</p>`,
    setup: () => {
      setMatrix([1, 1, 0, 1]); // shear
      Object.assign(S.show, { grid: true, square: false, eigen: false, vec: false, path: false, circle: false, kernel: false });
    },
  },
  {
    title: "Mv keeps v's coordinates — in the new basis",
    body: `The vector <code>v = (1, 1.5)</code> means "1 step along î, then 1.5 steps along ĵ."
           After the transform, <code>Mv</code> is built from <i>the same recipe</i> with the new
           basis vectors: <code>Mv = 1·(Mî) + 1.5·(Mĵ)</code>.
           <p>The dashed staircase shows that recipe. Drag the <b>t slider</b> slowly back and
           forth and watch the staircase bend with the grid while the coordinates never change. This is why matrix–vector
           multiplication is just a change of where the basis points.</p>`,
    setup: () => {
      setMatrix([1, -0.5, 0.5, 1]);
      S.v = [1, 1.5];
      Object.assign(S.show, { grid: true, square: false, eigen: false, vec: true, path: true, circle: false, kernel: false });
    },
  },
  {
    title: "Determinant = area scaling factor",
    body: `The green square has area 1. After the transform it becomes a parallelogram whose
           area is exactly <b>|det M|</b>. Drag <b style="color:var(--ihat)">î</b> and
           <b style="color:var(--jhat)">ĵ</b> around and watch the area readout track the determinant —
           including hitting 0 the instant the two columns line up.
           <p>Now load the <b>Reflect x</b> preset: the area stays 1 but det = −1 —
           a negative determinant means <b>orientation flips</b> (the grid turns "inside out").</p>`,
    setup: () => {
      setMatrix([2, 0, 0, 0.5]);
      Object.assign(S.show, { grid: true, square: true, eigen: false, vec: false, path: false, circle: false, kernel: false });
    },
  },
  {
    title: "Eigenvectors: the directions that don't turn",
    body: `Most vectors get knocked off their original line. The purple dashed lines mark the
           special directions that <b>only stretch</b> — the eigenvectors. Their stretch factors
           are the eigenvalues.
           <p>Play the animation: everything shears around, but vectors on the purple lines
           slide along them. For this symmetric matrix, λ = 3 along (1,1) and λ = 1 along (1,−1).
           Try dragging the basis vectors and watch the eigen-directions move.</p>`,
    setup: () => {
      setMatrix([2, 1, 1, 2]);
      Object.assign(S.show, { grid: true, square: false, eigen: true, vec: false, path: false, circle: false, kernel: false });
    },
  },
  {
    title: "Null space: what gets crushed",
    body: `This matrix has det = 0, so it squashes the whole plane onto a line — the
           <b style="color:var(--colspace)">column space</b>. Everything on the
           <b style="color:var(--kernel)">null space</b> line gets crushed to the origin.
           <p>Drag <b style="color:var(--vvec)">v</b> onto the rose dashed line and watch Mv vanish.
           Rank 1 = one dimension survives; the other dimension is the price, since
           rank + nullity = 2.</p>`,
    setup: () => {
      setMatrix([1, 2, 0.5, 1]);
      S.v = [2, -1];
      Object.assign(S.show, { grid: true, square: true, eigen: false, vec: true, path: false, circle: false, kernel: true });
    },
  },
  {
    title: "Complex eigenvalues: rotation in disguise",
    body: `This matrix rotates while it scales, so <i>no</i> real direction stays on its own line —
           the eigenvalues are complex: λ = 0.9 ± 0.7i. The magnitude |λ| ≈ 1.14 tells you each
           application grows vectors ~14%, and the angle tells you how much they turn.
           <p>Click <b>v ← Mv</b> repeatedly and watch v spiral outward. Try the unit-circle
           toggle to see circles map to tilted ellipses.</p>`,
    setup: () => {
      setMatrix([0.9, -0.7, 0.7, 0.9]);
      S.v = [1.5, 0];
      Object.assign(S.show, { grid: true, square: false, eigen: true, vec: true, path: false, circle: true, kernel: false });
    },
  },
  {
    title: "Power iteration: eigenvectors attract",
    body: `Click <b>v ← Mv (iterate)</b> again and again. Each click multiplies by M, and v swings
           toward the eigenvector with the <b>largest |λ|</b> (here λ = 3 along (1,1)) — the dominant
           direction wins because its component gets multiplied by 3 each round while the other
           only survives ×1.
           <p>This is exactly how power iteration computes eigenvectors numerically, and it's the
           germ of PageRank. (Zoom out with the scroll wheel — v grows fast!)</p>`,
    setup: () => {
      setMatrix([2, 1, 1, 2], false);
      S.v = [1.5, -0.5];
      Object.assign(S.show, { grid: false, square: false, eigen: true, vec: true, path: false, circle: false, kernel: false });
    },
  },
];

const tourBox = $("tourbtns"), tourCard = $("tourCard");
TOURS.forEach((tour, i) => {
  const b = document.createElement("button");
  b.innerHTML = `<span class="num">${i + 1}</span>${tour.title}`;
  b.addEventListener("click", () => {
    tour.setup();
    syncToggles();
    refreshPanels();
    tourCard.className = "show";
    tourCard.innerHTML = `<button class="close" title="close">✕</button><h3>${tour.title}</h3><p>${tour.body}</p>`;
    tourCard.querySelector(".close").addEventListener("click", () => { tourCard.className = ""; });
    tourCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  tourBox.appendChild(b);
});

/* ---------------- boot ---------------- */
resize();
syncToggles();
refreshPanels();
setMatrix([2, 1, 1, 2]);   // opening demo: symmetric matrix, animated on load
requestAnimationFrame(tick);

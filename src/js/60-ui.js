// ================================================================ UI
let mode = "program";
const STATS = cycleStats();
const fmt = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : "–");

// panels
const openPanels = { program: new Set(["live-card", "ws-card"]), manual: new Set(["live-card", "jog-card"]) };
function syncPanels() {
  document.querySelectorAll(".rail-item[data-panel]").forEach((b) => {
    const allowed = b.dataset.modes.split(" ").includes(mode);
    b.hidden = !allowed;
    b.setAttribute("aria-pressed", String(allowed && openPanels[mode].has(b.dataset.panel)));
  });
  document.querySelectorAll(".drawer .card").forEach((c) => { c.hidden = !openPanels[mode].has(c.id); });
  $("drawer").hidden = openPanels[mode].size === 0;
  requestAnimationFrame(resize);
}
document.querySelectorAll(".rail-item[data-panel]").forEach((b) => b.addEventListener("click", () => {
  const s = openPanels[mode]; s.has(b.dataset.panel) ? s.delete(b.dataset.panel) : s.add(b.dataset.panel); syncPanels();
}));
document.querySelectorAll(".card .close").forEach((b) => b.addEventListener("click", () => { openPanels[mode].delete(b.closest(".card").id); syncPanels(); }));
if (matchMedia("(max-width: 900px)").matches) { openPanels.program = new Set(); openPanels.manual = new Set(); }

// ---------------------------------------------------------------- program list
const progSegs = segs.filter((s) => s.kind !== "end" && s.t1 - s.t0 > 1e-6);
$("program-total").textContent = `${progSegs.length} steps · ${DURATION.toFixed(1)} s`;
const programRows = progSegs.map((s) => {
  const li = document.createElement("li");
  li.innerHTML = `<i class="fill"></i><span class="chip delta">${s.k != null ? "#" + String(s.k + 1).padStart(2, "0") : "ROBOT"}</span><span class="label"></span><span class="dur">${(s.t1 - s.t0).toFixed(2)} s</span><code></code>`;
  li.querySelector(".label").textContent = LABEL[s.kind];
  li.querySelector(".label").insertAdjacentHTML("beforeend", `<small>${s.t0.toFixed(2)}</small>`);
  li.querySelector("code").textContent = CMD[s.kind]();
  li.addEventListener("click", () => seek(s.t0 + 1e-3));
  $("program").append(li); return li;
});

// ---------------------------------------------------------------- working range SVG (robot plane, flange)
function drawWorkspace() {
  const W = 340, H = 250, s = 250, cx = W / 2, z0 = flangeTop + 0.08;     // px per metre, top margin
  const X = (x) => cx - x * s, Zp = (z) => 18 + (z0 - z) * s;    // mirrored: as seen from the operator side (+y)
  const ds = dsOutline.pts.map((p) => `${X(p[0]).toFixed(1)},${Zp(p[2]).toFixed(1)}`).join(" ");
  const path = flangePts.filter((_, i) => i % 2 === 0).map((p) => `${X(p[0]).toFixed(1)},${Zp(p[2]).toFixed(1)}`).join(" ");
  const pk = [P.pick, P.place].map((p) => [X(p[0]), Zp(p[1] + TOOL.len)]);
  const belt = (B, col) => `<rect x="${X(B.x + B.w / 2)}" y="${Zp(0)}" width="${B.w * s}" height="5" fill="${col}" opacity="0.6"/>`;
  $("ws").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Working range and cycle path">
    <polyline points="${ds}" fill="none" stroke="${css("--faint")}" stroke-dasharray="4 3"/>
    <rect x="${X(0.3)}" y="${Zp(flangeTop)}" width="${0.6 * s}" height="${0.4 * s}" fill="${css("--delta-soft")}" stroke="${css("--delta")}"/>
    ${belt(BELTS.A, css("--t3a"))}${belt(BELTS.B, css("--t3b"))}
    <polyline points="${path}" fill="none" stroke="${css("--delta")}" stroke-width="2"/>
    ${pk.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="4" fill="${css(i ? "--t3b" : "--t3a")}"/>`).join("")}
    <circle id="ws-dot" r="5" fill="${css("--accent")}"/>
    <text x="${X(0.5)}" y="12">1000 × 400 datasheet · operator view</text>
    <text x="${X(0.29)}" y="${Zp(flangeTop) + 26}">600 × 400 required</text>
    <text x="${X(BELTS.A.x) - 14}" y="${Zp(0) + 18}">belt A</text><text x="${X(BELTS.B.x) - 14}" y="${Zp(0) + 18}">belt B</text>
  </svg>`;
}
function moveWsDot(tcp) {
  const d = document.getElementById("ws-dot"); if (!d) return;
  const s = 250, z0 = flangeTop + 0.08;
  d.setAttribute("cx", (170 - tcp[0] * s).toFixed(1)); d.setAttribute("cy", (18 + (z0 - tcp[1] - TOOL.len) * s).toFixed(1));
}

// ---------------------------------------------------------------- joints
const TH_RANGE = (() => {        // upper-arm angle range over the datasheet working range (reference for the bars)
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i <= 40; i++) for (let j = 0; j <= 16; j++) {
    const q = ik2([-0.5 + i / 40, flangeTop - 0.4 * j / 16 - TOOL.len]); if (!q) continue;
    lo = Math.min(lo, ...q); hi = Math.max(hi, ...q);
  }
  return [lo, hi];
})();
const TQ_MAX = Math.max(...S.torque.flat().map(Math.abs));
const jointRows = ["M2 · left arm", "M1 · right arm"].map((name) => {
  const row = document.createElement("div"); row.className = "joint";
  row.innerHTML = `<span>${name}</span><div class="track delta"><i></i></div><span class="v">0°</span>`;
  const trow = document.createElement("div"); trow.className = "joint";
  trow.innerHTML = `<span>torque</span><div class="bar"><i></i></div><span class="v">0 Nm</span>`;
  $("joints").append(row, trow);
  return { i: row.querySelector("i"), v: row.querySelector(".v"), bi: trow.querySelector("i"), bv: trow.querySelector(".v") };
});
$("joints").insertAdjacentHTML("beforeend", `<p class="small-note">Bars: angle within the range used over the datasheet working range (${fmt(TH_RANGE[0] * DEG, 1)}° … ${fmt(TH_RANGE[1] * DEG, 1)}°). Torque at the gearbox output from τ = Jᵀ·m(a + g), scale ${fmt(TQ_MAX, 0)} Nm (cycle peak).</p>`);
function showJoints(th, tq) {
  jointRows.forEach((r, i) => {
    const u = th ? (th[i] - TH_RANGE[0]) / (TH_RANGE[1] - TH_RANGE[0]) : 0;
    r.i.style.left = `${clamp(u, 0, 1) * 100}%`; r.v.textContent = th ? `${(th[i] * DEG).toFixed(1)}°` : "–";
    const q = tq ? Math.abs(tq[i]) : 0;
    r.bi.style.width = `${clamp(q / TQ_MAX, 0, 1) * 100}%`; r.bv.textContent = tq ? `${tq[i].toFixed(1)} Nm` : "–";
  });
}

// ---------------------------------------------------------------- report
const minClear = S.clear.reduce((b, c, i) => (c.m < b.m ? { ...c, at: i * S.dt } : b), { m: Infinity });
function renderReport() {
  const rows = [
    ["Robot", "DuoPod RVS2-1000-3kg (2 DOF, ceiling)"],
    ["Arms L1 / L2", `${ROBOT.L1 * 1000} / ${ROBOT.L2 * 1000} mm`],
    ["Motor spacing / plate", `${ROBOT.b * 2000} / ${ROBOT.e * 2000} mm`],
    ["Datasheet range", "1000 × 400 mm (+ arc to 510)"],
    ["Required range", "600 × 400 mm, inside ✓"],
    ["Mounting face", `${fmt(ROBOT.mountZ * 1000)} mm above belts`],
    ["Payload", `${MASS.payload} kg carton + ${TOOL.mass} kg gripper`],
    ["Cycle period", `${fmt(STATS.period, 3)} s → ${fmt(STATS.perMin, 1)} /min`],
    ["Belt B pitch", `${fmt(STATS.pitchB * 1000)} mm at ${BELTS.B.v} m/s`],
    ["Peak TCP speed", `${fmt(Math.max(...S.speed), 2)} m/s`],
    ["Peak TCP accel", `${fmt(Math.max(...S.acc), 1)} m/s² (${fmt(Math.max(...S.acc) / 9.81, 1)} g)`],
    ["Peak torque M1 / M2", `${fmt(Math.max(...S.torque.map((t) => Math.abs(t[1]))), 1)} / ${fmt(Math.max(...S.torque.map((t) => Math.abs(t[0]))), 1)} Nm`],
    ["Transmission angle", `${fmt(Math.min(...S.mu.flat()))}…${fmt(Math.max(...S.mu.flat()))}°`],
    ["Min clearance", `<span class="${minClear.m >= 0.01 ? "ok" : "warn"}">${fmt(minClear.m * 1000, 1)} mm</span> · ${minClear.what}`],
  ];
  $("report").innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
}
renderReport();
function showTcp(tcp, th) {
  $("tcp").innerHTML = `<span class="small-note" style="margin:0">TCP</span>` +
    [["x", tcp[0] * 1000], ["z", tcp[1] * 1000], ["flange z", (tcp[1] + TOOL.len) * 1000]].map(([k, v]) => `<div><small>${k}</small><b>${v.toFixed(1)}</b></div>`).join("");
}
$("copy-csv").addEventListener("click", async () => {
  const lines = ["t_s,x_mm,z_mm,thL_deg,thR_deg,tauL_Nm,tauR_Nm"];
  for (let i = 0; i < S.n; i++) {
    const p = S.tcp[i], th = S.th[i] || [NaN, NaN], tq = S.torque[i];
    lines.push([(i * S.dt).toFixed(4), (p[0] * 1000).toFixed(2), (p[1] * 1000).toFixed(2), (th[0] * DEG).toFixed(3), (th[1] * DEG).toFixed(3), tq[0].toFixed(2), tq[1].toFixed(2)].join(","));
  }
  try { await navigator.clipboard.writeText(lines.join("\n")); $("copy-note").textContent = `Copied ${S.n} rows.`; }
  catch { $("copy-note").textContent = "Clipboard not available in this browser."; }
});

// ---------------------------------------------------------------- timeline lanes: robot, belt A escapement, belt B arrivals
const lanes = $("lanes");
const KIND_ALPHA = { down: 0.55, grip: 1, transfer: 0.85, release: 1, back: 0.45 };
function drawLanes() {
  const w = lanes.clientWidth, h = lanes.clientHeight; if (!w) return;
  const dpr = Math.min(devicePixelRatio, 2); lanes.width = w * dpr; lanes.height = h * dpr;
  const g = lanes.getContext("2d"); g.scale(dpr, dpr); g.clearRect(0, 0, w, h);
  const X = (t) => (t / DURATION) * w;
  [["--delta", 4], ["--t3a", 21], ["--t3b", 38]].forEach(([v, y]) => { g.fillStyle = css("--line"); g.fillRect(0, y, w, 11); });
  g.fillStyle = css("--delta");
  for (const s of segs) if (KIND_ALPHA[s.kind]) { g.globalAlpha = KIND_ALPHA[s.kind]; g.fillRect(X(s.t0), 4, Math.max(1, X(s.t1) - X(s.t0)), 11); }
  g.globalAlpha = 0.85; g.fillStyle = css("--t3a");
  let open = null;
  for (const e of escape) { if (e.ev === "release") open = e.t; else if (open != null) { g.fillRect(X(open), 21, Math.max(1, X(e.t) - X(open)), 11); open = null; } }
  g.fillStyle = css("--t3b");
  for (const c of cartons) if (c.bAt != null) g.fillRect(X(c.bAt), 38, Math.max(2, X(Math.min(DURATION, c.bAt + CARTON.y / BELTS.B.v)) - X(c.bAt)), 11);
  g.globalAlpha = 1;
}
$("clock-total").textContent = DURATION.toFixed(1);
$("timeline").setAttribute("aria-valuemax", DURATION.toFixed(1));

// ---------------------------------------------------------------- jog (manual mode): TCP x / z in the robot plane
const jog = { x: P.ready[0], z: P.ready[1], vac: false };
const jogDefs = [
  { key: "x", label: "x mm", min: -500, max: 500 },
  { key: "z", label: "z mm", min: Math.round((flangeTop - 0.51 - TOOL.len) * 1000), max: Math.round((flangeTop - TOOL.len) * 1000) },
];
const jogRows = jogDefs.map((d) => {
  const row = document.createElement("div"); row.className = "jog-row delta";
  row.innerHTML = `<label>${d.label}</label><input type="range" min="${d.min}" max="${d.max}" step="1"><input type="number" min="${d.min}" max="${d.max}" step="1">`;
  const [r, n] = row.querySelectorAll("input");
  const set = (v) => { const q = clamp(Number(v), d.min, d.max); const prev = jog[d.key]; jog[d.key] = q / 1000; if (!ik2([jog.x, jog.z])) jog[d.key] = prev; syncJog(); };
  r.addEventListener("input", () => set(r.value)); n.addEventListener("change", () => set(n.value));
  $("jog").append(row); return { d, r, n };
});
function syncJog() {
  for (const { d, r, n } of jogRows) { r.value = n.value = Math.round(jog[d.key] * 1000); }
  const q = ik2([jog.x, jog.z]);
  $("jog-note").textContent = q ? `θ M2 ${(q[0] * DEG).toFixed(1)}° · θ M1 ${(q[1] * DEG).toFixed(1)}°` : "out of reach";
}
$("jog-vac").addEventListener("change", (e) => { jog.vac = e.target.checked; });
$("jog-home").addEventListener("click", () => { [jog.x, jog.z] = P.ready; syncJog(); });
$("jog-pick").addEventListener("click", () => { [jog.x, jog.z] = P.pick; syncJog(); });
$("jog-place").addEventListener("click", () => { [jog.x, jog.z] = P.place; syncJog(); });
syncJog();

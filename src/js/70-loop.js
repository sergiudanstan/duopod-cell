// ---------------------------------------------------------------- playback
let time = 0, playing = true, speed = 1;
const playIcon = $("play-icon");
function setPlaying(p) {
  playing = p;
  playIcon.innerHTML = p ? '<path d="M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z"/>' : '<path d="M7 4.5v15l13-7.5z"/>';
  $("play").setAttribute("aria-label", p ? "Pause" : "Play");
}
function seek(t) { time = clamp(t, 0, DURATION); if (mode !== "program") setMode("program"); }
$("play").addEventListener("click", () => { if (mode !== "program") setMode("program"); if (!playing && time >= DURATION) time = 0; setPlaying(!playing); });
$("restart").addEventListener("click", () => { time = 0; });
document.querySelectorAll(".chips button").forEach((b) => b.addEventListener("click", () => {
  speed = Number(b.dataset.speed); document.querySelectorAll(".chips button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
}));
function syncTrail() { const on = $("trail").checked && mode === "program"; pathGhost.visible = pathLive.visible = on; }
$("trail").addEventListener("change", syncTrail);
$("guards").addEventListener("change", (e) => { guardGroup.visible = e.target.checked; });
const tl = $("timeline");
let scrubbing = false;
const scrubTo = (e) => { const r = tl.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * DURATION); };
tl.addEventListener("pointerdown", (e) => { scrubbing = true; tl.setPointerCapture(e.pointerId); scrubTo(e); });
tl.addEventListener("pointermove", (e) => { if (scrubbing) scrubTo(e); });
tl.addEventListener("pointerup", () => { scrubbing = false; });
tl.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") seek(time + 0.5); if (e.key === "ArrowLeft") seek(time - 0.5); });
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) { e.preventDefault(); $("play").click(); }
});
function setMode(m) {
  mode = m;
  document.querySelectorAll(".mode-switch button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
  if (m === "manual") { setPlaying(false); [jog.x, jog.z] = robotTcp(time); syncJog(); }
  syncTrail(); syncPanels();
}
document.querySelectorAll(".mode-switch button").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

// ---------------------------------------------------------------- per-frame state
let lastRow = -1;
function update(dt) {
  if (mode === "program" && playing && !scrubbing) {
    time += dt * speed;
    if (time >= DURATION) { if ($("loop").checked) time = 0; else { time = DURATION; setPlaying(false); } }
  }
  const t = time, i = clamp(Math.round(t / S.dt), 0, S.n - 1);
  const tcp = mode === "program" ? robotTcp(t) : [jog.x, jog.z];
  const pose = setRobot(tcp);
  const st = setConveyors(mode === "program" ? t : 0);
  const cs = placeCartons(mode === "program" ? t : 0);
  const vac = mode === "program" ? vacuumOn(t) : jog.vac;
  const seg = segAt(t);
  // overlay
  if (mode === "program") {
    $("now-robot").textContent = LABEL[seg.kind] + (seg.k != null ? ` · carton ${seg.k + 1}` : "");
    $("cmd-robot").textContent = CMD[seg.kind]();
  } else { $("now-robot").textContent = "Manual jog"; $("cmd-robot").textContent = `MOVL x=${(tcp[0] * 1000).toFixed(0)} z=${(tcp[1] * 1000).toFixed(0)}`; }
  $("now-a").textContent = st.open ? "Escapement open · next carton to the stop" : `Accumulating · queue ${cs.queue}`;
  $("cmd-a").textContent = st.open ? `DO[3:blade]=OFF${st.clampOn ? " ; DO[4:clamp]=ON" : ""} (pick column clear, z ≥ ${(Z.clear * 1000).toFixed(0)})` : "DO[3:blade]=ON ; DO[4:clamp]=OFF";
  $("now-b").textContent = `Running ${(BELTS.B.v * 1000).toFixed(0)} mm/s · ${cs.done} placed`;
  $("cmd-b").textContent = `pitch ${(STATS.pitchB * 1000).toFixed(0)} mm`;
  // live card
  const c = mode === "program" ? S.clear[i] : null;
  $("s-clear").textContent = c ? (c.m * 1000).toFixed(0) : "–"; $("s-clear-pair").textContent = c ? c.what : "manual";
  const loaded = vac && seg.kind !== "grip" && mode === "program";
  $("s-vac").textContent = vac ? "On" : "Off"; $("s-load").textContent = loaded ? `carton, ${MASS.payload} kg` : "empty, 0 kg";
  $("s-done").textContent = cs.done; $("s-of").textContent = `/ ${N_CARTONS}`; $("s-queue").textContent = `queue on belt A: ${cs.queue}`;
  $("s-rate").textContent = fmt(STATS.perMin, 1); $("s-period").textContent = `period ${fmt(STATS.period, 2)} s`;
  $("s-v").textContent = mode === "program" ? S.speed[i].toFixed(2) : "0.00"; $("s-a").textContent = mode === "program" ? `accel ${S.acc[i].toFixed(1)} m/s²` : "–";
  $("s-esc").textContent = st.open ? "Open" : "Closed"; $("s-clamp").textContent = st.clampOn ? "clamp on" : "clamp open";
  showJoints(pose && pose.th, mode === "program" ? S.torque[i] : null);
  showTcp(tcp);
  moveWsDot(tcp);
  // path, program, playhead
  pathLive.geometry.setDrawRange(0, mode === "program" ? i + 1 : 0);
  $("playhead").style.left = `${(t / DURATION) * 100}%`;
  $("clock-now").textContent = t.toFixed(1);
  const row = progSegs.findIndex((s) => t >= s.t0 && t < s.t1);
  if (row !== lastRow) {
    programRows.forEach((li, k) => { li.classList.toggle("active", k === row); li.classList.toggle("done", progSegs[k].t1 <= t); });
    if (row >= 0 && !$("program-card").hidden) programRows[row].scrollIntoView({ block: "nearest" });
    lastRow = row;
  }
  if (row >= 0) programRows[row].querySelector(".fill").style.width = `${((t - progSegs[row].t0) / (progSegs[row].t1 - progSegs[row].t0)) * 100}%`;
  eyeBeam.material.opacity = st && cartons.some((cc) => { const p = cartonAt(cc, t); return p && p[2] === 0 && p[0] === BELTS.A.x && p[1] + CARTON.y / 2 > eyeY; }) ? 0.12 : 0.55;
  setStack(mode === "program" && playing ? "run" : "hold");
  paintHmi(dt, c ? c.m : NaN, cs);
}

// ---------------------------------------------------------------- stack lamp and HMI
let stackState = "";
function setStack(state) {
  if (state === stackState) return;
  stackState = state;
  stackLamps.green.emissiveIntensity = state === "run" ? 1.5 : 0;
  stackLamps.amber.emissiveIntensity = state === "hold" ? 1.5 : 0;
  stackLamps.red.emissiveIntensity = state === "alarm" ? 1.5 : 0;
}
let hmiAcc = 0.5;
function paintHmi(dt, clearM, cs) {
  hmiAcc += dt; if (hmiAcc < 0.5) return; hmiAcc = 0;
  const cv = hmiScreen.canvas, g = cv.getContext("2d");
  g.fillStyle = "#14181e"; g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = "#8fd0c8"; g.font = "600 34px sans-serif"; g.fillText("TRANSFER CELL", 28, 56);
  const hold = !(mode === "program" && playing);
  g.fillStyle = hold ? "#e0b15a" : "#7ddea0"; g.font = "700 54px sans-serif"; g.fillText(hold ? "HOLD" : "RUN", 28, 126);
  g.fillStyle = "#d7dee6"; g.font = "500 27px sans-serif";
  [`Placed   ${cs.done} / ${N_CARTONS}`, `Rate     ${fmt(STATS.perMin, 1)} /min`, `Queue A  ${cs.queue}`, `Clear    ${Number.isFinite(clearM) ? Math.round(clearM * 1000) : "–"} mm`]
    .forEach((line, k) => g.fillText(line, 28, 186 + k * 44));
  hmiScreen.texture.needsUpdate = true;
}

// ---------------------------------------------------------------- loop
const timer = new THREE.Timer();
timer.connect(document);
function frame() {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.1);
  if (flight) {
    flight.t = Math.min(1, flight.t + dt / 0.8); const e = ease(flight.t);
    camera.position.lerpVectors(flight.fromP, flight.toP, e); controls.target.lerpVectors(flight.fromT, flight.toT, e);
    if (flight.t >= 1) flight = null;
  }
  update(dt);
  controls.update();
  renderFrame();
  requestAnimationFrame(frame);
}
window.addEventListener("themechange", applyTheme);
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
syncPanels(); resize(); applyTheme(); setPlaying(true);
window.pc = {
  get DURATION() { return DURATION; },
  get S() { return S; },
  get cad() { return cadLoaded; },
  seek, pause: () => setPlaying(false), play: () => setPlaying(true), setView,
  setCamera: (pos, target) => { flight = null; camera.position.set(...pos); controls.target.set(...target); controls.update(); },
  render: () => { update(0); controls.update(); renderFrame(); },
  cadCheck, stats: STATS, minClear,
};
window.pcReady = true;
requestAnimationFrame(frame);

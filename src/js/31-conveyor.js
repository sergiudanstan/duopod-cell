// Two belt conveyors along y, guides, fixed end stop, escapement (blade + side clamp), photo-eye. Plan §3.
const beltMats = {};
const beltParts = {};
for (const [name, B] of Object.entries(BELTS)) {
  const L = B.y1 - B.y0, yc = (B.y0 + B.y1) / 2, bw = B.w + 0.04;
  const m = M.beltGreen.clone(); m.map = M.beltGreen.map.clone(); m.map.repeat.set(2, L / 0.16); m.map.needsUpdate = true;
  beltMats[name] = m;
  rbox(bw, L, 0.006, 0.002, m, B.x, yc, -0.003, world);                                  // belt top run
  for (const s of [-1, 1]) {
    const xs = B.x + s * (bw / 2 + 0.015);
    rbox(0.030, L + 0.02, 0.110, 0.003, M.aluClear, xs, yc, -0.050, world);               // side frame
    for (let y = B.y0 + 0.15; y < B.y1; y += 0.40) addBolt(V(xs + s * 0.015, y, -0.03), V(s, 0, 0));
    // guide rail on brackets
    const xg = B.x + s * (B.w / 2 + GUIDE.t / 2);
    rbox(GUIDE.t, L, GUIDE.top - 0.010, 0.002, M.guideHDPE, xg, yc, (GUIDE.top + 0.010) / 2, world);
    for (let y = B.y0 + 0.12; y < B.y1 - 0.05; y += 0.45) {
      const post = rod(0.006, M.steel, 10); placeRod(post, V(xs, y, 0.0), V(xs, y, 0.035));
      const arm = rod(0.005, M.steel, 10); placeRod(arm, V(xs, y, 0.035), V(xg + s * GUIDE.t / 2, y, 0.035));
    }
  }
  for (const y of [B.y0, B.y1]) { const d = vcyl(0.040, bw, M.steel, B.x, y, -0.042, 32); d.rotation.set(0, 0, Math.PI / 2); }
  // legs every <= 0.9 m, feet on the floor
  for (let y = B.y0 + 0.12; y <= B.y1 - 0.05; y += Math.min(0.9, (L - 0.24) / Math.ceil((L - 0.24) / 0.9))) for (const s of [-1, 1]) {
    const x = B.x + s * (bw / 2 + 0.015);
    rbox(0.04, 0.04, -0.105 - LAYOUT.floor - 0.03, 0.003, M.aluClear, x, y, (LAYOUT.floor + 0.03 - 0.105) / 2, world);
    lathe([[0, LAYOUT.floor], [0.03, LAYOUT.floor], [0.03, LAYOUT.floor + 0.012], [0.008, LAYOUT.floor + 0.03], [0, LAYOUT.floor + 0.03]], M.blackRubber, world).position.set(x, y, 0);
    if (s > 0) rbox(bw + 0.03, 0.03, 0.03, 0.003, M.aluClear, B.x, y, -0.35, world);
  }
  // drive: geared motor on the outer side at the downstream end
  const yd = B.y1, xo = B.x + Math.sign(B.x) * (bw / 2 + 0.03);
  const gm = vcyl(0.045, 0.12, M.zinc9006, xo + Math.sign(B.x) * 0.06, yd, -0.042, 32); gm.rotation.set(0, 0, Math.PI / 2);
  rbox(0.10, 0.10, 0.10, 0.008, M.motorBlack, xo + Math.sign(B.x) * 0.17, yd, -0.042, world);
  beltParts[name] = { m };
}

// ---------------------------------------------------------------- fixed end stop on belt A (carton front edge at STOP_Y)
{
  const A = BELTS.A;
  rbox(A.w, 0.012, 0.066, 0.002, M.steel, A.x, STOP_Y + 0.006, 0.004 + 0.033, world);
  rbox(A.w - 0.02, 0.004, 0.050, 0.001, M.blackRubber, A.x, STOP_Y + 0.002, 0.040, world);
  for (const s of [-1, 1]) rbox(0.012, 0.05, 0.10, 0.002, M.steel, A.x + s * (A.w / 2 + 0.016), STOP_Y + 0.02, 0.02, world);
}
// photo-eye (retro-reflective) across belt A just before the stop; so = outer side of belt A (+1 or -1 in x)
const so = Math.sign(BELTS.A.x), aIn = (d) => BELTS.A.x - so * d, aOut = (d) => BELTS.A.x + so * d;
const eyeY = STOP_Y - 0.04;
rbox(0.030, 0.020, 0.040, 0.003, M.sensorBlue, aOut(BELTS.A.w / 2 + 0.030), eyeY, 0.07, world);
rbox(0.006, 0.030, 0.030, 0.002, M.lampRed, aIn(BELTS.A.w / 2 + 0.016), eyeY, 0.07, world);
const eyeBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, BELTS.A.w + 0.02, 6), new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.55 }));
eyeBeam.rotation.z = Math.PI / 2; eyeBeam.position.set(BELTS.A.x, eyeY, 0.07); world.add(eyeBeam);

// ---------------------------------------------------------------- escapement on the outer side of belt A: blade at BLADE_Y, side clamp one carton upstream
const escBlade = new THREE.Group(); world.add(escBlade);
const bladeRoot = aOut(BELTS.A.w / 2 + 0.10);
{
  rbox(0.10, 0.040, 0.040, 0.004, M.aluClear, aOut(BELTS.A.w / 2 + 0.13), BLADE_Y - 0.004, 0.035, world);      // cylinder body
  vcyl(0.006, 0.03, M.steel, aOut(BELTS.A.w / 2 + 0.07), BLADE_Y - 0.004, 0.035, 12).rotation.set(0, 0, Math.PI / 2);
  rbox(0.20, 0.008, 0.040, 0.002, M.estopYellow, -so * 0.10, 0, 0, escBlade);                                  // blade, origin at its root
  escBlade.position.set(bladeRoot, BLADE_Y - 0.004, 0.035);
}
const escClamp = new THREE.Group(); world.add(escClamp);
const clampY = BLADE_Y - CARTON.y / 2, clampRoot = aOut(BELTS.A.w / 2 + 0.006);
{
  rbox(0.08, 0.050, 0.045, 0.004, M.aluClear, aOut(BELTS.A.w / 2 + 0.09), clampY, 0.035, world);
  rbox(0.008, 0.12, 0.035, 0.002, M.blackRubber, 0, 0, 0, escClamp);
  rbox(0.05, 0.010, 0.010, 0.002, M.steel, so * 0.028, 0, 0, escClamp);
  escClamp.position.set(clampRoot, clampY, 0.035);
}
function escapeState(t) {
  let open = false, clampOn = false;
  for (const e of escape) {
    if (e.t > t) break;
    if (e.ev === "release") { open = true; clampOn = e.clamp >= 0; }
    else { open = false; clampOn = false; }
  }
  return { open, clampOn };
}
function setConveyors(t) {
  for (const [name, B] of Object.entries(BELTS)) {
    const m = beltMats[name]; m.map.offset.y = -(t * B.v) / 0.16;
  }
  const st = escapeState(t);
  escBlade.position.x = bladeRoot + (st.open ? so * 0.12 : 0);
  escClamp.position.x = clampRoot - (st.clampOn ? so * 0.060 : 0);
  return st;
}

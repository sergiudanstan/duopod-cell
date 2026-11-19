// ---------------------------------------------------------------- DuoPod RVS2-1000-3kg: procedural model on the STEP joint centres, optional vendor GLB
// Robot frame = world translated to the motor axes (z = ROBOT.zm). The vendor CAD maps as x_r = y_cad, y_r = 0.065 - x_cad, z_r = z_cad.
// Every moving part is a group whose matrix moves it from the CAD reference pose to the current pose.
const robotRoot = new THREE.Group(); robotRoot.position.set(0, 0, ROBOT.zm); world.add(robotRoot);
const REF = (() => {
  const A = [[-ROBOT.b, 0], [ROBOT.b, 0]], E = [[-ROBOT.ref.elbow[0], ROBOT.ref.elbow[1]], [ROBOT.ref.elbow[0], ROBOT.ref.elbow[1]]];
  const J = [[-ROBOT.e, -0.705], [ROBOT.e, -0.705]], F = [0, -0.744];
  return { A, E, J, F };
})();
const PART_NAMES = ["head", "upperL", "upperR", "lowerL", "lowerR", "plate", "tri", "rod1", "rod2"];
const parts = Object.fromEntries(PART_NAMES.map((n) => {
  const g = new THREE.Group(); g.matrixAutoUpdate = false; robotRoot.add(g);
  const proc = new THREE.Group(); g.add(proc);
  return [n, { g, proc }];
}));
const vY = (x, z, y = 0) => V(x, y, z);
const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
function yBar(r, y0, y1, m, x, z, parent, seg = 32) {      // cylinder along y in a plane point
  const o = mesh(new THREE.CylinderGeometry(r, r, y1 - y0, seg), m, parent); o.position.set(x, (y0 + y1) / 2, z); return o;
}
function tubeXZ(r, a, b, y, m, parent, seg = 24) { const o = rod(r, m, seg); parent.add(o); placeRod(o, vY(a[0], a[1], y), vY(b[0], b[1], y)); return o; }
function hullOfCircles(cs, r, n = 20) {     // rounded convex outline around circle centres [[x, z], ...]
  const pts = [];
  for (const c of cs) for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); }
  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of pts.slice().reverse()) { while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}

// ---- head (fixed): mounting plate, front and rear walls, end walls, gearboxes; motors are separate (not in the vendor CAD)
{
  const P = parts.head.proc;
  rbox(0.43, 0.29, 0.030, 0.004, M.headAlu, 0, 0, 0.155, P);
  rbox(0.16, 0.10, 0.006, 0.002, M.aluDark, 0, 0, 0.1715, P);                     // centre window cover
  for (const s of [-1, 1]) {
    rbox(0.43, 0.030, 0.230, 0.005, M.headAlu, 0, s * 0.130, 0.025, P);         // walls (arms pass between them)
    rbox(0.025, 0.29, 0.230, 0.005, M.headAlu, s * 0.2025, 0, 0.025, P);
    yBar(0.0055, -0.11, 0.11, M.steel, s * (ROBOT.b + ROBOT.o1[0]), ROBOT.o1[1], P, 16);   // rod-1 pivot pin (right side used)
  }
  for (const s of [-1, 1]) {
    yBar(0.0725, 0.145, 0.197, M.gearboxSilver, s * ROBOT.b, 0, P, 48);
    yBar(0.080, 0.145, 0.153, M.aluClear, s * ROBOT.b, 0, P, 48);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; addBolt(V(s * ROBOT.b + 0.071 * Math.cos(a), 0.153, 0.071 * Math.sin(a)), V(0, 1, 0), P); }
  }
}
const motors = new THREE.Group(); robotRoot.add(motors);
for (const s of [-1, 1]) {
  rbox(0.112, 0.030, 0.112, 0.004, M.aluClear, s * ROBOT.b, 0.212, 0, motors);       // motor adapter
  rbox(0.100, 0.170, 0.100, 0.010, M.motorBlack, s * ROBOT.b, 0.312, 0, motors);      // servo motor
  rbox(0.090, 0.012, 0.090, 0.012, M.blackPlastic, s * ROBOT.b, 0.403, 0, motors);    // encoder cap
  rbox(0.034, 0.040, 0.030, 0.004, M.blackPlastic, s * ROBOT.b, 0.360, 0.064, motors);  // connector
  const lab = labelPlane(s < 0 ? "M2" : "M1", 0.05, 0.025, { bg: "#18191b", fg: "#e8e8e8" });
  lab.rotation.x = Math.PI / 2; lab.position.set(s * ROBOT.b, 0.320, -0.0505); lab.rotation.y = Math.PI; motors.add(lab);
}

// ---- upper arms: hub on the gearbox output, carbon tube, elbow knuckle
[["upperL", 0], ["upperR", 1]].forEach(([n, i]) => {
  const P = parts[n].proc, A = REF.A[i], E = REF.E[i];
  yBar(0.055, -0.055, 0.055, M.aluClear, A[0], A[1], P, 48);
  tubeXZ(0.042, A, E, 0, M.carbonGloss, P, 32);
  yBar(0.046, -0.055, 0.055, M.aluClear, E[0], E[1], P, 48);
  yBar(0.020, -0.058, 0.058, M.steel, E[0], E[1], P, 24);
});
// ---- lower arms: carbon tube with bonded end fittings, bearing eyes at elbow and plate
[["lowerL", 0], ["lowerR", 1]].forEach(([n, i]) => {
  const P = parts[n].proc, E = REF.E[i], J = REF.J[i];
  const d = [J[0] - E[0], J[1] - E[1]], L = Math.hypot(...d), u = [d[0] / L, d[1] / L];
  const a = [E[0] + u[0] * 0.07, E[1] + u[1] * 0.07], b = [J[0] - u[0] * 0.07, J[1] - u[1] * 0.07];
  tubeXZ(0.031, a, b, 0, M.carbonGloss, P, 32);
  tubeXZ(0.026, E, a, 0, M.aluDark, P, 24); tubeXZ(0.026, b, J, 0, M.aluDark, P, 24);
  yBar(0.030, -0.035, 0.035, M.aluClear, E[0], E[1], P, 40);
  yBar(0.030, -0.035, 0.035, M.aluClear, J[0], J[1], P, 40);
});
// ---- moving plate (red) with the vacuum gripper
const PLATE_PIVOT = [ROBOT.e + ROBOT.o2[0], -0.705 + ROBOT.o2[1]];
{
  const P = parts.plate.proc;
  const outline = hullOfCircles([REF.J[0], REF.J[1], PLATE_PIVOT], 0.039, 24);
  for (const s of [-1, 1]) extrudeXZ(outline, s > 0 ? 0.045 : -0.062, s > 0 ? 0.062 : -0.045, M.plateRed, P, 0.003);
  rbox(0.258, 0.090, 0.024, 0.004, M.plateRed, 0, 0, -0.744 + 0.012, P);         // bridge, bottom = flange plane
  for (const J of REF.J) yBar(0.012, -0.066, 0.066, M.steel, J[0], J[1], P, 20);
  yBar(0.006, -0.077, 0.077, M.steel, PLATE_PIVOT[0], PLATE_PIVOT[1], P, 16);
  // gripper (also shown with the vendor CAD): adapter, ejector block, manifold, foam pad (face = logic TCP)
  const zf = -0.744, P2 = new THREE.Group(); parts.plate.g.add(P2);
  rbox(0.120, 0.085, 0.015, 0.003, M.aluClear, 0, 0, zf - 0.0075, P2);
  rbox(0.100, 0.060, 0.045, 0.004, M.aluBlasted, 0, 0, zf - 0.015 - 0.0225, P2);
  rbox(0.040, 0.030, 0.020, 0.003, M.siliconeBlue, 0.07, 0, zf - 0.035, P2);       // ejector
  rbox(TOOL.padX, TOOL.padY, 0.020, 0.004, M.aluClear, 0, 0, zf - 0.060 - 0.010, P2);
  rbox(TOOL.padX - 0.004, TOOL.padY - 0.004, 0.030, 0.006, M.foam, 0, 0, zf - TOOL.len + 0.015, P2);
}
// ---- orientation linkage: triangle at the right elbow, rod pairs head -> triangle -> plate
const TRI = { E: REF.E[1], top: [REF.E[1][0] + ROBOT.o1[0], REF.E[1][1] + ROBOT.o1[1]], low: [REF.E[1][0] + ROBOT.o2[0], REF.E[1][1] + ROBOT.o2[1]] };
{
  const P = parts.tri.proc, outline = hullOfCircles([TRI.E, TRI.top, TRI.low], 0.024, 20);
  for (const s of [-1, 1]) extrudeXZ(outline, s > 0 ? 0.079 : -0.091, s > 0 ? 0.091 : -0.079, M.aluBlasted, P, 0.002);
  yBar(0.0055, -0.11, 0.11, M.steel, TRI.top[0], TRI.top[1], P, 16);
  yBar(0.0055, -0.08, 0.08, M.steel, TRI.low[0], TRI.low[1], P, 16);
  const B = [ROBOT.b + ROBOT.o1[0], ROBOT.o1[1]];
  for (const y of [-0.1015, 0.1015]) {
    tubeXZ(0.008, B, TRI.top, y, M.carbonMatte, parts.rod1.proc, 16);
    for (const p of [B, TRI.top]) { const o = mesh(new THREE.SphereGeometry(0.012, 16, 12), M.steel, parts.rod1.proc); o.position.set(p[0], y, p[1]); }
  }
  for (const y of [-0.071, 0.071]) {
    tubeXZ(0.007, TRI.low, PLATE_PIVOT, y, M.carbonMatte, parts.rod2.proc, 16);
    for (const p of [TRI.low, PLATE_PIVOT]) { const o = mesh(new THREE.SphereGeometry(0.011, 16, 12), M.steel, parts.rod2.proc); o.position.set(p[0], y, p[1]); }
  }
}
// vacuum hose: ejector -> along the left lower arm -> head
const hose = tubeAlong([[0, 0, 0], [0, 0, 1]], 0.006, M.blackRubber, robotRoot, 48, 8);

// ---- pose: matrices from the CAD reference pose to the current pose
const _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _m3 = new THREE.Matrix4();
function pivotRot(g, pivotRef, pivotNew, dAng) {   // T(new) * Ry(-d) * T(-ref)
  g.matrix.makeTranslation(pivotNew[0], 0, pivotNew[1]).multiply(_m2.makeRotationY(-dAng)).multiply(_m3.makeTranslation(-pivotRef[0], 0, -pivotRef[1]));
}
let robotPose = null;
function setRobot(tcp) {
  const pose = armPose(tcp); if (!pose) return null;
  robotPose = pose;
  const rel = (p) => [p[0], p[1] - ROBOT.zm];
  const A = pose.motors.map(rel), E = pose.elbows.map(rel), J = pose.joints.map(rel), F = rel(pose.flange);
  parts.head.g.matrix.identity();
  ["upperL", "upperR"].forEach((n, i) => pivotRot(parts[n].g, REF.A[i], A[i], ang(A[i], E[i]) - ang(REF.A[i], REF.E[i])));
  ["lowerL", "lowerR"].forEach((n, i) => pivotRot(parts[n].g, REF.E[i], E[i], ang(E[i], J[i]) - ang(REF.E[i], REF.J[i])));
  parts.plate.g.matrix.makeTranslation(F[0] - REF.F[0], 0, F[1] - REF.F[1]);
  parts.tri.g.matrix.makeTranslation(E[1][0] - REF.E[1][0], 0, E[1][1] - REF.E[1][1]);
  const B = [ROBOT.b + ROBOT.o1[0], ROBOT.o1[1]];
  pivotRot(parts.rod1.g, B, B, ang(A[1], E[1]) - ang(REF.A[1], REF.E[1]));
  const lowRef = TRI.low, lowNew = [E[1][0] + ROBOT.o2[0], E[1][1] + ROBOT.o2[1]];
  pivotRot(parts.rod2.g, lowRef, lowNew, ang(E[1], J[1]) - ang(REF.E[1], REF.J[1]));
  for (const n of PART_NAMES) parts[n].g.matrixWorldNeedsUpdate = true;
  // hose
  const ej = [F[0] + 0.07, F[1] - 0.035];
  updateTube(hose, [
    V(ej[0] + 0.02, -0.02, ej[1]), V(J[0][0] + 0.01, -0.06, J[0][1] + 0.03),
    V(lerp(J[0][0], E[0][0], 0.5), -0.07, lerp(J[0][1], E[0][1], 0.5)), V(E[0][0] + 0.03, -0.075, E[0][1] - 0.05),
    V(-0.24, -0.13, 0.02), V(-0.205, -0.14, 0.10),
  ]);
  return pose;
}

// ---- vendor CAD (local only): _cad/duopod.glb, git-ignored. ?cad=0 keeps the procedural model.
const CAD_PART = {
  "MT_WST00065198:1": "head", "MT_WST00055121:1": "head", "MT_WST00055121:2": "head",
  "MT_WST00061011:1": "upperL", "MT_WST00061012:1": "upperR", "MT_WST00061013:1": "lowerL", "MT_WST00061013:2": "lowerR",
  "MT_WST00065199:1": "plate", "MT_WST00060925:1": "tri",
  "MT_WST00061015:1": "rod1", "MT_WST00061015:2": "rod1", "MT_WST00061014:1": "rod2", "MT_WST00061014:2": "rod2",
};
let cadLoaded = false;
function cadMaterial(src, part) {
  const c = src.color || new THREE.Color(0.6, 0.6, 0.6), l = (c.r + c.g + c.b) / 3;
  if (part === "head") return l > 0.7 ? M.aluClear : M.headAlu;   // vendor logo faces on the head become plain aluminium
  if (c.r > 0.3 && c.g < 0.1) return M.plateRed;
  if (l < 0.06) return M.carbonGloss;
  if (c.r > c.g * 1.6 && l < 0.2) return M.headAlu;          // brownish label faces become plain aluminium
  if (l > 0.7) return M.aluClear;
  return M.headAlu;
}
function cadCheck() {     // mm between the CAD plate's bottom face centre and the logic flange point
  if (!cadLoaded || !robotPose) return null;
  const box = new THREE.Box3().setFromObject(parts.plate.g.children.find((o) => o.userData.cad));
  const c = box.getCenter(V(0, 0, 0)); world.worldToLocal(c);
  const bottom = world.worldToLocal(V(0, box.min.y, 0)).z;     // three y-up: box.min.y is the lowest point
  return Math.hypot(c.x - robotPose.flange[0], bottom - robotPose.flange[1]) * 1000;
}
(async () => {
  if (new URLSearchParams(location.search).get("cad") === "0" || location.protocol === "file:") return;
  try {
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const gltf = await new GLTFLoader().loadAsync("_cad/duopod.glb");
    const root = gltf.scene; root.updateMatrixWorld(true);
    const C = new THREE.Matrix4().set(0, 1, 0, 0, -1, 0, 0, 0.065, 0, 0, 1, 0, 0, 0, 0, 1);
    const found = new Set(), byName = {};
    for (const k of Object.keys(CAD_PART)) byName[THREE.PropertyBinding.sanitizeNodeName(k)] = k;   // GLTFLoader turns ":" into "_"
    root.traverse((o) => {
      const key = byName[o.name], part = key && CAD_PART[key]; if (!part || o.userData.taken) return;
      found.add(key); o.traverse((c) => { c.userData.taken = true; });
      const holder = new THREE.Group(); holder.userData.cad = true; holder.matrixAutoUpdate = false;
      holder.matrix.copy(C).multiply(o.matrixWorld);
      const clone = o.clone(false); clone.position.set(0, 0, 0); clone.quaternion.identity(); clone.scale.set(1, 1, 1);
      if (o.isMesh) { clone.geometry = o.geometry; }
      o.children.filter((c) => c.isMesh).forEach((c) => { const cc = c.clone(); clone.add(cc); });
      clone.traverse((m) => { if (m.isMesh) { m.material = cadMaterial(m.material, part); m.castShadow = m.receiveShadow = true; } });
      holder.add(clone); parts[part].g.add(holder);
    });
    if (found.size < Object.keys(CAD_PART).length) throw new Error("vendor GLB: missing nodes " + Object.keys(CAD_PART).filter((n) => !found.has(n)).join(", "));
    for (const n of PART_NAMES) parts[n].proc.visible = false;
    cadLoaded = true;
    window.dispatchEvent(new Event("cadloaded"));
  } catch (err) {
    console.info("vendor CAD not loaded, procedural DuoPod in use:", String(err.message || err));
  }
})();

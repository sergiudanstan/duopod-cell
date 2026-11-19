// Floor, portal frame from 80x80 aluminium profiles, robot mounting plate, guards, stack light, HMI.
const floorMat = mat(0x8a8e92, 0.92, 0.02);
if (M.floor.map) { const fm = M.floor.map.clone(); fm.repeat.set(24, 24); floorMat.map = fm; }
const floor = mesh(new THREE.PlaneGeometry(14, 14), floorMat);
floor.position.z = LAYOUT.floor; floor.castShadow = false;
function toneFloor() { floorMat.color.set(themeIsDark() ? 0x3a3e42 : 0x8a8e92); }
window.addEventListener("themechange", () => queueMicrotask(toneFloor));
queueMicrotask(toneFloor);
function tapeStrip(x, y, w, d) { const o = mesh(new THREE.PlaneGeometry(w, d), M.tape); o.position.set(x, y, LAYOUT.floor + 0.003); o.castShadow = false; return o; }
{
  const lx = LAYOUT.posts.x + 0.35, ly = LAYOUT.posts.y + 0.10, w = 0.05;
  tapeStrip(lx, 0, w, ly * 2); tapeStrip(-lx, 0, w, ly * 2);
}

// 80x80 profile = the 40x40 slot-8 section scaled 2x in its plane (one instanced pool)
const profile8080 = makeInstanced(profileGeo.clone().scale(2, 2, 1), M.aluClear, 64, world);
function beam80(a, b) {
  const d = b.clone().sub(a), L = d.length();
  _beamQ.setFromUnitVectors(_zAxis, d.normalize()); _beamS.set(1, 1, L); _beamM.compose(a, _beamQ, _beamS);
  profile8080.setMatrixAt(profile8080.count++, _beamM);
}
const PX = LAYOUT.posts.x, PY = LAYOUT.posts.y, [TZ0, TZ1] = LAYOUT.topZ, TZ = (TZ0 + TZ1) / 2;
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  beam80(V(sx * PX, sy * PY, LAYOUT.floor + 0.012), V(sx * PX, sy * PY, TZ1));
  rbox(0.16, 0.16, 0.012, 0.002, M.galv, sx * PX, sy * PY, LAYOUT.floor + 0.006, world);        // foot plate
  for (const [dx, dy] of [[0.055, 0.055], [-0.055, 0.055], [0.055, -0.055], [-0.055, -0.055]]) addBolt(V(sx * PX + dx, sy * PY + dy, LAYOUT.floor + 0.012), V(0, 0, 1));
}
for (const sy of [-1, 1]) beam80(V(-PX - 0.04, sy * PY, TZ), V(PX + 0.04, sy * PY, TZ));          // cross beams along x
for (const sx of [-1, 1]) beam80(V(sx * PX, -PY + 0.04, TZ), V(sx * PX, PY - 0.04, TZ));          // side beams along y
for (const sx of [-1, 1]) beam80(V(sx * LAYOUT.carriers, -PY + 0.04, TZ), V(sx * LAYOUT.carriers, PY - 0.04, TZ));   // carriers
// mounting plate: underside is the robot mounting face (z = ROBOT.mountZ)
const mountPlate = rbox(LAYOUT.plate.x, LAYOUT.plate.y, LAYOUT.plate.t, 0.004, M.aluBlasted, 0, 0, ROBOT.mountZ + LAYOUT.plate.t / 2, world);
for (const sx of [-1, 1]) for (const y of [-0.16, 0, 0.16]) addBolt(V(sx * LAYOUT.carriers, y, TZ1), V(0, 0, 1));
for (const x of [-0.2, -0.135, 0.135, 0.2]) for (const y of [-0.125, 0.12]) addBolt(V(x, y, ROBOT.mountZ + LAYOUT.plate.t), V(0, 0, 1));
// corner gussets
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  const g = rbox(0.012, 0.16, 0.16, 0.002, M.aluBlasted, sx * (PX - 0.046), sy * (PY - 0.09), TZ0 - 0.07, world);
  g.rotation.x = Math.PI / 4 * sy;
}

// guards: polycarbonate in black seals on the long sides, end walls with belt openings
const guardGroup = new THREE.Group(); world.add(guardGroup);
function pcPanel(w, h, x, y, z, rotZ) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.z = rotZ; guardGroup.add(g);
  const pane = mesh(new THREE.PlaneGeometry(w, h), M.pcClear, g); pane.rotation.x = Math.PI / 2; pane.castShadow = false;
  for (const [a, b] of [[[-w / 2, -h / 2], [w / 2, -h / 2]], [[-w / 2, h / 2], [w / 2, h / 2]], [[-w / 2, -h / 2], [-w / 2, h / 2]], [[w / 2, -h / 2], [w / 2, h / 2]]]) {
    const o = rod(0.004, M.sealBlack, 6); g.add(o); placeRod(o, V(a[0], 0, a[1]), V(b[0], 0, b[1]));
  }
  return g;
}
const gz0 = LAYOUT.floor + 0.12, gz1 = LAYOUT.guardTop - 0.06, gh = gz1 - gz0;
for (const sx of [-1, 1]) {
  pcPanel(PY * 2 - 0.10, gh, sx * (PX + 0.046), 0, (gz0 + gz1) / 2, Math.PI / 2);
  beam80(V(sx * PX, -PY + 0.04, gz0 - 0.04), V(sx * PX, PY - 0.04, gz0 - 0.04));
}
// end walls: panels left and right of the belt opening, and above it
for (const sy of [-1, 1]) {
  const ox = LAYOUT.opening.x, [oz0, oz1] = LAYOUT.opening.z;
  const sideW = PX - 0.04 - ox;
  for (const sx of [-1, 1]) pcPanel(sideW, gh, sx * (ox + sideW / 2), sy * (PY + 0.046), (gz0 + gz1) / 2, 0);
  pcPanel(ox * 2, gz1 - oz1, 0, sy * (PY + 0.046), (oz1 + gz1) / 2, 0);
  for (const sx of [-1, 1]) {
    const r = rod(0.020, M.aluClear, 4);
    placeRod(r, V(sx * ox, sy * PY, gz0), V(sx * ox, sy * PY, gz1));
  }
  const top = rod(0.020, M.aluClear, 4); placeRod(top, V(-ox, sy * PY, oz1), V(ox, sy * PY, oz1));
  // tunnel guard over each belt outside the wall (reach distance), yellow edge
  rbox(ox * 2, 0.30, 0.004, 0.001, M.pcClear, 0, sy * (PY + 0.20), oz1, guardGroup);
  for (const sx of [-1, 1]) { const o = rbox(0.004, 0.30, oz1 - oz0, 0.001, M.pcClear, sx * ox, sy * (PY + 0.20), (oz0 + oz1) / 2, guardGroup); o.castShadow = false; }
}
// door interlock switches (cosmetic)
for (const sx of [-1, 1]) rbox(0.03, 0.06, 0.04, 0.004, M.estopYellow, sx * (PX + 0.06), -0.30, 0.25, world);

// ---------------------------------------------------------------- stack light on the front-right post
const stackLamps = { red: M.lampRed, amber: M.lampAmber, green: M.lampGreen };
function stackTurn(r, z0, z1, material) { const o = lathe([[0, z0], [r, z0], [r, z1], [0, z1]], material, world); o.position.set(LAYOUT.stack.x, LAYOUT.stack.y, 0); return o; }
{
  let z = TZ1;
  stackTurn(0.034, z, z + 0.035, M.blackPlastic); z += 0.035;
  stackTurn(0.0125, z, z + 0.150, M.blackPlastic); z += 0.150;
  stackTurn(0.030, z, z + 0.050, stackLamps.green); z += 0.050;
  stackTurn(0.030, z, z + 0.050, stackLamps.amber); z += 0.050;
  stackTurn(0.030, z, z + 0.050, stackLamps.red); z += 0.050;
  stackTurn(0.032, z, z + 0.028, M.blackPlastic);
}

// ---------------------------------------------------------------- HMI on the front-left post
const hmiRoot = new THREE.Group();
hmiRoot.position.set(LAYOUT.hmi.x - 0.20, LAYOUT.hmi.y + 0.10, LAYOUT.hmi.z);
hmiRoot.rotation.z = Math.PI / 2 + 0.25;      // screen (+y face) turned to look out along -x
world.add(hmiRoot);
rbox(0.41, 0.06, 0.30, 0.004, M.t3Dark, 0, 0, 0, hmiRoot);
const hmiCanvas = document.createElement("canvas"); hmiCanvas.width = 512; hmiCanvas.height = 384;
const hmiTexture = new THREE.CanvasTexture(hmiCanvas); hmiTexture.colorSpace = THREE.SRGBColorSpace;
const hmiScreen = { canvas: hmiCanvas, texture: hmiTexture };
const screenMat = M.screen.clone(); screenMat.map = hmiTexture; screenMat.emissiveMap = hmiTexture; screenMat.emissiveIntensity = 0.9;
const hmiFace = mesh(new THREE.PlaneGeometry(0.34, 0.255), screenMat, hmiRoot);
hmiFace.rotation.x = Math.PI / 2; hmiFace.position.y = 0.0305; hmiFace.castShadow = false;
{
  const arm = rod(0.018, M.aluClear, 16); world.add(arm);
  placeRod(arm, V(LAYOUT.hmi.x - 0.04, LAYOUT.hmi.y, LAYOUT.hmi.z), V(LAYOUT.hmi.x - 0.17, LAYOUT.hmi.y + 0.08, LAYOUT.hmi.z));
  const es = lathe([[0, 0], [0.022, 0], [0.022, 0.012], [0.016, 0.022], [0, 0.024]], M.estopRed, hmiRoot);
  es.rotation.x = -Math.PI / 2; es.position.set(0.16, 0.03, -0.11);
  rbox(0.06, 0.012, 0.06, 0.003, M.estopYellow, 0.16, 0.031, -0.11, hmiRoot);
}

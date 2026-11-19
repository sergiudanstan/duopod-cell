// Corrugated cartons 180 x 250 x 120 mm, 3 kg, taped along the top seam. Origin at the bottom-face centre.
function buildCarton(k) {
  const g = new THREE.Group(); world.add(g);
  const { x, y, h } = CARTON;
  rbox(x, y, h, 0.004, M.carton, 0, 0, h / 2, g);
  rbox(0.050, y + 0.002, 0.0012, 0.0005, M.cartonTape, 0, 0, h + 0.0004, g);                  // top tape
  for (const s of [-1, 1]) rbox(0.050, 0.0012, 0.06, 0.0005, M.cartonTape, 0, s * (y / 2 + 0.0004), h - 0.03, g);
  const seam = rbox(0.0015, y - 0.004, 0.0008, 0.0003, M.motorBlack, 0, 0, h + 0.0012, g); seam.castShadow = false;
  const label = labelPlane(`3 kg · #${String(k + 1).padStart(2, "0")}`, 0.09, 0.05, { bg: "#f4f1ea", fg: "#222", font: "600 110px 'IBM Plex Mono', monospace" });
  label.rotation.set(Math.PI / 2, -Math.PI / 2, 0); label.position.set(x / 2 + 0.0008, 0.03, h * 0.55); g.add(label);
  const label2 = label.clone(); label2.rotation.set(Math.PI / 2, Math.PI / 2, 0); label2.position.set(-x / 2 - 0.0008, -0.03, h * 0.55); g.add(label2);
  g.visible = false;
  return g;
}
const cartonMeshes = cartons.map((c) => buildCarton(c.k));
function placeCartons(t) {
  let queue = 0, done = 0;
  cartons.forEach((c, i) => {
    const p = cartonAt(c, t), o = cartonMeshes[i];
    o.visible = !!p;
    if (p) o.position.set(p[0], p[1], p[2]);
    if (c.place != null && t >= c.place) done++;
    else if (p && (c.pick == null || t < c.pick)) queue++;
  });
  return { queue, done };
}

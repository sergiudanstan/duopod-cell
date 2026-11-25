# DuoPod Transfer Cell

[![CI](https://github.com/sergiudanstan/duopod-cell/actions/workflows/ci.yml/badge.svg)](https://github.com/sergiudanstan/duopod-cell/actions/workflows/ci.yml)
[![CodeQL](https://github.com/sergiudanstan/duopod-cell/actions/workflows/codeql.yml/badge.svg)](https://github.com/sergiudanstan/duopod-cell/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/sergiudanstan/duopod-cell/badge)](https://scorecard.dev/viewer/?uri=github.com/sergiudanstan/duopod-cell)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A browser digital twin of a conveyor-to-conveyor transfer cell. A ceiling-mounted 2-axis parallel robot (Autonox DuoPod RVS2-1000-3kg, A_00913) picks 3 kg cartons from an infeed belt and places them on the outfeed belt beside it.

The robot works in the vertical plane across the two belts. On the infeed belt, a fixed end stop holds the carton in that plane. An escapement (blade + side clamp) lets the next carton go only after the robot has lifted the current one clear.

**Live:** https://sergiudanstan.github.io/duopod-cell/ (procedural robot; the vendor CAD is never published).

## Robot data

- **Joint centres** fitted on the bearing bores of the vendor STEP:

  | Parameter | Value |
  |---|---|
  | motor axes | ±125 mm |
  | L1 | 450.0 mm |
  | L2 | 930.0 mm |
  | plate joints | ±90 mm |
  | TCP flange below the plate joints | 39 mm |
  | TCP below the mounting face (CAD pose) | 914 mm |

- **Connecting-dimensions drawing**: TCP working range 1000 × 400 mm, plus an arc to 510 mm (R 1191.36).
- **Two parallelograms** keep the plate level: rod pair 1 runs from the head to the triangle, rod pair 2 from the triangle to the plate.

## Cell

| Item | Value |
|---|---|
| Carton | 180 × 250 × 120 mm, 3 kg |
| Gripper | vacuum foam, 110 mm flange-to-face |
| Belts | 300 mm between guides, 400 mm/s |
| Belt A (infeed) | x = +200 mm |
| Belt B (outfeed) | x = −200 mm |
| Robot mounting face | 1330 mm above the belts |
| Travel height | 280 mm (TCP) |

Pick, place and travel points all lie inside the required 600 × 400 mm rectangle.

Cycle:
- 1.60 s, 37.5 cartons/min;
- peak TCP speed 2.5 m/s, peak acceleration 27 m/s²;
- peak gearbox output torque 56 Nm. This is a point-mass estimate (τ = Jᵀ·m(a + g)) that ignores arm inertia. No vendor rating is published to compare it against.

## Checks

```sh
node tools/build.mjs           # concatenate src/ into index.html
node tests/run.mjs             # CAD pose, IK o FK, working range, cartons, overlaps, clearances, torque
node tests/run.mjs --perturb   # escapement released on vacuum OK: overlap + clearance must fail (exit 1)
node tools/shots.mjs           # stills, console errors, fps, CAD-vs-logic check (needs _cad/duopod.glb)
node tools/record.mjs          # 1920x1080 film -> ~/Downloads/duopod_cell/duopod_cell.mp4
```

## Vendor CAD

`_cad/` is git-ignored.

1. Download the STEP from the product page.
2. Convert it:

   ```sh
   uv run --python 3.13 --with cascadio==0.1.1 python tools/cad/step2glb.py _cad/src/3D-model_A_00913.stp _cad/duopod.glb
   ```

When the page is served from localhost / 127.0.0.1 and `_cad/duopod.glb` exists, the vendor parts replace the procedural model. Add `?cad=0` to force the procedural robot. Autonox and DuoPod are trademarks of their owner.

## Layout

`src/page.html` is the page shell. `src/js/*.js` are concatenated in lexical order into one module, and `index.html` is generated from them. `10-logic.js` (between `@@logic-start` and `@@logic-end`) is pure JS, and `tests/run.mjs` evaluates it in Node.

## Development

`index.html` is generated from `src/`; CI fails if the committed copy differs from a fresh `node tools/build.mjs`. `npm ci && npm test` runs the logic tests and the headless smoke test (needs Google Chrome). See [CONTRIBUTING.md](CONTRIBUTING.md) for branches and releases, [SECURITY.md](SECURITY.md) for reporting vulnerabilities, and [CHANGELOG.md](CHANGELOG.md) for history.

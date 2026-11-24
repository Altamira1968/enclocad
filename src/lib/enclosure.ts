import * as THREE from "three";
import { Brush, Evaluator, ADDITION, SUBTRACTION } from "three-bvh-csg";

/** Dış kenar pahı (mm) */
export const chamferSize = (p: { wall: number }) => Math.min(1.6, p.wall * 0.6);

/** Dikey kenarları ve alt (veya üst) kenarları pahlı blok; yMin..yMax arası, pahsız yüz "flat" tarafta */
function chamferBlock(w: number, d: number, yMin: number, yMax: number, c: number, flat: "top" | "bottom"): Brush {
  const hw = w / 2 - c, hd = d / 2 - c, k = c * 0.6;
  const sh = new THREE.Shape();
  sh.moveTo(-hw + k, -hd); sh.lineTo(hw - k, -hd); sh.lineTo(hw, -hd + k); sh.lineTo(hw, hd - k);
  sh.lineTo(hw - k, hd); sh.lineTo(-hw + k, hd); sh.lineTo(-hw, hd - k); sh.lineTo(-hw, -hd + k); sh.closePath();
  const h = yMax - yMin;
  const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: true, bevelThickness: c, bevelSize: c, bevelSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, flat === "top" ? yMin + c : yMin - c, 0);
  // ExtrudeGeometry y yönü: 0..h, bevel -c..h+c sonrası kaydırıldı; düz tarafı kes
  let b = brush(g);
  const big = 4 * (w + d);
  b = op(b, flat === "top" ? brush(box(big, big, big), 0, yMax + big / 2, 0) : brush(box(big, big, big), 0, yMin - big / 2, 0), SUBTRACTION);
  return b;
}

export type ScrewMode = "insert" | "tap";
export type DinMode = "none" | "integrated" | "clip";
export type Face = "front" | "back" | "left" | "right";
export type CutoutType = "PG7" | "PG9" | "PG11" | "USBC" | "DC" | "RJ45" | "VENT";

export interface Cutout {
  id: string;
  face: Face;
  type: CutoutType;
  /** yatay ofset (mm, yüz merkezinden) */
  u: number;
  /** dikey ofset (mm, duvar merkezinden) */
  v: number;
}

export interface EnclosureParams {
  width: number;
  depth: number;
  height: number;
  wall: number;
  screwMode: ScrewMode;
  screwSize: "M2.5" | "M3";
  pcbEnabled: boolean;
  pcbWidth: number;
  pcbDepth: number;
  pcbInset: number;
  standoffHeight: number;
  din: DinMode;
  cutouts: Cutout[];
}

export const DEFAULT_PARAMS: EnclosureParams = {
  width: 100,
  depth: 70,
  height: 40,
  wall: 2.4,
  screwMode: "insert",
  screwSize: "M3",
  pcbEnabled: true,
  pcbWidth: 60,
  pcbDepth: 40,
  pcbInset: 3.5,
  standoffHeight: 5,
  din: "none",
  cutouts: [{ id: "c1", face: "front", type: "PG9", u: 0, v: 0 }],
};

export const PCB_PRESETS = [
  { id: "esp32", name: "ESP32 DevKit", w: 55, d: 28, inset: 2.5 },
  { id: "uno", name: "Arduino Uno", w: 68.6, d: 53.3, inset: 3.5 },
  { id: "rpi4", name: "Raspberry Pi 4", w: 85, d: 56, inset: 3.5 },
  { id: "relay2", name: "2 Kanal Röle", w: 50, d: 38, inset: 3 },
] as const;

/** Vida deliği çapları (mm): insert = pirinç ısı somunu yuvası, tap = kılavuz delik */
export function holeDiameter(size: EnclosureParams["screwSize"], mode: ScrewMode): number {
  if (size === "M3") return mode === "insert" ? 4.0 : 2.5;
  return mode === "insert" ? 3.5 : 2.1;
}
export function clearanceDiameter(size: EnclosureParams["screwSize"]): number {
  return size === "M3" ? 3.4 : 2.9;
}

/** Kesim boyutları (mm): daire için [çap], dikdörtgen için [g, y] */
export const CUTOUT_SPECS: Record<CutoutType, { kind: "circle" | "rect" | "vent"; w: number; h: number }> = {
  PG7: { kind: "circle", w: 12.5, h: 12.5 },
  PG9: { kind: "circle", w: 15.2, h: 15.2 },
  PG11: { kind: "circle", w: 18.6, h: 18.6 },
  DC: { kind: "circle", w: 8, h: 8 },
  USBC: { kind: "rect", w: 9.5, h: 3.6 },
  RJ45: { kind: "rect", w: 16, h: 13.8 },
  VENT: { kind: "vent", w: 30, h: 15 },
};

export const LID_THICKNESS = (p: EnclosureParams) => p.wall;
const POST_R = 4;

const ev = new Evaluator();
ev.useGroups = false;

function brush(geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, rz = 0): Brush {
  const b = new Brush(geo);
  b.position.set(x, y, z);
  b.rotation.set(rx, 0, rz);
  b.updateMatrixWorld();
  return b;
}
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (dia: number, h: number) => new THREE.CylinderGeometry(dia / 2, dia / 2, h, 32);

function op(a: Brush, b: Brush, kind: typeof ADDITION | typeof SUBTRACTION): Brush {
  const r = ev.evaluate(a, b, kind);
  r.updateMatrixWorld();
  return r;
}

function cornerPositions(p: EnclosureParams): [number, number][] {
  const ox = p.width / 2 - p.wall - POST_R + 0.5;
  const oz = p.depth / 2 - p.wall - POST_R + 0.5;
  return [
    [ox, oz],
    [-ox, oz],
    [ox, -oz],
    [-ox, -oz],
  ];
}

/** Gövde: y=0 tabandır, yükseklik = height - kapak */
export function buildBase(p: EnclosureParams): THREE.BufferGeometry {
  const t = p.wall;
  const H = p.height - LID_THICKNESS(p);
  let b = chamferBlock(p.width, p.depth, 0, H, chamferSize(p), "top");
  b = op(b, brush(box(p.width - 2 * t, H, p.depth - 2 * t), 0, H / 2 + t, 0), SUBTRACTION);

  const hole = holeDiameter(p.screwSize, p.screwMode);
  const holeDepth = p.screwMode === "insert" ? 6 : 10;
  for (const [x, z] of cornerPositions(p)) {
    b = op(b, brush(cyl(POST_R * 2, H - t), x, t + (H - t) / 2, z), ADDITION);
    b = op(b, brush(cyl(hole, holeDepth), x, H - holeDepth / 2 + 0.01, z), SUBTRACTION);
  }

  if (p.pcbEnabled) {
    const sx = p.pcbWidth / 2 - p.pcbInset;
    const sz = p.pcbDepth / 2 - p.pcbInset;
    const sh = p.standoffHeight;
    for (const [x, z] of [[sx, sz], [-sx, sz], [sx, -sz], [-sx, -sz]] as const) {
      b = op(b, brush(cyl(hole + 2.4, sh), x, t + sh / 2, z), ADDITION);
      b = op(b, brush(cyl(hole, sh + t), x, t + sh / 2 + 0.01 + t / 2, z), SUBTRACTION);
    }
  }

  for (const c of p.cutouts) b = applyCutout(b, p, c, H);

  if (p.din === "integrated") b = op(b, dinRails(p.width, 0, false), ADDITION);
  if (p.din === "clip") {
    for (const x of [-12, 12]) b = op(b, brush(cyl(hole, t * 2), x, 0, 0), SUBTRACTION);
  }
  return b.geometry;
}

function applyCutout(b: Brush, p: EnclosureParams, c: Cutout, H: number): Brush {
  const spec = CUTOUT_SPECS[c.type];
  const t = p.wall;
  const cy = H / 2 + c.v;
  const depth = t * 3;
  const onX = c.face === "left" || c.face === "right";
  const sign = c.face === "front" || c.face === "right" ? 1 : -1;
  const place = (geo: THREE.BufferGeometry, du: number, dv: number, isCyl: boolean) => {
    const u = c.u + du;
    const y = cy + dv;
    if (onX) {
      return isCyl
        ? brush(geo, (sign * p.width) / 2, y, u, 0, Math.PI / 2)
        : brush(geo, (sign * p.width) / 2, y, u, 0, 0);
    }
    return isCyl ? brush(geo, u, y, (sign * p.depth) / 2, Math.PI / 2, 0) : brush(geo, u, y, (sign * p.depth) / 2);
  };
  if (spec.kind === "circle") return op(b, place(cyl(spec.w, depth), 0, 0, true), SUBTRACTION);
  if (spec.kind === "rect") {
    const g = onX ? box(depth, spec.h, spec.w) : box(spec.w, spec.h, depth);
    return op(b, place(g, 0, 0, false), SUBTRACTION);
  }
  // havalandırma: 6 dikey yarık
  let r = b;
  for (let i = 0; i < 6; i++) {
    const du = -spec.w / 2 + 2.5 + i * 5;
    const g = onX ? box(depth, spec.h, 2.2) : box(2.2, spec.h, depth);
    r = op(r, place(g, du, 0, false), SUBTRACTION);
  }
  return r;
}

/** 35 mm DIN rayı (EN 50022) geçme kanalı; tabanın altına (y<0) uzanır */
function dinRails(length: number, baseY: number, withPlate: boolean): Brush {
  const L = Math.min(length, 60);
  const ribH = 5;
  let r = brush(box(L, ribH, 4), 0, baseY - ribH / 2, 17.5 + 2);
  r = op(r, brush(box(L, ribH, 4), 0, baseY - ribH / 2, -17.5 - 2), ADDITION);
  // tırnaklar: 1.2 mm ray kalınlığı için uçta içe dönük dudak
  r = op(r, brush(box(L, 1.5, 2), 0, baseY - ribH + 0.75, 17.5 - 1), ADDITION);
  r = op(r, brush(box(L, 1.5, 2), 0, baseY - ribH + 0.75, -17.5 + 1), ADDITION);
  if (withPlate) r = op(r, brush(box(L, 3, 46), 0, baseY + 1.5, 0), ADDITION);
  return r;
}

export function buildLid(p: EnclosureParams): THREE.BufferGeometry {
  const t = LID_THICKNESS(p);
  let b = chamferBlock(p.width, p.depth, 0, t, Math.min(chamferSize(p), t * 0.8), "bottom");
  const lip = brush(box(p.width - 2 * t - 0.4, 2, p.depth - 2 * t - 0.4), 0, -1, 0);
  b = op(b, lip, ADDITION);
  b = op(b, brush(box(p.width - 4 * t, 2.2, p.depth - 4 * t), 0, -1.1, 0), SUBTRACTION);
  const cl = clearanceDiameter(p.screwSize);
  for (const [x, z] of cornerPositions(p)) {
    b = op(b, brush(cyl(POST_R * 2 + 0.6, 2.4), x, -1.1, z), SUBTRACTION);
    b = op(b, brush(cyl(cl, t * 3), x, t / 2, z), SUBTRACTION);
    b = op(b, brush(cyl(cl * 1.9, 2), x, t, z), SUBTRACTION); // vida başı havşası
  }
  return b.geometry;
}

export function buildClip(p: EnclosureParams): THREE.BufferGeometry {
  let b = dinRails(50, 0, true);
  const cl = clearanceDiameter(p.screwSize);
  for (const x of [-12, 12]) b = op(b, brush(cyl(cl, 10), x, 0, 0), SUBTRACTION);
  return b.geometry;
}

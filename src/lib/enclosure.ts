import * as THREE from "three";
import { Brush, Evaluator, ADDITION, SUBTRACTION } from "three-bvh-csg";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import fontJson from "@/assets/helvetiker_bold.typeface.json";

const FONT = new FontLoader().parse(fontJson as never);

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
export type LidMode = "screw" | "hinge";
export type DinMode = "none" | "integrated" | "clip";
export type Face = "front" | "back" | "left" | "right";
export type CutoutType = "PG7" | "PG9" | "PG11" | "USBC" | "DC" | "RJ45" | "VENT" | "NONE";

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
  lidMode: LidMode;
  screwMode: ScrewMode;
  screwSize: "M2.5" | "M3";
  pcbEnabled: boolean;
  pcbWidth: number;
  pcbDepth: number;
  pcbInset: number;
  standoffHeight: number;
  din: DinMode;
  cutouts: Cutout[];
  /** Kapak üstü oyma yazı (boş = yok) */
  lidText: string;
  lidTextSize: number;
  /** Kapakta petek havalandırma */
  honeycomb: boolean;
  hexSize: number;
}

export const DEFAULT_PARAMS: EnclosureParams = {
  width: 100,
  depth: 70,
  height: 40,
  wall: 2.4,
  lidMode: "screw",
  screwMode: "insert",
  screwSize: "M3",
  pcbEnabled: true,
  pcbWidth: 60,
  pcbDepth: 40,
  pcbInset: 3.5,
  standoffHeight: 5,
  din: "none",
  cutouts: [{ id: "c1", face: "front", type: "PG9", u: 0, v: 0 }],
  lidText: "",
  lidTextSize: 8,
  honeycomb: false,
  hexSize: 5,
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
export const CUTOUT_SPECS: Record<CutoutType, { kind: "circle" | "rect" | "vent" | "none"; w: number; h: number }> = {
  PG7: { kind: "circle", w: 12.5, h: 12.5 },
  PG9: { kind: "circle", w: 15.2, h: 15.2 },
  PG11: { kind: "circle", w: 18.6, h: 18.6 },
  DC: { kind: "circle", w: 8, h: 8 },
  USBC: { kind: "rect", w: 9.5, h: 3.6 },
  RJ45: { kind: "rect", w: 16, h: 13.8 },
  VENT: { kind: "vent", w: 30, h: 15 },
  NONE: { kind: "none", w: 0, h: 0 },
};

export const LID_THICKNESS = (p: EnclosureParams) => p.wall;
const POST_R = 4;

const ev = new Evaluator();
ev.useGroups = false;

function brush(geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, rz = 0, ry = 0): Brush {
  const b = new Brush(geo);
  b.position.set(x, y, z);
  b.rotation.set(rx, ry, rz);
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
  if (p.lidMode !== "hinge") for (const [x, z] of cornerPositions(p)) {
    b = op(b, brush(cyl(POST_R * 2, H - t), x, t + (H - t) / 2, z), ADDITION);
    // iç köşe dolgusu: kule ile duvar köşesi arasındaki üçgen boşluğu kapatır
    const f = POST_R - 0.3;
    b = op(b, brush(box(f, H - t, f), x + Math.sign(x) * f / 2, t + (H - t) / 2, z + Math.sign(z) * f / 2), ADDITION);
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

  if (p.lidMode === "hinge") {
    const z0 = -p.depth / 2 - HINGE_R;
    for (const [x0, x1] of hingeSegments(p).base) {
      const L = x1 - x0, cx = (x0 + x1) / 2;
      b = op(b, brush(knuckle(L), cx, H, z0), ADDITION);
      b = op(b, brush(box(L, HINGE_R * 2, HINGE_R + 0.5), cx, H - HINGE_R, z0 + (HINGE_R + 0.5) / 2), ADDITION);
      // alt keskin kenar: mafsala teğet 45° pah (kapak dönerken takılmasın)
      b = op(b, brush(box(L + 2, 4.2, 4.2), cx, H - 2 * HINGE_R, z0, Math.PI / 4), SUBTRACTION);
      b = op(b, brush(cyl(PIN_HOLE, L + 1), cx, H, z0, 0, Math.PI / 2), SUBTRACTION);
    }
    // çıtçıt kertiği (ön dış yüz)
    b = op(b, brush(box(SNAP_W + 1, SNAP_LIP_H + 0.6, 2), 0, H - SNAP_DROP + SNAP_LIP_H / 2, p.depth / 2), SUBTRACTION);
  }

  if (p.din === "integrated") b = op(b, dinRails(p.width, 0, false), ADDITION);
  if (p.din === "clip") {
    for (const x of [-12, 12]) b = op(b, brush(cyl(hole, t * 2), x, 0, 0), SUBTRACTION);
  }
  return b.geometry;
}

function applyCutout(b: Brush, p: EnclosureParams, c: Cutout, H: number): Brush {
  const spec = CUTOUT_SPECS[c.type];
  if (spec.kind === "none") return b;
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
    const g = onX ? box(depth, spec.h, 3) : box(3, spec.h, depth);
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

/** Kapak üst yüzüne petek delikleri ve oyma yazı (tabla yüzü düz kalır, destek gerekmez) */
function decorateLid(b: Brush, p: EnclosureParams): Brush {
  const t = LID_THICKNESS(p);
  const hasText = p.lidText.trim().length > 0;
  if (p.honeycomb) {
    const s = p.hexSize, rib = 1.2;
    const r = s / 2 / Math.cos(Math.PI / 6);
    const dx = s + rib, dz = (s + rib) * Math.cos(Math.PI / 6);
    const aw = p.width - 4 * t - 2 * POST_R - 6;
    const zMin = -(p.depth / 2 - 2 * t - POST_R - 3);
    const zMax = hasText ? p.depth * 0.05 - 2 : -zMin;
    // pencere aç, sonra delikli ızgara plakasını (earcut ile hızlı) kenar payıyla geri ekle
    const zc = (zMin + zMax) / 2, ah = zMax - zMin, m = 1.5;
    if (ah > 2 * r) {
      const sh = new THREE.Shape();
      const hw = aw / 2 + m, hh = ah / 2 + m;
      sh.moveTo(-hw, -hh); sh.lineTo(hw, -hh); sh.lineTo(hw, hh); sh.lineTo(-hw, hh); sh.closePath();
      for (let row = 0, z = -ah / 2 + r; z <= ah / 2 - r; row++, z += dz) {
        const off = row % 2 ? dx / 2 : 0;
        for (let x = -aw / 2 + r + off; x <= aw / 2 - r; x += dx) {
          const hp = new THREE.Path();
          for (let i = 0; i < 6; i++) { const an = Math.PI / 6 + (i * Math.PI) / 3; const px = x + r * Math.cos(an), py = z + r * Math.sin(an); i ? hp.lineTo(px, py) : hp.moveTo(px, py); }
          hp.closePath();
          sh.holes.push(hp);
        }
      }
      const grid = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false });
      grid.rotateX(Math.PI / 2); // y: 0 -> -t
      grid.translate(0, t, zc);
      b = op(b, brush(box(aw, t * 3, ah), 0, t / 2, zc), SUBTRACTION);
      b = op(b, brush(grid), ADDITION);
    }
  }
  if (hasText) {
    const depth = Math.min(0.8, t * 0.4);
    const g = new TextGeometry(p.lidText.trim().slice(0, 24), { font: FONT, size: p.lidTextSize, depth: depth + 1, curveSegments: 4, bevelEnabled: false });
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    g.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, 0);
    const maxW = p.width - 4 * t - 2 * POST_R;
    const k = Math.min(1, maxW / Math.max(1, bb.max.x - bb.min.x));
    g.scale(k, k, 1);
    g.rotateX(-Math.PI / 2);
    const zc = p.honeycomb ? p.depth * 0.25 : 0;
    b = op(b, brush(g, 0, t - depth, zc), SUBTRACTION);
  }
  return b;
}

export function buildLid(p: EnclosureParams): THREE.BufferGeometry {
  const t = LID_THICKNESS(p);
  let b = chamferBlock(p.width, p.depth, 0, t, Math.min(chamferSize(p), t * 0.8), "bottom");
  b = decorateLid(b, p);
  const lip = brush(box(p.width - 2 * t - 0.4, 2, p.depth - 2 * t - 0.4), 0, -1, 0);
  b = op(b, lip, ADDITION);
  b = op(b, brush(box(p.width - 4 * t, 2.2, p.depth - 4 * t), 0, -1.1, 0), SUBTRACTION);
  if (p.lidMode === "hinge") {
    const z0 = -p.depth / 2 - HINGE_R;
    for (const [x0, x1] of hingeSegments(p).lid) {
      const L = x1 - x0, cx = (x0 + x1) / 2;
      let k = op(brush(knuckle(L), cx, 0, z0), brush(box(L, t, HINGE_R + chamferSize(p) + 2), cx, t / 2, z0 + (HINGE_R + chamferSize(p) + 2) / 2), ADDITION); // köprü: pah boşluğunu doldurur, tavan kesintisiz
      k = op(k, brush(box(L + 2, 20, 20), cx, t + 10, z0), SUBTRACTION); // üst yüz düz kalsın
      b = op(b, k, ADDITION);
      b = op(b, brush(cyl(PIN_HOLE, L + 1), cx, 0, z0, 0, Math.PI / 2), SUBTRACTION);
    }
    // çıtçıt tırnağı: ön yüzden aşağı inen esnek dil + içe dönük kilit dudağı + açma kulakçığı
    const zt = p.depth / 2 + 0.3 + SNAP_T / 2;
    b = op(b, brush(box(SNAP_W, t, 2.3 + SNAP_T), 0, t / 2, p.depth / 2 - 2 + (2.3 + SNAP_T) / 2), ADDITION); // bağlantı köprüsü
    b = op(b, brush(box(SNAP_W, SNAP_DROP + 2 + t, SNAP_T), 0, (t - SNAP_DROP - 2) / 2, zt), ADDITION);
    b = op(b, brush(box(SNAP_W, SNAP_LIP_H, 1.3), 0, -SNAP_DROP + SNAP_LIP_H / 2, p.depth / 2 - 0.15), ADDITION);
    // kilit dudağına 45° giriş pahı: kapanırken gövde kenarından kolay kaysın
    b = op(b, brush(box(SNAP_W + 2, 1.5, 1.5), 0, -SNAP_DROP, p.depth / 2 - 0.8, Math.PI / 4), SUBTRACTION);
    // açma kulakçığı: tavanla hemzemin (y<=t), tabla yüzünden taşmaz -> destek gerekmez
    const TL = 4.5, TH = 1.6;
    b = op(b, brush(box(SNAP_W, TH, TL), 0, t - TH / 2, zt + TL / 2), ADDITION);
    const ez = zt + TL;
    const tip = cyl(TH, SNAP_W); tip.rotateZ(Math.PI / 2);
    b = op(b, brush(tip, 0, t - TH / 2, ez), ADDITION);
    b = op(b, brush(box(SNAP_W + 2, 20, 20), 0, t + 10, zt), SUBTRACTION); // tavan üstünde hiçbir şey kalmasın
    // pahlar: dil ve kulakçığın dikey kenarları
    const c = 0.9;
    for (const sx of [-1, 1]) {
      b = op(b, brush(box(c * 2, 40, c * 2), sx * SNAP_W / 2, 0, zt + SNAP_T / 2, 0, 0, Math.PI / 4), SUBTRACTION);
      b = op(b, brush(box(c * 2, 40, c * 2), sx * SNAP_W / 2, 0, ez, 0, 0, Math.PI / 4), SUBTRACTION);
    }
    // dilin alt ucu: dış ve iç alt kenarlar 45° pah, alt köşeler pah
    const yb = -SNAP_DROP - 2;
    for (const dz of [-SNAP_T / 2, SNAP_T / 2]) b = op(b, brush(box(SNAP_W + 2, 1.2, 1.2), 0, yb, zt + dz, Math.PI / 4), SUBTRACTION);
    for (const sx of [-1, 1]) b = op(b, brush(box(1.6, 1.6, 10), sx * SNAP_W / 2, yb, zt, 0, Math.PI / 4, 0), SUBTRACTION);
    return b.geometry;
  }
  const cl = clearanceDiameter(p.screwSize);
  for (const [x, z] of cornerPositions(p)) {
    b = op(b, brush(cyl(POST_R * 2 + 0.6, 2.4), x, -1.1, z), SUBTRACTION);
    const f = POST_R + 0.3;
    b = op(b, brush(box(f, 2.4, f), x + Math.sign(x) * f / 2, -1.1, z + Math.sign(z) * f / 2), SUBTRACTION);
    b = op(b, brush(cyl(cl, t * 3), x, t / 2, z), SUBTRACTION);
    b = op(b, brush(cyl(cl * 1.9, 2), x, t, z), SUBTRACTION); // vida başı havşası
  }
  return b.geometry;
}

export const HINGE_R = 3;
export const PIN_HOLE = 2.0; // 1.75 mm filament pimi
const HINGE_GAP = 0.4;
const SNAP_W = 12, SNAP_T = 1.6, SNAP_DROP = 7, SNAP_LIP_H = 1.6;
const knuckle = (L: number) => { const g = cyl(HINGE_R * 2, L); g.rotateZ(Math.PI / 2); return g; };

/** Menteşe mafsal aralıkları (x): gövdede iki dış, kapakta orta mafsal */
export function hingeSegments(p: EnclosureParams) {
  const e = p.width / 2 - chamferSize(p) - 1;
  const m = Math.max(6, p.width / 6);
  return {
    base: [[-e, -m - HINGE_GAP], [m + HINGE_GAP, e]] as [number, number][],
    lid: [[-m, m]] as [number, number][],
  };
}

export function buildClip(p: EnclosureParams): THREE.BufferGeometry {
  let b = dinRails(50, 0, true);
  const cl = clearanceDiameter(p.screwSize);
  for (const x of [-12, 12]) b = op(b, brush(cyl(cl, 10), x, 0, 0), SUBTRACTION);
  return b.geometry;
}

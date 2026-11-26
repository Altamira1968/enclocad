// Hazır çizim paketleri: kart seçilince kutu, gerçek montaj delikleri ve tüm port kesimleri milimetrik oluşur.
import { DEFAULT_PARAMS, type Cutout, type CutoutType, type EnclosureParams, type LidMode, type ScrewMode } from "./enclosure";

type Edge = "left" | "right" | "front" | "back";
interface Port { edge: Edge; pos: number; type: CutoutType; z: number }
export type KitCategory = "arduino" | "rpi" | "iot";

export function kitCategory(id: string): KitCategory {
  if (["uno", "mega", "nano"].includes(id)) return "arduino";
  if (id.startsWith("rpi")) return "rpi";
  return "iot";
}

interface KitSpec {
  id: string; name: string;
  W: number; D: number;
  /** datasheet koordinatları: kart sol-alt köşe (0,0); y=0 kenarı kutunun arka duvarına bakar */
  holes?: [number, number][];
  inset: number;
  ports: Port[];
  /** kart kenarı ile iç duvar arası boşluk (konnektör taşmasını içerir) */
  m: { l: number; r: number; f: number; b: number };
  wall: number; height: number; standoff: number;
  lidMode: LidMode; screwMode: ScrewMode; lidText: string;
}

/** Köşe vida kulesinin iç duvardan kapladığı alan + pay (mm) */
const POST_CLEAR = 8.5;

export function kitParams(k: KitSpec, lidOverride?: LidMode): EnclosureParams {
  const t = k.wall;
  const lidMode = lidOverride ?? k.lidMode;
  const m = { ...k.m };
  if (lidMode === "screw") {
    // her köşede en az bir yanda kule payı olsun; portsuz yan öncelikli genişletilir
    const has = (e: Edge) => k.ports.some((p) => p.edge === e);
    for (const zs of ["f", "b"] as const) for (const xs of ["l", "r"] as const) {
      if (m[zs] >= POST_CLEAR || m[xs] >= POST_CLEAR) continue;
      const xe: Edge = xs === "l" ? "left" : "right";
      if (!has(xe)) m[xs] = POST_CLEAR; else m[zs] = POST_CLEAR;
    }
  }
  k = { ...k, m };
  const width = Math.ceil(k.m.l + k.W + k.m.r + 2 * t);
  const depth = Math.ceil(k.m.b + k.D + k.m.f + 2 * t);
  const cx = -width / 2 + t + k.m.l + k.W / 2;
  const cz = -depth / 2 + t + k.m.b + k.D / 2;
  const X = (x: number) => +(cx - k.W / 2 + x).toFixed(2);
  const Z = (y: number) => +(cz - k.D / 2 + y).toFixed(2);
  const cutouts: Cutout[] = k.ports.map((p, i) => ({
    id: `${k.id}-${i}`, face: p.edge, type: p.type, v: 0, pcbZ: p.z,
    u: p.edge === "left" || p.edge === "right" ? Z(p.pos) : X(p.pos),
  }));
  const params: EnclosureParams = {
    ...DEFAULT_PARAMS,
    width, depth, height: k.height, wall: t,
    lidMode, screwMode: k.screwMode,
    pcbEnabled: true, pcbWidth: k.W, pcbDepth: k.D, pcbInset: k.inset,
    standoffHeight: k.standoff, pcbOffsetX: +cx.toFixed(2), pcbOffsetZ: +cz.toFixed(2),
    din: "none", cutouts, lidText: k.lidText,
  };
  if (k.holes) params.pcbHoles = k.holes.map(([x, y]) => [+(x - k.W / 2).toFixed(2), +(y - k.D / 2).toFixed(2)]);
  return params;
}

export const KITS: KitSpec[] = [
  {
    id: "uno", name: "Arduino Uno R3", W: 68.6, D: 53.3, inset: 3.5,
    holes: [[14, 2.5], [15.3, 50.7], [66.1, 7.6], [66.1, 35.5]],
    ports: [
      { edge: "left", pos: 37.8, type: "USBB", z: 5.5 },
      { edge: "left", pos: 7.8, type: "BARREL", z: 5.5 },
    ],
    m: { l: 6.5, r: 3, f: 9, b: 9 }, wall: 2.4, height: 34, standoff: 5,
    lidMode: "screw", screwMode: "insert", lidText: "ARDUINO UNO",
  },
  {
    id: "rpi4", name: "Raspberry Pi 4", W: 85, D: 56, inset: 3.5,
    holes: [[3.5, 3.5], [61.5, 3.5], [3.5, 52.5], [61.5, 52.5]],
    ports: [
      { edge: "back", pos: 11.2, type: "USBC", z: 1.6 },
      { edge: "back", pos: 26, type: "MICROHDMI", z: 1.5 },
      { edge: "back", pos: 39.5, type: "MICROHDMI", z: 1.5 },
      { edge: "back", pos: 53.5, type: "AUDIO", z: 3 },
      { edge: "right", pos: 10.25, type: "RJ45", z: 6.8 },
      { edge: "right", pos: 29, type: "USBA2", z: 8 },
      { edge: "right", pos: 47, type: "USBA2", z: 8 },
    ],
    m: { l: 3, r: 2.5, f: 5, b: 1 }, wall: 2.4, height: 38, standoff: 5,
    lidMode: "hinge", screwMode: "tap", lidText: "RPI 4",
  },
  {
    id: "esp32", name: "ESP32 DevKit", W: 55, D: 28, inset: 2.5,
    ports: [{ edge: "left", pos: 14, type: "MICROUSB", z: 1.8 }],
    m: { l: 1, r: 3, f: 9, b: 9 }, wall: 2, height: 24, standoff: 4,
    lidMode: "screw", screwMode: "tap", lidText: "ESP32",
  },
  {
    id: "mega", name: "Arduino Mega 2560", W: 101.6, D: 53.3, inset: 3.5,
    holes: [[14, 2.5], [15.3, 50.7], [66.1, 7.6], [66.1, 35.5], [90.2, 50.7], [96.5, 2.5]],
    ports: [
      { edge: "left", pos: 37.8, type: "USBB", z: 5.5 },
      { edge: "left", pos: 7.8, type: "BARREL", z: 5.5 },
    ],
    m: { l: 6.5, r: 3, f: 9, b: 9 }, wall: 2.4, height: 34, standoff: 5,
    lidMode: "screw", screwMode: "insert", lidText: "ARDUINO MEGA",
  },
  {
    id: "nano", name: "Arduino Nano", W: 45, D: 18, inset: 1.5,
    ports: [{ edge: "left", pos: 9, type: "MINIUSB", z: 2 }],
    m: { l: 1, r: 3, f: 9, b: 9 }, wall: 2, height: 22, standoff: 4,
    lidMode: "hinge", screwMode: "tap", lidText: "NANO",
  },
  {
    id: "rpi5", name: "Raspberry Pi 5", W: 85, D: 56, inset: 3.5,
    holes: [[3.5, 3.5], [61.5, 3.5], [3.5, 52.5], [61.5, 52.5]],
    ports: [
      { edge: "back", pos: 11.2, type: "USBC", z: 1.6 },
      { edge: "back", pos: 25.8, type: "MICROHDMI", z: 1.5 },
      { edge: "back", pos: 39.2, type: "MICROHDMI", z: 1.5 },
      { edge: "right", pos: 9, type: "USBA2", z: 8 },
      { edge: "right", pos: 27, type: "USBA2", z: 8 },
      { edge: "right", pos: 45.75, type: "RJ45", z: 6.8 },
    ],
    m: { l: 3, r: 2.5, f: 5, b: 1 }, wall: 2.4, height: 40, standoff: 5,
    lidMode: "hinge", screwMode: "tap", lidText: "RPI 5",
  },
  {
    id: "rpizero", name: "Raspberry Pi Zero 2 W", W: 65, D: 30, inset: 3.5,
    holes: [[3.5, 3.5], [61.5, 3.5], [3.5, 26.5], [61.5, 26.5]],
    ports: [
      { edge: "back", pos: 12.4, type: "MINIHDMI", z: 1.5 },
      { edge: "back", pos: 41.4, type: "MICROUSB", z: 1.5 },
      { edge: "back", pos: 54, type: "MICROUSB", z: 1.5 },
    ],
    m: { l: 2, r: 2, f: 4, b: 1 }, wall: 2, height: 22, standoff: 4,
    lidMode: "hinge", screwMode: "tap", lidText: "PI ZERO",
  },
  {
    id: "d1mini", name: "Wemos D1 Mini (ESP8266)", W: 34.2, D: 25.6, inset: 2,
    ports: [{ edge: "left", pos: 12.8, type: "MICROUSB", z: 1.8 }],
    m: { l: 1, r: 3, f: 6, b: 6 }, wall: 2, height: 22, standoff: 4,
    lidMode: "hinge", screwMode: "tap", lidText: "D1 MINI",
  },
];

// Hazır çizim paketleri: kart seçilince kutu, gerçek montaj delikleri ve tüm port kesimleri milimetrik oluşur.
import { DEFAULT_PARAMS, type Cutout, type CutoutType, type EnclosureParams, type LidMode, type ScrewMode } from "./enclosure";

type Edge = "left" | "right" | "front" | "back";
interface Port { edge: Edge; pos: number; type: CutoutType; z: number }
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

export function kitParams(k: KitSpec): EnclosureParams {
  const t = k.wall;
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
    lidMode: k.lidMode, screwMode: k.screwMode,
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
];

import { DEFAULT_PARAMS, type EnclosureParams } from "./enclosure";
import { KITS, kitParams } from "./kits";
import type { Key } from "./i18n";
import rpiImage from "@/assets/enclosure-gallery-0.png.asset.json";
import espImage from "@/assets/enclosure-gallery-1.png.asset.json";
import unoImage from "@/assets/enclosure-gallery-2.png.asset.json";
import relayImage from "@/assets/enclosure-gallery-3.png.asset.json";
import sensorImage from "@/assets/enclosure-gallery-4.png.asset.json";
import cableImage from "@/assets/enclosure-gallery-5.png.asset.json";

export const GALLERY_IMAGES: Record<string, string> = {
  "gallery-rpi4-din": rpiImage.url, "gallery-esp32-iot": espImage.url,
  "gallery-arduino-uno": unoImage.url, "gallery-relay": relayImage.url,
  "gallery-sensor": sensorImage.url, "gallery-cable": cableImage.url,
};

export type GalleryFilter = "all" | "hinge" | "screw" | "din";
export interface GalleryModel {
  id: string;
  title: Key;
  description: Key;
  params: EnclosureParams;
  boardId?: string;
}

function board(id: string): EnclosureParams {
  const kit = KITS.find((k) => k.id === id);
  if (!kit) throw new Error(`Unknown board kit: ${id}`);
  return kitParams(kit);
}

export const GALLERY_MODELS: GalleryModel[] = [
  { id: "gallery-rpi4-din", boardId: "rpi4", title: "galleryRpi", description: "galleryRpiDesc",
    params: { ...board("rpi4"), din: "clip", honeycomb: true, lidTextSize: 7 } },
  { id: "gallery-esp32-iot", boardId: "esp32", title: "galleryEsp", description: "galleryEspDesc",
    params: { ...board("esp32"), lidMode: "hinge", honeycomb: true, hexSize: 4, lidText: "ESP32 IOT", lidTextSize: 6,
      cutouts: [...board("esp32").cutouts, { id: "esp-vent", face: "front", type: "VENT", u: 0, v: 0 }] } },
  { id: "gallery-arduino-uno", boardId: "uno", title: "galleryUno", description: "galleryUnoDesc",
    params: { ...board("uno"), lidTextSize: 6 } },
  { id: "gallery-relay", title: "galleryRelay", description: "galleryRelayDesc",
    params: { ...DEFAULT_PARAMS, width: 80, depth: 64, height: 34, pcbWidth: 50, pcbDepth: 38, pcbInset: 3,
      din: "clip", lidText: "RELAY", lidTextSize: 7,
      cutouts: [{ id: "relay-in", face: "front", type: "RJ45", u: -14, v: 0 },
        { id: "relay-out", face: "front", type: "RJ45", u: 14, v: 0 }] } },
  { id: "gallery-sensor", title: "gallerySensor", description: "gallerySensorDesc",
    params: { ...DEFAULT_PARAMS, width: 64, depth: 50, height: 26, wall: 2, lidMode: "hinge", pcbEnabled: false,
      honeycomb: true, hexSize: 4, lidText: "SENSOR", lidTextSize: 5,
      cutouts: [{ id: "sensor-left", face: "left", type: "VENT", u: 0, v: 0 },
        { id: "sensor-right", face: "right", type: "VENT", u: 0, v: 0 }] } },
  { id: "gallery-cable", title: "galleryCable", description: "galleryCableDesc",
    params: { ...DEFAULT_PARAMS, width: 110, depth: 76, height: 40, pcbEnabled: false, lidText: "CABLE BOX", lidTextSize: 7,
      cutouts: [{ id: "cable-in", face: "front", type: "PG9", u: -22, v: 0 },
        { id: "cable-out", face: "front", type: "PG9", u: 22, v: 0 },
        { id: "cable-back", face: "back", type: "PG11", u: 0, v: 0 }] } },
];

export function filterGallery(filter: GalleryFilter): GalleryModel[] {
  return GALLERY_MODELS.filter(({ params }) => filter === "all" ||
    (filter === "din" ? params.din !== "none" : params.lidMode === filter));
}
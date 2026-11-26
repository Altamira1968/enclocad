// Thingiverse/Printables paylaşımları için adlandırılmış hazır tasarımlar (?template=...)
import type { EnclosureParams } from "./enclosure";
import { GALLERY_MODELS } from "./gallery";

export const TEMPLATES: Record<string, Partial<EnclosureParams>> = {
  ...Object.fromEntries(GALLERY_MODELS.map((model) => [model.id, model.params])),
  "rpi4-din": {
    "width": 100,
    "depth": 72,
    "height": 38,
    "wall": 2.4,
    "lidMode": "screw",
    "screwMode": "tap",
    "screwSize": "M3",
    "pcbEnabled": true,
    "pcbWidth": 60,
    "pcbDepth": 40,
    "pcbInset": 3.5,
    "standoffHeight": 5,
    "din": "clip",
    "cutouts": [
      {
        "id": "c1",
        "face": "front",
        "type": "USBC",
        "u": -20,
        "v": 0
      },
      {
        "id": "c2",
        "face": "front",
        "type": "PG9",
        "u": 22,
        "v": 0
      },
      {
        "id": "c3",
        "face": "right",
        "type": "VENT",
        "u": 0,
        "v": 0
      }
    ],
    "lidText": "RPI 4 DIN",
    "lidTextSize": 8,
    "honeycomb": true,
    "hexSize": 5,
    "pcb": true,
    "pcbW": 85,
    "pcbD": 56
  },
  "esp32-hinge": {
    "width": 78,
    "depth": 50,
    "height": 28,
    "wall": 2,
    "lidMode": "hinge",
    "screwMode": "tap",
    "screwSize": "M3",
    "pcbEnabled": true,
    "pcbWidth": 60,
    "pcbDepth": 40,
    "pcbInset": 2.5,
    "standoffHeight": 4,
    "din": "none",
    "cutouts": [
      {
        "id": "c1",
        "face": "front",
        "type": "USBC",
        "u": 0,
        "v": 0
      },
      {
        "id": "c2",
        "face": "left",
        "type": "VENT",
        "u": 0,
        "v": 0
      }
    ],
    "lidText": "ESP32 IOT",
    "lidTextSize": 7,
    "honeycomb": true,
    "hexSize": 4.5,
    "pcb": true,
    "pcbW": 55,
    "pcbD": 28
  },
  "arduino-uno": {
    "width": 90,
    "depth": 75,
    "height": 32,
    "wall": 2.4,
    "lidMode": "screw",
    "screwMode": "insert",
    "screwSize": "M3",
    "pcbEnabled": true,
    "pcbWidth": 60,
    "pcbDepth": 40,
    "pcbInset": 3.5,
    "standoffHeight": 5,
    "din": "none",
    "cutouts": [
      {
        "id": "c1",
        "face": "front",
        "type": "USBC",
        "u": -15,
        "v": 0
      },
      {
        "id": "c2",
        "face": "front",
        "type": "DC",
        "u": 20,
        "v": 0
      }
    ],
    "lidText": "ARDUINO UNO",
    "lidTextSize": 8,
    "honeycomb": false,
    "hexSize": 5,
    "pcb": true,
    "pcbW": 68.6,
    "pcbD": 53.3
  }
} as Record<string, Partial<EnclosureParams>>;

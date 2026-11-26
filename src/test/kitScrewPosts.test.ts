import { describe, it, expect } from "vitest";
import { KITS, kitParams } from "@/lib/kits";

// Vidalı kapakta köşe kuleleri (r=4) ile PCB montaj ayakları çakışmamalı
describe("vidalı kapakta kule/ayak çakışması", () => {
  for (const k of KITS) it(k.id, () => {
    const p = kitParams(k, "screw");
    const ox = p.width / 2 - p.wall - 3.5, oz = p.depth / 2 - p.wall - 3.5;
    const sx = p.pcbWidth / 2 - p.pcbInset, sz = p.pcbDepth / 2 - p.pcbInset;
    const holes = p.pcbHoles ?? [[sx, sz], [-sx, sz], [sx, -sz], [-sx, -sz]];
    for (const [hx, hz] of holes) for (const [cx, cz] of [[ox, oz], [-ox, oz], [ox, -oz], [-ox, -oz]] as const) {
      const d = Math.hypot(hx + (p.pcbOffsetX ?? 0) - cx, hz + (p.pcbOffsetZ ?? 0) - cz);
      expect(d).toBeGreaterThan(4 + 2.5);
    }
  });
});

import { describe, it, expect } from "vitest";
import { hingeSegments } from "@/lib/enclosure";
import { GALLERY_MODELS as GALLERY } from "@/lib/gallery";

describe("hinge segments", () => {
  it("lid has 3 knuckles (left, middle, right) and base has 2", () => {
    for (const m of GALLERY as any[]) {
      const h = hingeSegments(m.params);
      expect(h.lid.length).toBe(3);
      expect(h.base.length).toBe(2);
      const all = [...h.lid, ...h.base].sort((a, b) => a[0] - b[0]);
      expect(h.lid[0]![0]).toBe(all[0]![0]);
      expect(h.lid[2]![1]).toBe(all[4]![1]);
      for (let i = 1; i < 5; i++) expect(all[i]![0] - all[i - 1]![1]).toBeCloseTo(0.4);
    }
  });
});

import { describe, expect, it } from "vitest";
import { KITS, kitParams } from "@/lib/kits";

describe("hazır kart paketleri", () => {
  it("8 kart sunar", () => {
    expect(KITS.map((k) => k.id)).toEqual(["uno", "rpi4", "esp32", "mega", "nano", "rpi5", "rpizero", "d1mini"]);
  });
  it("her kart iki kapak modunda kartı içine alan kutu üretir", () => {
    for (const k of KITS) for (const mode of ["screw", "hinge"] as const) {
      const p = kitParams(k, mode);
      expect(p.width - 2 * p.wall).toBeGreaterThanOrEqual(k.W);
      expect(p.depth - 2 * p.wall).toBeGreaterThanOrEqual(k.D);
      expect(p.cutouts).toHaveLength(k.ports.length);
    }
  });
  it("Raspberry Pi 5'te Ethernet sağ duvarın önünde, Pi 4'te arkasında", () => {
    const eth = (id: string) => kitParams(KITS.find((k) => k.id === id)!).cutouts.find((c) => c.type === "RJ45")!.u;
    expect(eth("rpi5")).toBeGreaterThan(eth("rpi4"));
  });
});

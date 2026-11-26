import { describe, expect, it } from "vitest";
import { filterGallery, GALLERY_MODELS } from "@/lib/gallery";
import { TEMPLATES } from "@/lib/templates";

describe("Example gallery", () => {
  it("contains six distinct example designs", () => {
    expect(GALLERY_MODELS).toHaveLength(7);
    expect(new Set(GALLERY_MODELS.map((model) => model.id)).size).toBe(7);
  });
  it("registers the exact gallery parameters for editor links", () => {
    for (const model of GALLERY_MODELS) expect(TEMPLATES[model.id]).toEqual(model.params);
  });
  it("filters hinged designs", () => {
    expect(filterGallery("hinge").map((m) => m.id)).toEqual(["gallery-rpi4-din", "gallery-esp32-iot", "gallery-sensor", "gallery-pipe-case"]);
  });
  it("filters screw-lid designs", () => {
    expect(filterGallery("screw").map((m) => m.id)).toEqual(["gallery-arduino-uno", "gallery-relay", "gallery-cable"]);
  });
  it("filters DIN-mounted designs", () => {
    expect(filterGallery("din").map((m) => m.id)).toEqual(["gallery-rpi4-din", "gallery-relay"]);
  });
});
import { buildInnerLid } from "@/lib/enclosure";
describe("Pipe case", () => {
  const m = GALLERY_MODELS.find((g) => g.id === "gallery-pipe-case")!;
  it("long divider spans the full inner height", () => {
    expect(m.params.dividers?.[0]?.h).toBe(43);
  });
  it("has a separate tobacco inner lid seated on 34 mm walls", () => {
    expect(m.params.innerLid?.y).toBe(34);
    const g = buildInnerLid(m.params)!;
    g.computeBoundingBox();
    expect(g.boundingBox!.max.y).toBeLessThanOrEqual(m.params.height - m.params.wall - 1);
  });
});

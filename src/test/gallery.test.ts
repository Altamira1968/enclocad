import { describe, expect, it } from "vitest";
import { filterGallery, GALLERY_MODELS } from "@/lib/gallery";
import { TEMPLATES } from "@/lib/templates";

describe("Example gallery", () => {
  it("contains six distinct example designs", () => {
    expect(GALLERY_MODELS).toHaveLength(6);
    expect(new Set(GALLERY_MODELS.map((model) => model.id)).size).toBe(6);
  });
  it("registers the exact gallery parameters for editor links", () => {
    for (const model of GALLERY_MODELS) expect(TEMPLATES[model.id]).toEqual(model.params);
  });
  it("filters hinged designs", () => {
    expect(filterGallery("hinge").map((m) => m.id)).toEqual(["gallery-rpi4-din", "gallery-esp32-iot", "gallery-sensor"]);
  });
  it("filters screw-lid designs", () => {
    expect(filterGallery("screw").map((m) => m.id)).toEqual(["gallery-arduino-uno", "gallery-relay", "gallery-cable"]);
  });
  it("filters DIN-mounted designs", () => {
    expect(filterGallery("din").map((m) => m.id)).toEqual(["gallery-rpi4-din", "gallery-relay"]);
  });
});
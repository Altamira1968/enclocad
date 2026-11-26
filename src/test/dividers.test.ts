import { describe, expect, it } from "vitest";
import { buildBase, DEFAULT_PARAMS, LID_THICKNESS, type EnclosureParams } from "@/lib/enclosure";

const withDividers = (dividers?: EnclosureParams["dividers"]): EnclosureParams =>
  dividers ? { ...DEFAULT_PARAMS, dividers } : { ...DEFAULT_PARAMS };

const vertexCount = (g: ReturnType<typeof buildBase>) => g.attributes["position"]?.count ?? 0;

describe("Inner divider walls", () => {
  it("adds geometry to the base", () => {
    const bare = buildBase(withDividers());
    const wall = buildBase(withDividers([{ x: 0, z: 0, w: 95, d: 2, h: 20 }]));
    expect(vertexCount(wall)).toBeGreaterThan(vertexCount(bare));
  });

  it("clamps an over-tall wall to the interior height under the lid", () => {
    const g = buildBase(withDividers([{ x: 0, z: 0, w: 95, d: 2, h: 999 }]));
    g.computeBoundingBox();
    const inner = DEFAULT_PARAMS.height - LID_THICKNESS(DEFAULT_PARAMS);
    expect(g.boundingBox!.max.y).toBeLessThanOrEqual(inner + 0.01);
  });

  it("keeps the outer box size unchanged", () => {
    const g = buildBase(withDividers([{ x: 0, z: 0, w: 95, d: 2, h: 20 }]));
    g.computeBoundingBox();
    expect(g.boundingBox!.max.x - g.boundingBox!.min.x).toBeCloseTo(DEFAULT_PARAMS.width, 0);
    expect(g.boundingBox!.max.z - g.boundingBox!.min.z).toBeCloseTo(DEFAULT_PARAMS.depth, 0);
  });
});

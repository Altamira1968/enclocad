import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildBase, buildLid, DEFAULT_PARAMS, gasketEnabled, gasketInset, gasketRim, LID_THICKNESS, normalizeGasket, TPU_GASKET, type EnclosureParams } from "@/lib/enclosure";
import { KITS, kitParams } from "@/lib/kits";

const params: EnclosureParams = { ...DEFAULT_PARAMS, gasket: "tpu175", cutouts: [], pcbEnabled: false };
function topAt(geometry: THREE.BufferGeometry, x: number, z: number) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  mesh.updateMatrixWorld();
  return new THREE.Raycaster(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0)).intersectObject(mesh)[0]?.point.y;
}

describe("TPU filament sealing", () => {
  it("accepts 1.75 mm TPU only for screw lids", () => {
    expect(TPU_GASKET.diameter).toBe(1.75);
    expect(gasketEnabled(params)).toBe(true);
    expect(gasketEnabled({ ...params, lidMode: "hinge" })).toBe(false);
  });
  it("switching to snap-fit removes the active seal including shared parameters", () => {
    expect(normalizeGasket({ ...params, lidMode: "hinge" }).gasket).toBe("none");
    expect(normalizeGasket(params).gasket).toBe("tpu175");
  });
  it("disables gasket with open ports but keeps it for PG glands", () => {
    expect(normalizeGasket({ ...params, cutouts: [{ id: "a", face: "back", type: "USBC", u: 0, v: 0 }] }).gasket).toBe("none");
    expect(normalizeGasket({ ...params, honeycomb: true }).gasket).toBe("none");
    expect(normalizeGasket({ ...params, cutouts: [{ id: "g", face: "back", type: "PG7", u: 0, v: 0 }] }).gasket).toBe("tpu175");
  });
  it("old designs have no seal", () => {
    const { gasket: _g, ...old } = params;
    expect(gasketEnabled(old)).toBe(false);
    expect(DEFAULT_PARAMS.gasket).toBe("none");
  });
  it("creates a 2.1 mm wide, 1.3 mm deep groove with material on both sides", () => {
    const base = buildBase(params), H = params.height - LID_THICKNESS(params);
    const z = params.depth / 2 - gasketInset(params);
    expect(TPU_GASKET.width).toBe(2.1);
    expect(topAt(base, 0, z)).toBeCloseTo(H - 1.3, 3);
    expect(topAt(base, 0, z - 1.2)).toBeCloseTo(H, 3);
    expect(topAt(base, 0, z + 1.2)).toBeCloseTo(H, 3);
    expect(topAt(base, 0, 0)).toBeCloseTo(params.wall, 3);
    base.dispose();
  });
  it("keeps the lid bearing face flat and its print surface at the lid height", () => {
    const lid = buildLid(params);
    lid.computeBoundingBox();
    expect(lid.boundingBox?.min.y).toBeCloseTo(0, 3);
    expect(lid.boundingBox?.max.y).toBeCloseTo(LID_THICKNESS(params), 3);
    expect(topAt(lid, 0, params.depth / 2 - gasketInset(params))).toBeCloseTo(LID_THICKNESS(params), 3);
    lid.dispose();
  });
  it("keeps the channel outside the inner cavity with a 1 mm inner edge", () => {
    expect(gasketRim(params) - gasketInset(params) - TPU_GASKET.width / 2).toBeCloseTo(1, 6);
  });
  it("keeps all four rounded corners connected at the groove depth", () => {
    const base = buildBase(params), H = params.height - LID_THICKNESS(params);
    const inset = gasketInset(params), r = TPU_GASKET.radius;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * (params.width / 2 - inset - r + r / Math.SQRT2);
      const z = sz * (params.depth / 2 - inset - r + r / Math.SQRT2);
      expect(topAt(base, x, z)).toBeCloseTo(H - TPU_GASKET.depth, 2);
    }
    base.dispose();
  });
  it("generates sealing grooves for port-free kit sizes and a small box", () => {
    const designs = [...KITS.map((k) => ({ ...kitParams(k, "screw"), cutouts: [], gasket: "tpu175" as const })), { ...params, width: 30, depth: 30, wall: 4 }];
    for (const p of designs) {
      const base = buildBase(p);
      expect(topAt(base, 0, p.depth / 2 - gasketInset(p))).toBeCloseTo(p.height - LID_THICKNESS(p) - 1.3, 3);
      base.dispose();
    }
  }, 30000);
});
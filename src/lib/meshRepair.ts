import * as THREE from "three";

/** CSG sonrası ağı su geçirmez yapar: tepe noktalarını kaynatır, T-birleşimlerini böler, dejenere üçgenleri atar. */
export function repairMesh(g: THREE.BufferGeometry, tol = 1e-3): THREE.BufferGeometry {
  const src = g.index ? g.toNonIndexed() : g;
  const p = src.getAttribute("position");
  const verts: number[] = [];
  const map = new Map<string, number>();
  const q = (v: number) => Math.round(v / tol);
  const id = (i: number) => {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = `${q(x)},${q(y)},${q(z)}`;
    let n = map.get(k);
    if (n === undefined) { n = verts.length / 3; verts.push(x, y, z); map.set(k, n); }
    return n;
  };
  let tris: number[][] = [];
  for (let i = 0; i < p.count; i += 3) {
    const t = [id(i), id(i + 1), id(i + 2)];
    if (t[0] !== t[1] && t[1] !== t[2] && t[0] !== t[2]) tris.push(t);
  }
  const V = (i: number) => new THREE.Vector3(verts[i * 3], verts[i * 3 + 1], verts[i * 3 + 2]);
  for (let iter = 0; iter < 20; iter++) {
    const cnt = new Map<string, number>();
    const ek = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);
    for (const t of tris) for (let j = 0; j < 3; j++) { const k = ek(t[j]!, t[(j + 1) % 3]!); cnt.set(k, (cnt.get(k) ?? 0) + 1); }
    const bverts = new Set<number>();
    for (const [k, c] of cnt) if (c === 1) { const [a, b] = k.split("_").map(Number); bverts.add(a!); bverts.add(b!); }
    if (!bverts.size) break;
    const bv = [...bverts].map((i) => ({ i, v: V(i) }));
    let changed = false;
    const out: number[][] = [];
    for (const t of tris) {
      let split = false;
      for (let j = 0; j < 3 && !split; j++) {
        const a = t[j]!, b = t[(j + 1) % 3]!, c = t[(j + 2) % 3]!;
        if (cnt.get(ek(a, b)) !== 1) continue;
        const A = V(a), B = V(b), AB = B.clone().sub(A), L2 = AB.lengthSq();
        let best = -1, bestT = 2;
        for (const { i, v } of bv) {
          if (i === a || i === b) continue;
          const s = v.clone().sub(A).dot(AB) / L2;
          if (s <= 1e-6 || s >= 1 - 1e-6) continue;
          if (A.clone().addScaledVector(AB, s).distanceTo(v) > tol * 2) continue;
          if (s < bestT) { bestT = s; best = i; }
        }
        if (best >= 0) { out.push([a, best, c], [best, b, c]); split = true; changed = true; }
      }
      if (!split) out.push(t);
    }
    tris = out;
    if (!changed) break;
  }
  const res = new THREE.BufferGeometry();
  res.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  res.setIndex(tris.flat());
  res.computeVertexNormals();
  return res;
}

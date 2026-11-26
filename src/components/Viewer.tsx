import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type ViewMode = "all" | "base" | "lid";
interface Props {
  base: THREE.BufferGeometry | null;
  lid: THREE.BufferGeometry | null;
  clip: THREE.BufferGeometry | null;
  inner?: THREE.BufferGeometry | null;
  baseHeight: number;
  size: number;
  explode: number;
  mode: ViewMode;
  ghost: boolean;
  markers?: Marker[];
  labels?: boolean;
}
export interface Marker { id: string; part: "base" | "lid" | "clip"; pos: [number, number, number]; title: string; body: string }

export default function Viewer(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const markerEls = useRef<Record<string, HTMLDivElement | null>>({});
  const markersRef = useRef<Marker[]>([]);
  const cardEls = useRef<Record<string, HTMLDivElement | null>>({});
  const lineEls = useRef<Record<string, SVGLineElement | null>>({});
  markersRef.current = props.markers ?? [];
  const [active, setActive] = useState<string | null>(null);
  const state = useRef<{
    base: THREE.Mesh; lid: THREE.Mesh; clip: THREE.Mesh; inner: THREE.Mesh;
    camera: THREE.PerspectiveCamera; controls: OrbitControls; lastSize: number;
  } | null>(null);

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#1a1f26");
    const camera = new THREE.PerspectiveCamera(40, 1, 1, 5000);
    camera.position.set(160, 140, 200);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(120, 260, 160);
    scene.add(sun);
    const grid = new THREE.GridHelper(400, 40, "#f2a93b", 0x3a434d);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    grid.position.y = -0.01;
    scene.add(grid);
    const mat = (c: string, o = 1) =>
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.05, transparent: o < 1, opacity: o });
    const base = new THREE.Mesh(undefined, mat("#d9dde2"));
    const lid = new THREE.Mesh(undefined, mat("#f2a93b"));
    const clip = new THREE.Mesh(undefined, mat("#7a8794"));
    const inner = new THREE.Mesh(undefined, mat("#5fb3a8"));
    scene.add(base, lid, clip, inner);
    state.current = { base, lid, clip, inner, camera, controls, lastSize: 0 };

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    let raf = 0;
    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      const v = new THREE.Vector3();
      const W = el.clientWidth, Hh = el.clientHeight;
      const pts: { id: string; x: number; y: number; vis: boolean }[] = [];
      for (const m of markersRef.current) {
        const node = markerEls.current[m.id];
        const mesh = m.part === "lid" ? lid : m.part === "clip" ? clip : base;
        v.set(...m.pos); mesh.localToWorld(v); v.project(camera);
        const x = ((v.x + 1) / 2) * W, y = ((1 - v.y) / 2) * Hh, vis = mesh.visible && v.z < 1;
        pts.push({ id: m.id, x, y, vis });
        if (!node) continue;
        node.style.transform = `translate(${x}px, ${y}px)`;
        node.style.display = vis ? "block" : "none";
      }
      // etiketler: sol/sağ kenar sütunlarına dizilir, çizgi noktaya bağlanır
      for (const side of ["l", "r"] as const) {
        const list = pts.filter((p) => p.vis && (side === "l" ? p.x < W / 2 : p.x >= W / 2)).sort((a, b) => a.y - b.y);
        const slot = (Hh - 40) / Math.max(list.length, 1);
        list.forEach((p, i) => {
          const card = cardEls.current[p.id], line = lineEls.current[p.id];
          if (!card || !line) return;
          const cy = 36 + slot * i + slot / 2;
          const cw = card.offsetWidth, ch = card.offsetHeight;
          const cx = side === "l" ? 8 : W - 8 - cw;
          card.style.display = "block";
          card.style.transform = `translate(${cx}px, ${cy - ch / 2}px)`;
          line.style.display = "";
          line.setAttribute("x1", String(side === "l" ? cx + cw : cx)); line.setAttribute("y1", String(cy));
          line.setAttribute("x2", String(p.x)); line.setAttribute("y2", String(p.y));
        });
      }
      for (const p of pts) if (!p.vis) {
        const card = cardEls.current[p.id], line = lineEls.current[p.id];
        if (card) card.style.display = "none";
        if (line) line.style.display = "none";
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    el.dataset["sceneReady"] = "true";
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const s = state.current;
    if (!s) return;
    const { base, lid, clip, baseHeight, explode, mode, ghost, size } = { ...s, ...props, base: s.base, lid: s.lid, clip: s.clip };
    if (props.base) base.geometry = props.base;
    if (props.lid) lid.geometry = props.lid;
    if (props.clip) clip.geometry = props.clip;
    base.visible = !!props.base && mode !== "lid";
    lid.visible = !!props.lid && mode !== "base";
    clip.visible = !!props.clip && mode !== "lid";
    lid.position.y = mode === "lid" ? 0 : baseHeight + explode;
    const lm = lid.material as THREE.MeshStandardMaterial;
    lm.opacity = ghost ? 0.3 : 1;
    lm.transparent = ghost;
    lm.depthWrite = !ghost;
    clip.position.y = -3 - explode * 0.6;
    props.base?.computeBoundingBox();
    const minY = props.base?.boundingBox?.min.y ?? 0;
    const lift = props.clip ? 12 + explode * 0.6 : Math.max(0, -minY);
    base.position.y = lift;
    if (props.inner) s.inner.geometry = props.inner;
    s.inner.visible = !!props.inner && mode !== "lid";
    s.inner.position.y = lift + explode * 0.5;
    lid.position.y += lift;
    clip.position.y += lift;
    if (Math.abs(size - s.lastSize) > size * 0.3) {
      s.lastSize = size;
      s.camera.position.set(size * 1.4, size * 1.2, size * 1.7);
      s.controls.target.set(0, baseHeight / 2 + lift, 0);
    }
  }, [props]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={host} className="h-full w-full" />
      {props.labels && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ zIndex: 5 }}>
          {(props.markers ?? []).map((m) => (
            <line key={m.id} ref={(n) => { lineEls.current[m.id] = n; }} className="stroke-primary" strokeWidth={1} />
          ))}
        </svg>
      )}
      {(props.markers ?? []).map((m, i) => (
        <div key={m.id} ref={(n) => { markerEls.current[m.id] = n; }} className="pointer-events-none absolute left-0 top-0" style={{ zIndex: active === m.id ? 20 : 10 }}>
          <button type="button" aria-label={m.title}
            onMouseEnter={() => setActive(m.id)} onMouseLeave={() => setActive(null)} onClick={() => setActive(active === m.id ? null : m.id)}
            className="pointer-events-auto absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background shadow-lg">
            <span className="sr-only">{i + 1}</span>
          </button>
          {!props.labels && active === m.id && (
            <div className="absolute left-3 top-0 flex -translate-y-1/2 items-center">
              <span className="h-px w-8 bg-primary" />
              <div className="w-56 rounded-md border border-primary/60 bg-card p-3 shadow-xl">
                <p className="font-mono text-xs font-bold uppercase text-primary">{m.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{m.body}</p>
              </div>
            </div>
          )}
        </div>
      ))}
      {props.labels && (props.markers ?? []).map((m) => (
        <div key={m.id} ref={(n) => { cardEls.current[m.id] = n; }}
          className="pointer-events-none absolute left-0 top-0 w-32 rounded-md border border-primary/60 bg-card/95 p-1.5 shadow-xl" style={{ zIndex: 15 }}>
          <p className="font-mono text-[10px] font-bold uppercase leading-tight tracking-wide text-primary">{m.title}</p>
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{m.body}</p>
        </div>
      ))}
    </div>
  );
}

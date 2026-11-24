import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type ViewMode = "all" | "base" | "lid";
interface Props {
  base: THREE.BufferGeometry | null;
  lid: THREE.BufferGeometry | null;
  clip: THREE.BufferGeometry | null;
  baseHeight: number;
  size: number;
  explode: number;
  mode: ViewMode;
  ghost: boolean;
}

export default function Viewer(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef<{
    base: THREE.Mesh; lid: THREE.Mesh; clip: THREE.Mesh;
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
    scene.add(base, lid, clip);
    state.current = { base, lid, clip, camera, controls, lastSize: 0 };

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
    lid.position.y += lift;
    clip.position.y += lift;
    if (Math.abs(size - s.lastSize) > size * 0.3) {
      s.lastSize = size;
      s.camera.position.set(size * 1.4, size * 1.2, size * 1.7);
      s.controls.target.set(0, baseHeight / 2 + lift, 0);
    }
  }, [props]);

  return <div ref={host} className="h-full w-full" />;
}

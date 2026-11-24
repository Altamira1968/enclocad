import { repairMesh } from "@/lib/meshRepair";
import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useDeferredValue, useEffect, useState, type ReactNode } from "react";
import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import JSZip from "jszip";
import {
  DEFAULT_PARAMS, PCB_PRESETS, LID_THICKNESS, buildBase, buildLid, buildClip,
  type EnclosureParams, type Cutout, type CutoutType, type Face,
} from "@/lib/enclosure";
import { t as tr, type Lang, type Key } from "@/lib/i18n";
import type { ViewMode } from "@/components/Viewer";

const Viewer = lazy(() => import("@/components/Viewer"));
import PartSearch from "@/components/PartSearch";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EncloCAD — Parametrik Elektronik Kutu Tasarımcısı" },
      { name: "description", content: "Elektronik projeleriniz için vidalı kapaklı, DIN rayı montajlı kutuları tarayıcıda tasarlayın ve STL olarak indirin." },
      { property: "og:title", content: "EncloCAD — Parametrik Elektronik Kutu Tasarımcısı" },
      { property: "og:description", content: "Ölçüleri girin, PG rakor ve konnektör kesimlerini ekleyin, 3D yazıcıya hazır STL dosyalarını indirin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function NumField({ label, value, onChange, min, max, step = 0.5 }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="number" value={value} min={min} max={max} step={step}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
        }}
        className="w-24 rounded-md border border-input bg-background px-2 py-1 text-right font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function Seg<T extends string>({ value, options, onChange }: {
  value: T; options: { v: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-md border border-border p-0.5">
      {options.map((o) => (
        <button
          key={o.v} type="button" onClick={() => onChange(o.v)}
          className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${value === o.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-b border-border px-5 py-4">
      <h2 className="font-mono text-xs uppercase tracking-widest text-primary">{title}</h2>
      {children}
    </section>
  );
}

const CUT_TYPES: CutoutType[] = ["NONE", "PG7", "PG9", "PG11", "USBC", "DC", "RJ45", "VENT"];
const FACES: Face[] = ["front", "back", "left", "right"];

function Index() {
  const [lang, setLang] = useState<Lang>("en");
  const [searchOpen, setSearchOpen] = useState(false);
  const L = (k: Key) => tr(lang, k);
  const [p, setP] = useState<EnclosureParams>(DEFAULT_PARAMS);
  const [explode, setExplode] = useState(25);
  const [mode, setMode] = useState<ViewMode>("all");
  const [ghost, setGhost] = useState(false);
  const [preset, setPreset] = useState("custom");
  const [copied, setCopied] = useState(false);
  const [hashReady, setHashReady] = useState(false);
  useEffect(() => {
    try {
      const h = window.location.hash.slice(1);
      if (h.startsWith("d=")) setP({ ...DEFAULT_PARAMS, ...JSON.parse(decodeURIComponent(h.slice(2))) });
    } catch { /* geçersiz link */ }
    setHashReady(true);
  }, []);
  useEffect(() => {
    if (hashReady) history.replaceState(null, "", "#d=" + encodeURIComponent(JSON.stringify(p)));
  }, [p, hashReady]);
  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); } catch { /* yoksay */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const set = <K extends keyof EnclosureParams>(k: K, v: EnclosureParams[K]) => setP((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    const saved = localStorage.getItem("enclocad-lang");
    if (saved === "tr" || saved === "en") setLang(saved);
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const dp = useDeferredValue(p);
  type Geo = { base: THREE.BufferGeometry; lid: THREE.BufferGeometry; clip: THREE.BufferGeometry | null };
  const [geo, setGeo] = useState<Geo | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    try {
      setGeo({ base: buildBase(dp), lid: buildLid(dp), clip: dp.din === "clip" ? buildClip(dp) : null });
      setFailed(false);
    } catch (e) {
      console.error(e);
      setFailed(true);
    }
  }, [dp]);

  const updateCut = (id: string, patch: Partial<Cutout>) =>
    set("cutouts", p.cutouts.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  type Part = "base" | "lid" | "clip";
  const names = lang === "tr" ? { base: "Govde", lid: "Kapak", clip: "DIN_Klipsi" } : { base: "Base", lid: "Lid", clip: "DIN_Clip" };
  /** Baskıya hazır: Z yukarı, en geniş düz yüz tablada, tabla merkezinde */
  const printReady = (part: Part, g: THREE.BufferGeometry) => {
    const c = g.clone();
    c.rotateX(part === "base" ? Math.PI / 2 : -Math.PI / 2);
    c.computeBoundingBox();
    const bb = c.boundingBox!;
    c.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -bb.min.z);
    return c;
  };
  const stlOf = (part: Part) => {
    const g = geo?.[part];
    if (!g) return null;
    return (new STLExporter().parse(new THREE.Mesh(repairMesh(printReady(part, g))), { binary: true }) as DataView).buffer as ArrayBuffer;
  };
  const save = (blob: Blob, name: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const tag = `${p.width}x${p.depth}x${p.height}`;
  const downloadPart = (part: Part) => {
    const buf = stlOf(part);
    if (buf) save(new Blob([buf], { type: "model/stl" }), `EncloCAD_${names[part]}_${tag}.stl`);
  };
  const download = async () => {
    if (!geo) return;
    const zip = new JSZip();
    for (const part of ["base", "lid", "clip"] as Part[]) {
      const buf = stlOf(part);
      if (buf) zip.file(`${names[part]}.stl`, buf);
    }
    save(await zip.generateAsync({ type: "blob" }), `EncloCAD_${tag}.zip`);
  };

  const size = Math.max(p.width, p.depth, p.height);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-baseline gap-3">
          <h1 className="font-mono text-xl font-bold tracking-tight">
            Enclo<span className="text-primary">CAD</span>
          </h1>
          <p className="hidden text-sm text-muted-foreground md:block">{L("tagline")}</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setSearchOpen(true)}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary hover:text-primary">
            🔍 {L("psOpen")}
          </button>
          <button type="button" onClick={share}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary hover:text-primary">
            🔗 {copied ? L("copied") : L("share")}
          </button>
          <Seg value={lang} onChange={(v) => { setLang(v); localStorage.setItem("enclocad-lang", v); }}
            options={[{ v: "tr", label: "TR" }, { v: "en", label: "EN" }]} />
          <span className="hidden text-xs text-muted-foreground lg:inline">{L("stl")}:</span>
          {(["base", "lid", ...(geo?.clip ? ["clip"] : [])] as Part[]).map((part) => (
            <button key={part} type="button" onClick={() => downloadPart(part)} disabled={!geo}
              className="rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50">
              {L(part === "base" ? "dlBase" : part === "lid" ? "dlLid" : "dlClip")}
            </button>
          ))}
          <button type="button" onClick={download} disabled={!geo}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
            {L("download")}
          </button>
        </div>
      </header>
      {searchOpen && <PartSearch lang={lang} onClose={() => setSearchOpen(false)} />}

      <div className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
        <aside className="w-full overflow-y-auto border-r border-border bg-card md:w-80">
          <Section title={L("dims")}>
            <NumField label={L("width")} value={p.width} min={30} max={300} step={1} onChange={(v) => set("width", v)} />
            <NumField label={L("depth")} value={p.depth} min={30} max={300} step={1} onChange={(v) => set("depth", v)} />
            <NumField label={L("height")} value={p.height} min={15} max={200} step={1} onChange={(v) => set("height", v)} />
            <NumField label={L("wall")} value={p.wall} min={1.6} max={4} step={0.2} onChange={(v) => set("wall", v)} />
          </Section>

          <Section title={L("lidMode")}>
            <Seg value={p.lidMode} onChange={(v) => set("lidMode", v)}
              options={[{ v: "screw", label: L("lidScrew") }, { v: "hinge", label: L("lidHinge") }]} />
            {p.lidMode === "hinge" && <p className="text-xs text-muted-foreground">{L("hingeHint")}</p>}
          </Section>

          <Section title={L("lidDeco")}>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{L("lidText")}</span>
              <input type="text" value={p.lidText} maxLength={24} onChange={(e) => set("lidText", e.target.value)}
                placeholder="ESP32 NODE"
                className="w-full rounded-md border border-input bg-background px-2 py-1 font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </label>
            {p.lidText.trim() && <NumField label={L("lidTextSize")} value={p.lidTextSize} min={4} max={30} step={1} onChange={(v) => set("lidTextSize", v)} />}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={p.honeycomb} onChange={(e) => set("honeycomb", e.target.checked)} className="accent-primary" />
              {L("honeycomb")}
            </label>
            {p.honeycomb && <NumField label={L("hexSize")} value={p.hexSize} min={3} max={12} step={0.5} onChange={(v) => set("hexSize", v)} />}
            <p className="text-xs text-muted-foreground">{L("lidTextHint")}</p>
          </Section>

          <Section title={L("screws")}>
            <Seg value={p.screwMode} onChange={(v) => set("screwMode", v)}
              options={[{ v: "insert", label: L("insert") }, { v: "tap", label: L("tap") }]} />
            <Seg value={p.screwSize} onChange={(v) => set("screwSize", v)}
              options={[{ v: "M2.5", label: "M2.5" }, { v: "M3", label: "M3" }]} />
          </Section>

          <Section title={L("pcb")}>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={p.pcbEnabled} onChange={(e) => set("pcbEnabled", e.target.checked)} className="accent-primary" />
              {L("pcb")}
            </label>
            {p.pcbEnabled && (
              <>
                <select value={preset} onChange={(e) => {
                  setPreset(e.target.value);
                  const pr = PCB_PRESETS.find((x) => x.id === e.target.value);
                  if (pr) setP((s) => ({ ...s, pcbWidth: pr.w, pcbDepth: pr.d, pcbInset: pr.inset }));
                }} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                  <option value="custom">{L("preset")}: {L("custom")}</option>
                  {PCB_PRESETS.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.w}×{x.d})</option>)}
                </select>
                <NumField label={L("pcbW")} value={p.pcbWidth} min={15} max={p.width - 10} onChange={(v) => { setPreset("custom"); set("pcbWidth", v); }} />
                <NumField label={L("pcbD")} value={p.pcbDepth} min={15} max={p.depth - 10} onChange={(v) => { setPreset("custom"); set("pcbDepth", v); }} />
                <NumField label={L("inset")} value={p.pcbInset} min={2} max={8} onChange={(v) => set("pcbInset", v)} />
                <NumField label={L("sh")} value={p.standoffHeight} min={2} max={20} onChange={(v) => set("standoffHeight", v)} />
              </>
            )}
          </Section>

          <Section title={L("din")}>
            <Seg value={p.din} onChange={(v) => set("din", v)}
              options={[{ v: "none", label: L("none") }, { v: "integrated", label: L("integrated") }, { v: "clip", label: L("clip") }]} />
          </Section>

          <Section title={L("cutouts")}>
            {p.cutouts.map((c) => (
              <div key={c.id} className="space-y-2 rounded-md border border-border p-2">
                <div className="flex gap-2">
                  <select value={c.type} onChange={(e) => updateCut(c.id, { type: e.target.value as CutoutType })}
                    className="flex-1 rounded border border-input bg-background px-1 py-1 text-xs">
                    {CUT_TYPES.map((x) => <option key={x} value={x}>{x === "USBC" ? "USB-C" : x === "DC" ? "DC Jack" : x === "VENT" ? (lang === "tr" ? "Havalandırma" : "Vent") : x === "NONE" ? L("none") : x}</option>)}
                  </select>
                  <select value={c.face} onChange={(e) => updateCut(c.id, { face: e.target.value as Face })}
                    className="flex-1 rounded border border-input bg-background px-1 py-1 text-xs">
                    {FACES.map((f) => <option key={f} value={f}>{L(f)}</option>)}
                  </select>
                  <button type="button" aria-label="Sil" onClick={() => set("cutouts", p.cutouts.filter((x) => x.id !== c.id))}
                    className="px-2 text-destructive">×</button>
                </div>
                <NumField label="X ofset" value={c.u} min={-150} max={150} step={1} onChange={(v) => updateCut(c.id, { u: v })} />
                <NumField label="Y ofset" value={c.v} min={-100} max={100} step={1} onChange={(v) => updateCut(c.id, { v: v })} />
              </div>
            ))}
            <button type="button"
              onClick={() => set("cutouts", [...p.cutouts, { id: String(Date.now()), face: "back", type: "USBC", u: 0, v: 0 }])}
              className="w-full rounded-md border border-dashed border-primary py-1.5 text-sm text-primary hover:bg-primary/10">
              + {L("add")}
            </button>
          </Section>
        </aside>

        <main className="relative min-h-[50vh] flex-1 bg-viewport">
          <ClientOnly fallback={<div className="p-6 text-muted-foreground">{L("computing")}</div>}>
            <Suspense fallback={<div className="p-6 text-muted-foreground">{L("computing")}</div>}>
              <Viewer base={geo?.base ?? null} lid={geo?.lid ?? null} clip={geo?.clip ?? null}
                baseHeight={p.height - LID_THICKNESS(p)} size={size} explode={explode} mode={mode} ghost={ghost} />
            </Suspense>
          </ClientOnly>
          {failed && <p className="absolute left-4 top-4 text-sm text-destructive">{L("error")}</p>}
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card/90 px-4 py-3 backdrop-blur">
            <span className="font-mono text-xs uppercase text-primary">{L("view")}</span>
            <Seg value={mode} onChange={setMode}
              options={[{ v: "all", label: L("all") }, { v: "base", label: L("baseOnly") }, { v: "lid", label: L("lidOnly") }]} />
            <label className="flex items-center gap-2 text-sm">
              {L("explode")}
              <input type="range" min={0} max={50} value={explode} onChange={(e) => setExplode(Number(e.target.value))} className="accent-primary" />
              <span className="w-10 font-mono text-xs">{explode}mm</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ghost} onChange={(e) => setGhost(e.target.checked)} className="accent-primary" />
              {L("ghost")}
            </label>
          </div>
        </main>
      </div>
    </div>
  );
}

import { repairMesh } from "@/lib/meshRepair";
import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { TEMPLATES } from "@/lib/templates";
import { GALLERY_MODELS } from "@/lib/gallery";
import { KITS, kitParams } from "@/lib/kits";
import { lazy, Suspense, useDeferredValue, useEffect, useState, type ReactNode } from "react";
import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import JSZip from "jszip";
import {
  DEFAULT_PARAMS, PCB_PRESETS, LID_THICKNESS, buildBase, buildLid, buildClip,
  type EnclosureParams, type Cutout, type CutoutType, type Face,
  gasketEnabled, gasketRim, gasketAllowed, hasOpenCutouts, normalizeGasket,
} from "@/lib/enclosure";
import { t as tr, type Lang, type Key } from "@/lib/i18n";
import type { ViewMode } from "@/components/Viewer";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Download, ChevronDown, FileBox, Archive, LayoutGrid, Info } from "lucide-react";

const Viewer = lazy(() => import("@/components/Viewer"));
import PartSearch from "@/components/PartSearch";

export const Route = createFileRoute("/editor")({
  validateSearch: (search: Record<string, unknown>): { template?: string } =>
    typeof search["template"] === "string" ? { template: search["template"] } : {},
  head: () => ({
    meta: [
      { title: "EncloCAD Editor — Design Your Enclosure" },
      { name: "description", content: "Enter dimensions, add cutouts and DIN rail mounting, then download print-ready STL files." },
      { property: "og:title", content: "EncloCAD Editor — Design Your Enclosure" },
      { property: "og:description", content: "Enter dimensions, add cutouts and DIN rail mounting, then download print-ready STL files." },
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
        <Button variant="ghost"
          key={o.v} type="button" onClick={() => onChange(o.v)}
          className={`h-auto min-h-8 flex-1 whitespace-normal rounded px-2 py-1 text-xs font-medium transition-colors ${value === o.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}

function Section({ value, title, children }: { value: string; title: string; children: ReactNode }) {
  return (
    <AccordionItem value={value} className="border-border max-md:data-[state=closed]:hidden">
      <AccordionTrigger className="px-4 py-2.5 text-xs font-semibold text-primary hover:no-underline">{title}</AccordionTrigger>
      <AccordionContent className="max-h-[calc(100dvh-28rem)] space-y-2 overflow-y-auto px-4 pb-3 max-md:max-h-[28dvh]">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}
const OPTION_SECTIONS: Key[] = ["kits", "dims", "lidMode", "gasket", "lidDeco", "screws", "pcb", "din", "cutouts"];

const CUT_TYPES: CutoutType[] = ["NONE", "PG7", "PG9", "PG11", "USBC", "DC", "RJ45", "VENT", "USBB", "BARREL", "MICROUSB", "MICROHDMI", "AUDIO", "USBA2"];
const FACES: Face[] = ["front", "back", "left", "right"];

function Index() {
  const [lang, setLang] = useState<Lang>("en");
  const [activeSection, setActiveSection] = useState("dims");
  const [gasketNotice, setGasketNotice] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const L = (k: Key) => tr(lang, k);
  const [p, setP] = useState<EnclosureParams>(DEFAULT_PARAMS);
  const [explode, setExplode] = useState(25);
  const [mode, setMode] = useState<ViewMode>("all");
  const [ghost, setGhost] = useState(false);
  const [preset, setPreset] = useState("custom");
  const [kitId, setKitId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hashReady, setHashReady] = useState(false);
  useEffect(() => {
    try {
      const h = window.location.hash.slice(1);
      const tpl = new URLSearchParams(window.location.search).get("template");
      if (tpl && TEMPLATES[tpl]) {
        setP(normalizeGasket({ ...DEFAULT_PARAMS, ...TEMPLATES[tpl] } as EnclosureParams));
        setKitId(GALLERY_MODELS.find((model) => model.id === tpl)?.boardId ?? null);
      }
      else if (h.startsWith("d=")) setP(normalizeGasket({ ...DEFAULT_PARAMS, ...JSON.parse(decodeURIComponent(h.slice(2))) }));
    } catch { /* geçersiz link */ }
    setHashReady(true);
  }, []);
  useEffect(() => {
    if (hashReady) history.replaceState(null, "", window.location.pathname + "#d=" + encodeURIComponent(JSON.stringify(p)));
  }, [p, hashReady]);
  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); } catch { /* yoksay */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const set = <K extends keyof EnclosureParams>(k: K, v: EnclosureParams[K]) => setP((s) => normalizeGasket({ ...s, [k]: v }));

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
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex items-baseline gap-3">
          <Link to="/" className="font-mono text-xl font-bold tracking-tight hover:opacity-80">
            Enclo<span className="text-primary">CAD</span>
          </Link>
          <p className="hidden text-sm text-muted-foreground xl:block">{L("tagline")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost"><Link to="/gallery"><LayoutGrid />{L("gallery")}</Link></Button>
          <button type="button" onClick={() => setSearchOpen(true)}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary hover:text-primary">
            🔍 {L("psOpen")}
          </button>
          <Seg value={lang} onChange={(v) => { setLang(v); localStorage.setItem("enclocad-lang", v); }}
            options={[{ v: "tr", label: "TR" }, { v: "en", label: "EN" }]} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={!geo} className="h-10 px-4 text-base font-semibold">
                <Download aria-hidden="true" />
                {L("stl")}
                <ChevronDown aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {(["base", "lid", ...(geo?.clip ? ["clip"] : [])] as Part[]).map((part) => (
                <DropdownMenuItem key={part} onSelect={() => downloadPart(part)} className="cursor-pointer py-3">
                  <FileBox aria-hidden="true" />
                  {L(part === "base" ? "dlBase" : part === "lid" ? "dlLid" : "dlClip")}
                  <span className="ml-auto font-mono text-xs text-muted-foreground">.stl</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { void download(); }} className="cursor-pointer py-3 font-semibold">
                <Archive aria-hidden="true" />
                {L("download")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button type="button" onClick={share}
            className={copied
              ? "rounded-md border border-emerald-500 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-400"
              : "rounded-md border border-primary bg-primary/20 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"}>
            {copied ? `✓ ${L("copied")}` : `🔗 ${L("share")}`}
          </button>
        </div>
      </header>
      {searchOpen && <PartSearch lang={lang} onClose={() => setSearchOpen(false)} />}

      <div className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
        <aside className="w-full shrink-0 overflow-hidden border-r border-border bg-card md:w-80">
          <label className="block px-4 pt-2 md:hidden">
            <span className="sr-only">{L("options")}</span>
            <select aria-label={L("options")} value={activeSection} onChange={(e) => setActiveSection(e.target.value)} className="w-full rounded-md border border-input bg-background p-2 text-sm">
              {OPTION_SECTIONS.map((key) => <option key={key} value={key}>{L(key)}</option>)}
            </select>
          </label>
          <Accordion type="single" collapsible value={activeSection} onValueChange={setActiveSection}>
          <Section value="kits" title={L("kits")}>
            <p className="text-xs text-muted-foreground">{L("kitHint")}</p>
            <div className="grid grid-cols-1 gap-2">
              {KITS.map((k) => (
                <Button variant="outline" key={k.id} type="button" onClick={() => { setPreset("custom"); setKitId(k.id); setP(kitParams(k)); }}
                  className="h-auto justify-start whitespace-normal rounded-md border border-primary/60 bg-primary/10 px-3 py-2 text-left text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
                  ▣ {k.name}
                </Button>
              ))}
            </div>
          </Section>
          <Section value="dims" title={L("dims")}>
            <NumField label={L("width")} value={p.width} min={30} max={300} step={1} onChange={(v) => set("width", v)} />
            <NumField label={L("depth")} value={p.depth} min={30} max={300} step={1} onChange={(v) => set("depth", v)} />
            <NumField label={L("height")} value={p.height} min={15} max={200} step={1} onChange={(v) => set("height", v)} />
            <NumField label={L("wall")} value={p.wall} min={1.6} max={4} step={0.2} onChange={(v) => set("wall", v)} />
          </Section>

          <Section value="lidMode" title={L("lidMode")}>
            <Seg value={p.lidMode} onChange={(v) => {
              setGasketNotice(v === "hinge" && gasketEnabled(p));
              const k = KITS.find((x) => x.id === kitId);
              if (k) setP(normalizeGasket({ ...kitParams(k, v), gasket: p.gasket ?? "none" }));
              else set("lidMode", v);
            }}
              options={[{ v: "screw", label: L("lidScrew") }, { v: "hinge", label: L("lidHinge") }]} />
            {p.lidMode === "hinge" && <p className="text-xs text-muted-foreground">{L("hingeHint")}</p>}
            {gasketNotice && <p role="status" className="flex items-start gap-2 text-xs text-primary"><Info className="size-4 shrink-0" />{L("gasketDisabled")}</p>}
          </Section>

          <Section value="gasket" title={L("gasket")}>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={gasketEnabled(p)} disabled={!gasketAllowed(p)} onChange={(e) => { set("gasket", e.target.checked ? "tpu175" : "none"); setGasketNotice(false); }} className="accent-primary disabled:opacity-40" aria-describedby="gasket-hint" />
              <span className={!gasketAllowed(p) ? "text-muted-foreground" : "text-foreground"}>{L("gasketTpu")}</span>
            </label>
            <p id="gasket-hint" className="flex items-start gap-2 text-xs text-primary"><Info className="size-4 shrink-0" />{L(p.lidMode === "hinge" ? "gasketRequiresScrew" : hasOpenCutouts(p) ? "gasketOpenBlocked" : "gasketHint")}</p>
            {gasketEnabled(p) && <>
              <p className="text-xs text-muted-foreground">{L("gasketRimHint")} {gasketRim(p).toFixed(1)} mm.</p>
              <p role="status" className="text-xs text-primary">{L(p.cutouts.some((c) => c.type !== "NONE") ? "gasketOpenings" : "gasketTest")}</p>
            </>}
          </Section>

          <Section value="lidDeco" title={L("lidDeco")}>
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

          <Section value="screws" title={L("screws")}>
            <Seg value={p.screwMode} onChange={(v) => set("screwMode", v)}
              options={[{ v: "insert", label: L("insert") }, { v: "tap", label: L("tap") }]} />
            <Seg value={p.screwSize} onChange={(v) => set("screwSize", v)}
              options={[{ v: "M2.5", label: "M2.5" }, { v: "M3", label: "M3" }]} />
          </Section>

          <Section value="pcb" title={L("pcb")}>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={p.pcbEnabled} onChange={(e) => set("pcbEnabled", e.target.checked)} className="accent-primary" />
              {L("pcb")}
            </label>
            {p.pcbEnabled && (
              <>
                <select value={preset} onChange={(e) => {
                  setPreset(e.target.value);
                  const pr = PCB_PRESETS.find((x) => x.id === e.target.value);
                  if (pr) setP((s) => { const { pcbHoles: _h, ...r } = s; return { ...r, pcbWidth: pr.w, pcbDepth: pr.d, pcbInset: pr.inset }; });
                }} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                  <option value="custom">{L("preset")}: {L("custom")}</option>
                  {PCB_PRESETS.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.w}×{x.d})</option>)}
                </select>
                <NumField label={L("pcbW")} value={p.pcbWidth} min={15} max={p.width - 10} onChange={(v) => { setPreset("custom"); setP((s) => { const { pcbHoles: _h, ...r } = s; return { ...r, pcbWidth: v }; }); }} />
                <NumField label={L("pcbD")} value={p.pcbDepth} min={15} max={p.depth - 10} onChange={(v) => { setPreset("custom"); setP((s) => { const { pcbHoles: _h, ...r } = s; return { ...r, pcbDepth: v }; }); }} />
                <NumField label={L("inset")} value={p.pcbInset} min={2} max={8} onChange={(v) => set("pcbInset", v)} />
                <NumField label={L("sh")} value={p.standoffHeight} min={2} max={20} onChange={(v) => set("standoffHeight", v)} />
              </>
            )}
          </Section>

          <Section value="din" title={L("din")}>
            <Seg value={p.din} onChange={(v) => set("din", v)}
              options={[{ v: "none", label: L("none") }, { v: "integrated", label: L("integrated") }, { v: "clip", label: L("clip") }]} />
          </Section>

          <Section value="cutouts" title={L("cutouts")}>
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
          </Accordion>
        </aside>

        <main className="relative min-h-0 flex-1 bg-viewport">
          <ClientOnly fallback={<div className="p-6 text-muted-foreground">{L("computing")}</div>}>
            <Suspense fallback={<div className="p-6 text-muted-foreground">{L("computing")}</div>}>
              <Viewer base={geo?.base ?? null} lid={geo?.lid ?? null} clip={geo?.clip ?? null}
                baseHeight={p.height - LID_THICKNESS(p)} size={size} explode={explode} mode={mode} ghost={ghost} />
            </Suspense>
          </ClientOnly>
          {failed && <p className="absolute left-4 top-4 text-sm text-destructive">{L("error")}</p>}
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/90 px-3 py-2 backdrop-blur">
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

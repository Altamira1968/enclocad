import { createFileRoute, ClientOnly, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { DEFAULT_PARAMS, LID_THICKNESS, buildBase, buildLid, buildClip, type EnclosureParams } from "@/lib/enclosure";
import type { Marker } from "@/components/Viewer";

const DEMO: EnclosureParams = {
  ...DEFAULT_PARAMS,
  lidMode: "hinge",
  din: "clip",
  lidText: "ENCLOCAD",
  honeycomb: true,
  cutouts: [
    { id: "c1", face: "front", type: "USBC", u: -25, v: 0 },
    { id: "c2", face: "front", type: "PG9", u: 22, v: 0 },
    { id: "c3", face: "right", type: "VENT", u: 0, v: 0 },
  ],
};
import { t as tr, type Lang, type Key } from "@/lib/i18n";

const Viewer = lazy(() => import("@/components/Viewer"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EncloCAD — Parametric Electronics Enclosure Designer" },
      { name: "description", content: "Design screw-lid or hinged enclosures with DIN rail mounting right in your browser, then download print-ready STL files." },
      { property: "og:title", content: "EncloCAD — Parametric Electronics Enclosure Designer" },
      { property: "og:description", content: "Enter your dimensions, add PG gland and connector cutouts, and download STL files ready for your 3D printer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>("en");
  const L = (k: Key) => tr(lang, k);

  useEffect(() => {
    const saved = localStorage.getItem("enclocad-lang");
    if (saved === "tr" || saved === "en") setLang(saved);
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // Eski paylaşım linkleri (/#d=...) editöre yönlensin
  useEffect(() => {
    if (window.location.hash.startsWith("#d=")) {
      navigate({ to: "/editor", hash: window.location.hash.slice(1), replace: true });
    }
  }, [navigate]);

  const [geo, setGeo] = useState<{ base: THREE.BufferGeometry; lid: THREE.BufferGeometry; clip: THREE.BufferGeometry } | null>(null);
  useEffect(() => {
    try {
      setGeo({ base: buildBase(DEMO), lid: buildLid(DEMO), clip: buildClip(DEMO) });
    } catch { /* önizleme olmadan da sayfa çalışır */ }
  }, []);

  const size = Math.max(DEMO.width, DEMO.depth, DEMO.height);
  const H = DEMO.height - LID_THICKNESS(DEMO);
  const lt = LID_THICKNESS(DEMO);
  const mk = (n: number, part: Marker["part"], pos: Marker["pos"]): Marker => ({
    id: `h${n}`, part, pos, title: L(`hot${n}T` as Key), body: L(`hot${n}B` as Key),
  });
  const markers: Marker[] = [
    mk(1, "lid", [-25, lt, 0]),
    mk(2, "lid", [25, lt, 0]),
    mk(3, "lid", [-30, 0, -DEMO.depth / 2 - 3]),
    mk(4, "lid", [0, -2, DEMO.depth / 2 + 2]),
    mk(5, "base", [-25, H / 2, DEMO.depth / 2]),
    mk(6, "base", [22, H / 2, DEMO.depth / 2]),
    mk(7, "base", [DEMO.width / 2, H / 2, 0]),
    mk(8, "base", [20, DEMO.wall + DEMO.standoffHeight, 15]),
    mk(9, "clip", [0, 0, DEMO.depth / 2 - 10]),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <span className="font-mono text-xl font-bold tracking-tight">
          Enclo<span className="text-primary">CAD</span>
        </span>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md border border-border p-0.5">
            {(["tr", "en"] as Lang[]).map((v) => (
              <button key={v} type="button"
                onClick={() => { setLang(v); localStorage.setItem("enclocad-lang", v); }}
                className={`rounded px-2 py-1 text-xs font-medium uppercase transition-colors ${lang === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {v}
              </button>
            ))}
          </div>
          <Link to="/editor"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            {L("openEditor")}
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              {L("heroTitle")}
            </h1>
            <p className="text-lg text-muted-foreground">{L("heroSub")}</p>
            <Link to="/editor"
              className="inline-block rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground transition-opacity hover:opacity-90">
              {L("openEditor")} →
            </Link>
          </div>
          <div>
          <div className="relative h-96 overflow-hidden rounded-xl border border-border bg-viewport md:h-[30rem]">
            <ClientOnly fallback={<div className="p-6 text-muted-foreground">{L("computing")}</div>}>
              <Suspense fallback={<div className="p-6 text-muted-foreground">{L("computing")}</div>}>
                <Viewer base={geo?.base ?? null} lid={geo?.lid ?? null} clip={geo?.clip ?? null}
                  baseHeight={H} size={size} explode={22} mode="all" ghost={false}
                  markers={geo ? markers : []} />
              </Suspense>
            </ClientOnly>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">{L("hotHint")}</p>
          </div>
        </section>

        <section className="border-t border-border bg-card">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3">
            {([1, 2, 3] as const).map((n) => (
              <div key={n} className="space-y-2">
                <h2 className="font-mono text-sm uppercase tracking-widest text-primary">
                  {L(n === 1 ? "feat1Title" : n === 2 ? "feat2Title" : "feat3Title")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {L(n === 1 ? "feat1Body" : n === 2 ? "feat2Body" : "feat3Body")}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="mb-8 text-center font-mono text-sm uppercase tracking-widest text-primary">{L("howTitle")}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {([1, 2, 3] as const).map((n) => (
              <div key={n} className="flex items-center gap-4 rounded-lg border border-border bg-card p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 font-mono text-lg font-bold text-primary">
                  {n}
                </span>
                <p className="font-medium">{L(n === 1 ? "how1" : n === 2 ? "how2" : "how3")}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/editor"
              className="inline-block rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground transition-opacity hover:opacity-90">
              {L("openEditor")} →
            </Link>
          </div>
        </section>
        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-3xl px-5 py-14">
            <h2 className="mb-8 text-center font-mono text-sm uppercase tracking-widest text-primary">{L("faqTitle")}</h2>
            <div className="space-y-4">
              {([1, 2, 3, 4] as const).map((n) => (
                <details key={n} className="rounded-lg border border-border bg-background p-4">
                  <summary className="cursor-pointer font-medium">
                    {L(n === 1 ? "faq1Q" : n === 2 ? "faq2Q" : n === 3 ? "faq3Q" : "faq4Q")}
                  </summary>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {L(n === 1 ? "faq1A" : n === 2 ? "faq2A" : n === 3 ? "faq3A" : "faq4A")}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-4 text-center text-xs text-muted-foreground">
        EncloCAD © 2026 · {L("contact")}: <a href="mailto:info@enclocad.com" className="text-primary hover:underline">info@enclocad.com</a>
      </footer>
    </div>
  );
}

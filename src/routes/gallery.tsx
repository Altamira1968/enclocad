import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, Box, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { filterGallery, GALLERY_IMAGES, type GalleryFilter } from "@/lib/gallery";
import { t, type Lang, type Key } from "@/lib/i18n";
import { caseSlugFor } from "@/lib/cases";

const FILTERS: { value: GalleryFilter; label: Key }[] = [
  { value: "all", label: "all" }, { value: "hinge", label: "hinged" },
  { value: "screw", label: "screwed" }, { value: "din", label: "galleryDin" },
];

export const Route = createFileRoute("/gallery")({
  head: () => ({ meta: [
    { title: "3D Printable Enclosure Gallery — Raspberry Pi, Arduino, ESP32 STL | EncloCAD" },
    { name: "description", content: "Free customizable 3D printable enclosures: Raspberry Pi DIN rail case, ESP32 hinged box, Arduino Uno case, sensor boxes and more. Edit and download STL." },
    { property: "og:title", content: "3D Printable Enclosure Gallery — Raspberry Pi, Arduino, ESP32 STL | EncloCAD" },
    { property: "og:description", content: "Explore enclosure examples in 3D and open any design in the EncloCAD editor." },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://enclocad.com/gallery" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
  links: [{ rel: "canonical", href: "https://enclocad.com/gallery" }],
  scripts: [{ type: "application/ld+json", children: JSON.stringify({"@context":"https://schema.org","@type":"CollectionPage","name":"EncloCAD Gallery","url":"https://enclocad.com/gallery"}) }],
  }),
  component: Gallery,
});

function Gallery() {
  const [lang, setLang] = useState<Lang>("en");
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const L = (key: Key) => t(lang, key);
  useEffect(() => {
    const saved = localStorage.getItem("enclocad-lang");
    if (saved === "tr" || saved === "en") setLang(saved);
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const models = filterGallery(filter);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <Link to="/" className="font-mono text-xl font-bold">Enclo<span className="text-primary">CAD</span></Link>
        <nav className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost"><Link to="/gallery"><LayoutGrid />{L("gallery")}</Link></Button>
          <div className="flex gap-0.5 rounded-md border border-border p-0.5">
            {(["tr", "en"] as Lang[]).map((v) => <Button key={v} size="sm" variant={lang === v ? "default" : "ghost"}
              onClick={() => { setLang(v); localStorage.setItem("enclocad-lang", v); }}>{v.toUpperCase()}</Button>)}
          </div>
          <Button asChild><Link to="/editor">{L("openEditor")}<ArrowUpRight /></Link></Button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="mb-8 space-y-3">
          <p className="font-mono text-xs uppercase text-primary">EncloCAD / {L("gallery")}</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">{L("galleryTitle")}</h1>
          <p className="text-muted-foreground">{L("gallerySub")}</p>
        </div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
          <div className="flex flex-wrap gap-1" role="group" aria-label={L("gallery")}>
            {FILTERS.map(({ value, label }) => <Button key={value} variant={filter === value ? "default" : "ghost"}
              aria-pressed={filter === value} onClick={() => setFilter(value)}>{L(label)}</Button>)}
          </div>
          <span className="font-mono text-xs text-muted-foreground">{models.length} {L("galleryModels")}</span>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => <article key={model.id} className="flex min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card">
            <img src={GALLERY_IMAGES[model.id]} alt={L(model.title)} width={480} height={360}
              loading="lazy" className="aspect-[4/3] w-full bg-viewport object-cover" />
            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex flex-wrap gap-2 text-xs text-primary">
                <span>{L(model.params.lidMode === "hinge" ? "hinged" : "screwed")}</span>
                {model.params.din !== "none" && <span className="border-l border-border pl-2">35 mm DIN</span>}
              </div>
              <h2 className="text-lg font-semibold leading-snug">{(() => { const slug = caseSlugFor(model.id);
                return slug ? <Link to="/cases/$slug" params={{ slug }} className="hover:text-primary">{L(model.title)}</Link> : L(model.title); })()}</h2>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{L(model.description)}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 font-mono text-xs text-muted-foreground">
                <span>{model.params.width} × {model.params.depth} × {model.params.height} mm</span>
                <span className="flex items-center gap-1"><Box className="size-3" />{model.params.din === "clip" ? 3 : 2} {L("galleryParts")}</span>
              </div>
              <Button asChild className="mt-1 w-full"><Link to="/editor" search={{ template: model.id }}>
                {L("galleryOpen")}<ArrowUpRight />
              </Link></Button>
            </div>
          </article>)}
        </div>
        <p className="mt-8 max-w-3xl text-xs leading-relaxed text-muted-foreground">{L("galleryCheck")}</p>
        <div className="mt-10 border-t border-border py-6 font-mono text-sm text-muted-foreground">{L("gallerySoon")}</div>
      </main>
      <footer className="border-t border-border px-5 py-4 text-center text-xs text-muted-foreground">
        EncloCAD © 2026 · {L("contact")}: <a className="text-primary hover:underline" href="mailto:info@enclocad.com">info@enclocad.com</a>
      </footer>
    </div>
  );
}
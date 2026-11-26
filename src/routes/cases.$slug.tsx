import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findCase } from "@/lib/cases";
import { t, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/cases/$slug")({
  loader: ({ params }) => {
    const c = findCase(params.slug);
    if (!c) throw notFound();
    return { slug: params.slug };
  },
  head: ({ params }) => {
    const c = findCase(params.slug);
    if (!c) return { meta: [{ title: "Not found | EncloCAD" }, { name: "robots", content: "noindex" }] };
    const url = `https://enclocad.com/cases/${c.page.slug}`;
    const p = c.model.params;
    return {
      meta: [
        { title: c.page.title },
        { name: "description", content: c.page.description },
        { name: "keywords", content: c.page.keywords.join(", ") },
        { property: "og:title", content: c.page.title },
        { property: "og:description", content: c.page.description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        { property: "og:image", content: c.image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: c.image },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify([
        { "@context": "https://schema.org", "@type": "3DModel", name: c.page.h1.en, description: c.page.description,
          url, image: c.image, encodingFormat: "model/stl", isAccessibleForFree: true, keywords: c.page.keywords.join(", "),
          width: `${p.width} mm`, depth: `${p.depth} mm`, height: `${p.height} mm`,
          creator: { "@type": "Organization", name: "EncloCAD", url: "https://enclocad.com" } },
        { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
          { "@type": "ListItem", position: 1, name: "EncloCAD", item: "https://enclocad.com/" },
          { "@type": "ListItem", position: 2, name: "Gallery", item: "https://enclocad.com/gallery" },
          { "@type": "ListItem", position: 3, name: c.page.h1.en, item: url },
        ] },
      ]) }],
    };
  },
  component: CasePageView,
});

function CasePageView() {
  const { slug } = Route.useLoaderData();
  const c = findCase(slug)!;
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const saved = localStorage.getItem("enclocad-lang");
    if (saved === "tr" || saved === "en") setLang(saved);
  }, []);
  const p = c.model.params;
  const rows: [string, string][] = [
    [t(lang, "caseSize"), `${p.width} × ${p.depth} × ${p.height} mm`],
    [t(lang, "caseWall"), `${p.wall} mm`],
    [t(lang, "caseLid"), t(lang, p.lidMode === "hinge" ? "hinged" : "screwed")],
    [t(lang, "caseOpenings"), String(p.cutouts.filter((x) => x.type !== "NONE").length)],
    [t(lang, "casePrint"), t(lang, "casePrintVal")],
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <Link to="/" className="font-mono text-xl font-bold">Enclo<span className="text-primary">CAD</span></Link>
        <nav className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost"><Link to="/gallery">{t(lang, "gallery")}</Link></Button>
          <div className="flex gap-0.5 rounded-md border border-border p-0.5">
            {(["tr", "en"] as Lang[]).map((v) => <Button key={v} size="sm" variant={lang === v ? "default" : "ghost"}
              onClick={() => { setLang(v); localStorage.setItem("enclocad-lang", v); }}>{v.toUpperCase()}</Button>)}
          </div>
        </nav>
      </header>
      <main className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-2">
        <img src={c.image} alt={c.page.h1[lang]} width={640} height={480} className="aspect-[4/3] w-full rounded-md border border-border bg-viewport object-cover" />
        <div className="space-y-6">
          <nav aria-label="breadcrumb" className="font-mono text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">EncloCAD</Link> / <Link to="/gallery" className="hover:text-primary">{t(lang, "gallery")}</Link>
          </nav>
          <h1 className="text-3xl font-semibold sm:text-4xl">{c.page.h1[lang]}</h1>
          <p className="leading-relaxed text-muted-foreground">{c.page.intro[lang]}</p>
          <ul className="space-y-2">
            {c.page.features.map((f) => <li key={f.en} className="flex gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{f[lang]}</li>)}
          </ul>
          <Button asChild size="lg" className="w-full sm:w-auto"><Link to="/editor" search={{ template: c.model.id }}>
            {t(lang, "caseCta")}<ArrowUpRight />
          </Link></Button>
          <table className="w-full border-collapse text-sm">
            <caption className="mb-2 text-left font-mono text-xs uppercase text-primary">{t(lang, "caseSpecs")}</caption>
            <tbody>{rows.map(([k, v]) => <tr key={k} className="border-b border-border">
              <th className="py-2 pr-4 text-left font-normal text-muted-foreground">{k}</th><td className="py-2 font-mono">{v}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </main>
      <footer className="border-t border-border px-5 py-4 text-center text-xs text-muted-foreground">
        EncloCAD © 2026 · <a className="text-primary hover:underline" href="mailto:info@enclocad.com">info@enclocad.com</a>
      </footer>
    </div>
  );
}

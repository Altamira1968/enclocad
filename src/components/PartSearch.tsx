import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { searchParts, type PartHit } from "@/lib/partSearch.functions";
import { t as tr, type Lang, type Key } from "@/lib/i18n";

const CHIPS = ["glove box latch", "air vent tab", "trim clip", "VW Golf", "BMW cup holder", "4B088637301"];

export default function PartSearch({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const L = (k: Key) => tr(lang, k);
  const run = useServerFn(searchParts);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PartHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  async function go(query: string) {
    if (query.trim().length < 2) return;
    setQ(query); setBusy(true); setErr(false);
    try {
      const r = await run({ data: { q: query } });
      setHits(r.hits); setErr(!!r.error);
    } catch { setErr(true); setHits([]); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="mt-10 flex max-h-[85vh] w-full max-w-4xl flex-col rounded-lg border border-border bg-card shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-mono text-lg font-bold">{L("psTitle")}</h2>
          <button type="button" onClick={onClose} aria-label={L("psClose")} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form className="flex gap-2 px-5 pt-4" onSubmit={(e) => { e.preventDefault(); go(q); }}>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={L("psPlaceholder")}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" disabled={busy} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? L("psSearching") : L("psSearch")}
          </button>
        </form>
        <div className="flex flex-wrap gap-2 px-5 py-3">
          {CHIPS.map((c) => (
            <button key={c} type="button" onClick={() => go(c)} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary">{c}</button>
          ))}
        </div>
        <p className="px-5 text-xs text-muted-foreground">{L("psHint")}</p>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {err && <p className="text-sm text-destructive">{L("psError")}</p>}
          {hits && !err && hits.length === 0 && <p className="text-sm text-muted-foreground">{L("psEmpty")}</p>}
          {hits && hits.length > 0 && (
            <>
              <p className="mb-3 text-xs text-muted-foreground">{hits.length} {L("psCount")}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {hits.map((h) => (
                  <a key={h.id} href={h.url} target="_blank" rel="noopener noreferrer"
                    className="group overflow-hidden rounded-md border border-border bg-background hover:border-primary">
                    <div className="aspect-square bg-muted">
                      {h.image && <img src={h.image} alt={h.name} loading="lazy" className="h-full w-full object-cover" />}
                    </div>
                    <div className="p-2">
                      <p className="line-clamp-2 text-xs font-medium group-hover:text-primary">{h.name}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">Printables · {h.author}</p>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

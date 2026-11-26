import { useEffect, useState } from "react";

export function NumField({ label, value, onChange, min, max, step = 0.5 }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number;
}) {
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  const commit = () => {
    const parsed = Number(draft);
    const next = Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : value));
    setDraft(String(next));
    setEditing(false);
    if (next !== value) onChange(next);
  };

  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="number" value={draft} min={min} max={max} step={step}
        onFocus={() => setEditing(true)}
        onChange={(e) => {
          const text = e.target.value;
          setDraft(text);
          const next = Number(text);
          if (text.trim() && Number.isFinite(next) && next >= min && next <= max) onChange(next);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className="w-24 rounded-md border border-input bg-background px-2 py-1 text-right font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
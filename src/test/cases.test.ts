import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CASE_PAGES, findCase } from "@/lib/cases";

describe("SEO case pages", () => {
  it("has four pages that each resolve to a gallery model", () => {
    expect(CASE_PAGES).toHaveLength(4);
    for (const c of CASE_PAGES) expect(findCase(c.slug)?.model.id).toBe(c.modelId);
  });
  it("lists every case page in the sitemap", () => {
    const xml = readFileSync("public/sitemap.xml", "utf8");
    for (const c of CASE_PAGES) expect(xml).toContain(`https://enclocad.com/cases/${c.slug}`);
  });
});

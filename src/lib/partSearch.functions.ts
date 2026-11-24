import { createServerFn } from "@tanstack/react-start";

export type PartHit = { id: string; name: string; url: string; image: string | null; author: string };

// Printables public GraphQL search (no key needed). Runs server-side to avoid CORS.
export const searchParts = createServerFn({ method: "POST" })
  .inputValidator((input: { q: string }) => {
    const q = String(input?.q ?? "").trim().slice(0, 120);
    if (q.length < 2) throw new Error("Query too short");
    return { q };
  })
  .handler(async ({ data }): Promise<{ hits: PartHit[]; error: string | null }> => {
    try {
      const res = await fetch("https://api.printables.com/graphql/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: "query($q:String!){searchPrints2(query:$q,limit:24){items{id name slug image{filePath} user{publicUsername}}}}",
          variables: { q: data.q },
        }),
      });
      if (!res.ok) {
        console.error("printables", res.status, await res.text());
        return { hits: [], error: "Search service unavailable" };
      }
      const json = (await res.json()) as {
        data?: { searchPrints2?: { items?: { id: string; name: string; slug: string; image?: { filePath?: string } | null; user?: { publicUsername?: string } | null }[] } };
      };
      const items = json.data?.searchPrints2?.items ?? [];
      return {
        error: null,
        hits: items.map((i) => ({
          id: i.id,
          name: i.name,
          url: `https://www.printables.com/model/${i.id}-${i.slug}`,
          image: i.image?.filePath ? `https://media.printables.com/${i.image.filePath}` : null,
          author: i.user?.publicUsername ?? "",
        })),
      };
    } catch (e) {
      console.error(e);
      return { hits: [], error: "Search service unavailable" };
    }
  });

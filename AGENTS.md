<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- 3D enclosure geometry is built client-side in src/lib/enclosure.ts (three + three-bvh-csg) with no backend; keeps hosting cost near zero.
- UI strings live in src/lib/i18n.ts (TR/EN dictionary); every new label needs both languages.
- Spare-part search proxies the public Printables GraphQL API through a server function (no key, avoids CORS).
- Editor exports use the shared Button and DropdownMenu controls with existing client-side export handlers; keeps individual STL and ZIP downloads accessible in one compact menu.
- Gallery models live in a client-side catalogue and register as named editor templates; previews and editor loads share identical parameters without persistent visitor storage.
- Gallery thumbnails are CDN-hosted captures of the actual models rather than simultaneous live scenes; keeps browsing and filtering fast on mobile.
- Optional filament gasket geometry is guarded by gasketEnabled and shared-link normalization; snap-fit designs cannot accidentally retain a sealing groove.
- The editor uses a single-open options accordion and a mobile section selector; section names remain accessible without scrolling the entire controls list.
- Numeric editor fields share NumField with a local editing draft and blur/Enter validation; partial typing never forces an invalid intermediate value into the geometry.
- Enclosure interior compartments use optional dividers in EnclosureParams, unioned into the base before cutouts; keeps custom layouts like the pipe case parametric.
- Optional separate inner lids use EnclosureParams.innerLid and render/export as their own part; keeps sub-compartment covers printable separately.
- SEO landing pages live in src/lib/cases.ts and render via /cases/$slug, reusing gallery models; new pages must also be added to public/sitemap.xml.

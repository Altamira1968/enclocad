# EncloCAD

**Free parametric 3D-printable enclosure generator — right in your browser.**

🌐 **Live app:** https://enclocad.com

EncloCAD lets makers design millimetre-accurate electronics enclosures and export print-ready STL files in seconds. No account, no install, no server-side rendering — all geometry is generated client-side.

## Features

- **Hardware kits** — one-click layouts for Arduino Uno, Raspberry Pi 4 and ESP32 with every port cut in the right place
- **Lid options** — screw-on lid or print-in-place hinge with snap-fit latch
- **Wall cutouts** — PG7/PG9/PG11 cable glands, USB-C, DC jack, RJ45, vents (unlimited)
- **DIN rail mount**, PCB standoffs and screw bosses
- **TPU filament gasket groove** for splash-proof boxes
- **Lid customisation** — engraved text and honeycomb grille
- **Interior dividers** and separate inner lids (e.g. the Pipe Travel Case)
- **Print-ready output** — chamfered edges, optimal bed orientation, per-part STL or ZIP download
- **Shareable links** and a ready-made model gallery
- **Spare-part search** across public 3D model libraries
- Bilingual interface: English / Türkçe

## Tech stack

- [TanStack Start](https://tanstack.com/start) + React 19 + Vite
- Tailwind CSS v4
- [Three.js](https://threejs.org) + [three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg) for in-browser CSG geometry

## Run locally

Requires Node.js 20+ (or Bun).

```sh
git clone https://github.com/Altamira1968/enclocad.git
cd enclocad
npm install
npm run dev
```

Run tests with `npx vitest run`.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/lib/enclosure.ts` | Parametric enclosure geometry |
| `src/lib/kits.ts` | Hardware kit profiles |
| `src/lib/gallery.ts` | Gallery models |
| `src/lib/i18n.ts` | TR/EN interface strings |
| `src/routes/` | Pages (home, editor, gallery, case pages) |

---

Built with [Lovable](https://lovable.dev).

# Cadmium — Brand / Logo Package (Blueprint)

Logo for **Cadmium**, a tool that generates isometric pipe drawings for AutoCAD Plant 3D.

The mark reads as a periodic-table element tile (symbol **Cd**, atomic number 48) on a
drafting-blueprint tile, with an **isometric grid** texture and a **dimension annotation**
line — signalling "measured / CAD drawing."

## Files
- **/icon** — primary app icon (blueprint tile): `cadmium-icon.svg` + 256/512/1024 png
- **/icon-light** — inverted light-tile colorway: svg + 512 png
- **/icon-mono** — one-color versions (white / blueprint-blue / black), transparent tile
- **/favicon** — simplified mark (grid + dimension removed for small sizes): svg, png 16/32/48/180/192/512, favicon.ico
- **/lockup-horizontal**, **/lockup-stacked** — icon + wordmark + tagline, on-dark & on-light (svg + @2x png)
- **/wordmark** — "CADMIUM" only, on-dark & on-light

## Colors (Blueprint)
| Role                | Hex       |
|---------------------|-----------|
| Blueprint Blue mid  | `#1A4C86` |
| Blueprint Blue deep | `#123B6C` |
| Blueprint Blue base | `#0B2A50` |
| Line / dimension    | `#CFE6FF` |
| Border / ink white  | `#EAF3FF` |
| Symbol white        | `#FFFFFF` |
| Light tile          | `#E9F1FB` |
| Tagline (on light)  | `#2E6BB0` |
| Tagline (on dark)   | `#9CC6F2` |

Tile is a diagonal gradient `#1A4C86 → #123B6C → #0B2A50` with a subtle white top sheen.

## Typography
- Wordmark & symbol: **Fira Sans Bold**
- Tagline: **Fira Mono Medium**
- Fira superfamily, SIL Open Font License 1.1 (free for commercial use).
- **All text in these files is outlined to vector paths** — no fonts need installing for the
  artwork to render identically everywhere. To set NEW text, install:
  Fira Sans (https://fonts.google.com/specimen/Fira+Sans),
  Fira Mono (https://fonts.google.com/specimen/Fira+Mono).

## Usage
- Prefer **SVG**; use PNG only where a fixed bitmap is required.
- Clear space ≥ the height of the "Cd" cap. Min size with grid+dimension detail ~48px; below that use /favicon.
- Don't recolor the tile gradient, stretch the mark, or rotate the dimension line.

Typeface: Fira Sans / Fira Mono © Mozilla Foundation & Telefónica, SIL OFL 1.1.

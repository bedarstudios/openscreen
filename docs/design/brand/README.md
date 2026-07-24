# Showhow application icon

## Chosen concept

The canonical icon is **Candidate B: the folded three-step path**. A forest recording bracket begins
at the lower left, then flows through three connected step tiles toward a squared forward terminal.
The ascending rhythm represents Showhow's core transformation: record an action, organize it into
steps, and move the work forward. The terminal deliberately avoids a generic play triangle, while
the tiles avoid camera and lens imagery.

The source of truth is [`showhow-app-icon.svg`](./showhow-app-icon.svg). It is original flat vector
geometry with no text, external fonts, embedded raster data, gradients, filters, or shadows.

## Palette roles

- Cream `#FFFCF7` is the quiet, warm application-tile background.
- Forest `#142F18` anchors the recording corner, folds, and terminal motion.
- Sage `#82B09A` identifies the first step and one intermediate fold.
- Ink `#2F2F2F` gives the middle step enough visual weight to hold the sequence together.
- Signal green `#6BFF7E` marks the final step and the active transition into it.

## Geometry and clear space

The artwork uses a `1024 × 1024` view box. The cream background begins 32 units inside that box and
has a 224-unit corner radius. Keep at least 64 units of uninterrupted cream between the foreground
mark and every edge of the cream background; the canonical geometry provides at least 72 units.
Do not enlarge, rotate, crop, or rearrange the mark within the tile.

The cream rounded square is part of the icon, not a presentation mockup. Platform generators may
add their required transparent canvas or mask outside it, but must not replace its color, radius, or
internal spacing. On macOS, preserve the complete rounded-square treatment and let the operating
system apply its standard icon mask. On Windows and Linux, preserve the same composition on a
transparent square canvas.

## Small-size rules

The canonical geometry uses three 144-unit tiles, 48-unit diagonal connectors, and a 64-unit start
and terminal stroke so that the parts remain independently recognizable in a direct 16 px render.
The SVG should be rendered unchanged at 32 px and above. At 16 px, pixel-grid fitting may be used
only in generated derivatives: keep the recording bracket at least one solid pixel wide, keep all
three tiles visibly distinct, and preserve the cream gaps that separate the bracket, steps, and
terminal. Do not add outlines, remove a step, introduce a play triangle, or change palette colors.
At 32 px, retain the three fold corners and rounded tile silhouettes; do not preserve subpixel
corner detail at the expense of the ascending rhythm.

Platform PNG, ICO, and ICNS files are generated artifacts. They must be regenerated from the
canonical SVG rather than edited by hand.

# Look rules (3D pixel-art Gaussian splat world)

Why this file exists: the first version of our world blended soft splats, jittered every splat's colour, dithered every surface and then snapped
everything to one global 32-colour palette. The result was speckle, rainbow rings on splat edges and characters nobody could read. The reference
toolkit (siliconjungle/shapeshift-labs-ink-studio, read only, never run) does the opposite: **one material ramp colour per art pixel, chosen by light,
with ink at the edges**. These are the rules we took from it, and how each one maps onto our three.js renderer.

Reference paths are relative to the cloned repo. Ours are relative to `src/world3d/`.

## Rules taken from the reference

1. **Colour is a material ramp step, never a random colour.** A material is a 3-5 step ramp, dark to light; a surface picks a step by how lit it is.
   (README "Geometry and materials": "Materials normally use palette indices in a dark-to-light ramp"; `src/builder.js` pixNext/ramps; `docs/surface-materials.md`.)
   *Ours:* `materials.ts` holds one table of 29 five-step ramps (at most 50: detail codes 201-250 are ramp ids + 201) (bright hopeful palette: sky, cream, greens, turquoise, coral, sun, lilac, wood, three skin tones, ink #2b3a55).
   A splat stores a ramp id + a base step. `rampFor(hex)` snaps any authored hex to the nearest ramp step, so every world file keeps working; far-off colours get a generated ramp.

2. **Ramps turn hue: shadows lean cool, lights lean warm.** (`src/kit/km-ramp.js` header; `src/kit/p70-palette-ramps.js`.)
   *Ours:* the table is authored that way (peach shadows go coral-lilac, greens go teal in shade); `generate()` shifts hue 0.04 toward blue in shadow and 0.02 toward yellow in light.

3. **Light moves a surface along its own ramp.** (`src/webgl/shaders.mjs` `bandOf`/`rampAt`; surface-materials.md "how lit".)
   *Ours:* `gaussianShaders.ts` fragment: step = base + (n.L > hi ? +1 : n.L < lo ? -1 : 0). Flat splats carry a normal, rounded splats (`blob`) compute a smooth normal per fragment
   from their ellipsoid, so a ball gets clean light bands whose contour does not depend on where splats happen to lie.

4. **Solid splats are crisp, soft splats stay soft, and only solids own pixels.** (`shaders.mjs` ~line 252 "solid splats get a tight falloff so shapes read cleanly";
   art-passes.md: "The owner is the nearest depth-writing fragment with effective opacity above 0.5".)
   *Ours:* `SOLID_CUT = 0.55`. Opacity >= 0.55 draws a hard-edged disc, no blending, depth write on. Below that (haze, light pools, glass, fades through `uOpacity`) is a second pass
   with alpha blending, alpha quantised to five bands so glow is flat bands, not a gradient.

5. **One owner per art pixel, with ids kept beside the colour.** (art-passes.md channels `depth`, `materialId`, `objectId`, `splatId`.)
   *Ours:* render target = RGBA8 colour + depth texture. The alpha channel holds a material code: 0 sky, 1-100 solid ramp, 101-200 effect (never outlined), 201-250 face detail (protected).
   No multisampling (it melted edges). Each solid fragment writes its true depth from its own plane (flat) or tangent plane (rounded), so overlap order needs no sorting.

6. **Ink outlines where depth breaks.** (`shaders.mjs` ~627-644 "the nearer pixel takes a darker step of its own ramp"; art-passes.md "Selective ink": silhouette, boundary, crease.)
   *Ours:* `pixelShaders.ts` FINAL pass. Against the sky: ink #2b3a55. Against a nearer surface more than 0.9 world units away: the farther pixel takes its ramp's darkest step mixed with ink.
   We draw on the *far* side, so small heads and props keep their interior pixels (the reference draws on the near side).
   Deviation from the brief: there is no separate material-id edge. Only the sky silhouette and depth gaps are inked; a decal on a wall (same depth) is deliberately not outlined.

7. **Clean up lonely pixels, and never delete the protected ones.** (`shaders.mjs` `CLEAN_FS`: notch/bump fix, speck = no like neighbour; art-passes.md `stable.protect: ['eyes', ...]`.)
   *Ours:* `pixelShaders.ts` CLEAN pass: a solid pixel with no neighbour of its material takes the majority neighbour. Decided on the material code, not the colour. Eyes and mouths use code 201+ and are skipped.

8. **Dither only on purpose, per target.** (pixel-look.md "Target palettes and dithering": strength 0 = nearest swatch; each material may have its own policy.)
   *Ours:* no dithering on solids at all. The one ordered (Bayer) dither is a three-band gradient in open sky.

9. **Stable pixels: the camera snaps to the art grid.** (art-passes.md `stable.snap`.) *Ours:* `createDioramaCamera` already snapped; unchanged.

10. **Fixed art resolution.** (pixel-look.md `pixelSize`: "fixes the number of screen pixels per art pixel".) *Ours:* `ART_ROWS = 400` on the short side (`?px=N` overrides); 390x844 art pixels on a 390-wide phone at DPR 3.

11. **Reserve emission and fog colours.** (art-passes.md `ink.reserved`.) *Ours:* sun, clouds, sparks, rain and light pools are "effect" splats: flat colour, no ink, no cleanup.

12. **Local splat ordering beats global ordering.** (art-passes.md "Local splat ordering": surface order fixed all misordered opaque overlaps.)
   *Ours:* depth-tested hard splats with per-fragment plane depth give the same result without a sort. The counting sort is only used by the soft pass.

## Rules that are ours (the reference ships no character cast: README says its character kit is "a toolkit for authoring a character, rather than a bundled cast")

13. **Crisp edges on flat things.** A flat splat is cut to its own panel (`clip` box, `kit.panel`), a rounded splat to its ellipsoid, so a wall, a stripe or a window has a pixel-exact edge instead of the scalloped rim of a round splat.
   Patterned or translucent panels are laid on a grid, one splat per cell, so stripes and windows never overlap or smear.

14. **People are readable at a glance.** Head about a third of the height, two dark eye dots (plus a highlight when large), mouth, blush and highlight only above a figure scale of about 0.75 (gated on scale, so small crowd figures stay clean), big outfit colour blocks,
   hair shape, ink outline from rule 6. `chibi.ts` draws every person (hero, bystanders, cutscene figures); the hero is 2.8 tall (bystanders 1.7) and stands in a coral ring.

15. **Fewer, bigger props.** Keepsakes are drawn 1.2x bigger than before (and capped at size 2.0 indoors so none hides a person); only the guitar was redrawn as a simpler silhouette, the rest keep their old shapes. Windows and signs are grid cells, not scattered splats.

## What we did not take

Per-pixel pattern materials (brick/tile/shingle cells in the shader), 3D LUTs and colour stacks, water optics, glass refraction, art-pixel effects (heat, trails). They solve problems we do not have in a flat, bright, phone-sized diorama.
Splats authored solid stay solid at full opacity and become soft only while faded (`uOpacity` < 1), so animated fades never pop across the cut. Temporal damping (`damp`) is not implemented: with exact plane depth, no sorting for solids and a snapped camera, the only moving pixels are the foliage sway and the reveal, which are meant to move.

## Tuning knobs

- `uLo` / `uHi` (per mesh uniforms, default 0.3 / 0.7): how much of a surface is in shade or highlight. `uLight` is the light direction (upper left).
- `uGap` in the pixel renderer (0.9): world-unit depth jump that draws an interior outline.
- `HARD_RADIUS` (1.8) in `gaussianShaders.ts`: how many standard deviations a solid splat covers; bigger fills gaps, but edges come from clipping so it does not blur them.

import { PALETTE, type Sprite } from './sprites';

interface Built { w: number; h: number; paths: readonly (readonly [string, string])[] }
const cache = new WeakMap<Sprite, Built>();

/** One path per colour, one run-length rectangle per horizontal stretch of pixels. */
function build(sprite: Sprite): Built {
  const byColour = new Map<string, string>();
  sprite.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const ch = row[x];
      let end = x;
      while (end < row.length && row[end] === ch) end++;
      const colour = PALETTE[ch];
      if (colour) byColour.set(colour, `${byColour.get(colour) ?? ''}M${x} ${y}h${end - x}v1h-${end - x}z`);
      x = end;
    }
  });
  return { w: sprite.rows[0]?.length ?? 0, h: sprite.rows.length, paths: [...byColour.entries()] };
}

/** A sprite drawn inside someone else's SVG (a chart label): same paths as PixelIcon, placed at (x, y) at `scale` units per pixel. */
export function PixelGroup({ sprite, x, y, scale }: { sprite: Sprite; x: number; y: number; scale: number }) {
  const built = cache.get(sprite) ?? build(sprite);
  cache.set(sprite, built);
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} shapeRendering="crispEdges" aria-hidden="true">
      {built.paths.map(([fill, d]) => <path key={fill} d={d} fill={fill} />)}
    </g>
  );
}

/** Draws a sprite crisp at `scale` CSS pixels per sprite pixel. Decorative unless `label` is given. */
export function PixelIcon({ sprite, scale = 3, label, className }: { sprite: Sprite; scale?: number; label?: string; className?: string }) {
  const built = cache.get(sprite) ?? build(sprite);
  cache.set(sprite, built);
  return (
    <svg
      className={`ml-pix ${className ?? ''}`}
      width={built.w * scale}
      height={built.h * scale}
      viewBox={`0 0 ${built.w} ${built.h}`}
      shapeRendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {built.paths.map(([fill, d]) => <path key={fill} d={d} fill={fill} />)}
    </svg>
  );
}

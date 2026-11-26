import { box, line, panel, stripes } from './kit';
import { ROAD } from './layout';
import type { Ctx } from './ctx';

// The tram. It is built around x = 0 and slid along the street by update().

export function buildTram(ctx: Ctx): void {
  const b = ctx.L.tram, z = ROAD.tramZ, len = 5.2, w = 1.3;
  box(b, 0, z, len, w, 0.3, 1.35, 0x3f9f5a, { density: 60 });
  box(b, 0, z, len - 0.1, w - 0.05, 1.65, 1.0, 0xfff6dc, { density: 60, top: 0x2a6f4a });
  box(b, 0, z, len + 0.2, w + 0.2, 2.65, 0.14, 0x2a6f4a, { density: 60, edge: 0.4 });
  const ad = ctx.d.regime === 'crash' ? 0xd9553f : 0xff9ec4;
  for (const side of [1, -1]) {
    const zz = z + side * (w / 2 + 0.04);
    const zLine = z + side * (w / 2 + 0.07);
    const shade = side > 0 ? 0.9 : 0.7;
    panel(b, 'z', [0, 1.2, zz], len - 0.2, 0.5, 0xffd85a, { density: 70, shade, depthBias: 0.06 });
    panel(b, 'z', [0, 2.15, zz], len - 0.2, 0.55, 0xffd85a, { density: 70, shade, depthBias: 0.06 });
    panel(b, 'z', [0, 0.65, zz], len - 0.2, 0.4, stripes(ad, 0xfff6dc, 4), { density: 70, shade, depthBias: 0.06 });
    for (let i = -4; i <= 4; i += 1) line(b, [i * 0.55, 0.95, zLine], [i * 0.55, 1.45, zLine], 0x2a6f4a, 0.03, 0.05);
    for (let i = -4; i <= 4; i += 1) line(b, [i * 0.55, 1.9, zLine], [i * 0.55, 2.4, zLine], 0x2a6f4a, 0.03, 0.05);
  }
  for (const dx of [-1.8, 1.8]) for (const dz of [-0.45, 0.45]) b.blob(dx, 0.2, z + dz, 0.2, 0.2, 0.1, 10, 0x2b3a55, 0.06);
  line(b, [-1.7, 2.8, z], [-0.2, 4.6, z], 0x2b3a55, 0.03, 0.06);
  b.blob(len / 2 + 0.1, 0.8, z, 0.06, 0.1, 0.35, 8, 0xfff0a0, 0.05);
}

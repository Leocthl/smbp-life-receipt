// Tiny pixel-art sprites drawn from text rows. Each character is one pixel; '.' is empty.
// Palette keys: o ink, w paper, u cream, s skin, k dark hair, n brown, y sun, g green, G deep green,
// t turquoise, b sky, B blue, r coral, R red, l lilac, p pink, e grey.

export interface Sprite { readonly rows: readonly string[] }

export const PALETTE: Readonly<Record<string, string>> = {
  o: '#2b3a55', w: '#fffaf0', u: '#fff6dc', s: '#ffcf9f', k: '#3a3f5c', n: '#9a6a46', y: '#ffd85a', g: '#7ed07a',
  G: '#3f9a54', t: '#4cc3d9', b: '#8fd3ff', B: '#4a8fd8', r: '#ff8a6b', R: '#e0533a', l: '#b9a7ff', p: '#ff9fbf', e: '#b7c3d6',
};

const sprite = (rows: string[]): Sprite => ({ rows });

type Dot = readonly [number, number, string];

/** Replace single pixels (x, y, char) in a set of rows. */
function paint(rows: readonly string[], dots: readonly Dot[]): string[] {
  return rows.map((row, y) => [...row].map((ch, x) => dots.find((d) => d[0] === x && d[1] === y)?.[2] ?? ch).join(''));
}

const HEAD = [
  '....oooo....', '...oHHHHo...', '..oHHHHHHo..', '..oHssssHo..', '..osossoso..', '..osssssso..', '...osssso...', '....oooo....',
];
const BODY = ['..ooCCCCoo..', '.oCCCCCCCCo.', '.oCCCCCCCCo.', '.oCCCCCCCCo.'];

/** A 12x12 person: H hair, C clothes, plus loose pixels for accessories. */
function person(hair: string, top: string, dots: readonly Dot[] = []): Sprite {
  const rows = [...HEAD, ...BODY].map((r) => r.replaceAll('H', hair).replaceAll('C', top));
  return sprite(paint(rows, dots));
}

const TIE = (c: string): Dot[] => [[5, 8, c], [6, 8, c], [5, 9, c], [6, 9, c], [5, 10, c], [6, 10, c], [5, 11, c], [6, 11, c]];
const CROSS: Dot[] = [[5, 9, 'R'], [6, 9, 'R'], [4, 10, 'R'], [5, 10, 'R'], [6, 10, 'R'], [7, 10, 'R'], [5, 11, 'R'], [6, 11, 'R']];
const SMILE: Dot[] = [[5, 6, 'R'], [6, 6, 'R']];

export const PORTRAITS: Readonly<Record<string, Sprite>> = {
  friend: person('n', 't', [[2, 4, 'n'], [9, 4, 'n'], ...SMILE]),
  boss: person('k', 'B', TIE('r')),
  doctor: person('k', 'w', CROSS),
  agent: person('k', 'l', [...TIE('y'), [3, 4, 'o'], [8, 4, 'o'], [3, 5, 'e'], [8, 5, 'e']]),
  parent: person('e', 'g', [[3, 3, 'e'], [8, 3, 'e'], ...SMILE]),
  partner: person('p', 'r', [[2, 4, 'p'], [2, 5, 'p'], [2, 6, 'p'], [9, 4, 'p'], [9, 5, 'p'], [9, 6, 'p'], ...SMILE]),
  self: person('k', 'y', [...SMILE, [10, 1, 'y'], [11, 0, 'y'], [11, 2, 'y']]),
  landlord: sprite([
    '.....oo.....', '....orro....', '...orrrro...', '..orrrrrro..', '.orrrrrrrro.', 'oooooooooooo',
    '.ouuuuuuuuo.', '.oubbuubbuo.', '.oubbuubbuo.', '.ouuuonnuuo.', '.ouuuonnuuo.', '.oooooooooo.',
  ]),
  headline: sprite([
    'oooooooooooo', 'owwwwwwwwwwo', 'owooooooowwo', 'owwwwwwwwwwo', 'owbbbbweeeeo', 'owbbbbwwwwwo',
    'owbbbbweeeeo', 'owwwwwwwwwwo', 'owRwwwwwwRwo', 'owwRwwwwRwwo', 'owwwRRRRwwwo', 'oooooooooooo',
  ]),
  bank: sprite([
    '.....oo.....', '...oouuoo...', '..ouuuuuuo..', '.oooooooooo.', '.owuwuuwuwo.', '.owuwuuwuwo.',
    '.owuwyyuwuo.', '.owuwyyuwuo.', '.owuwuuwuwo.', '.owuwuuwuwo.', 'oooooooooooo', 'oyyyyyyyyyyo',
  ]),
  phone: sprite([
    '...oooooo...', '..oeeeeeeo..', '..obbbbbbo..', '..obwwwbbo..', '..obbbbbbo..', '..obbbyyyo..',
    '..obbbbbbo..', '..obgggbbo..', '..obbbbbbo..', '..oeeeeeeo..', '..oeeooeeo..', '...oooooo...',
  ]),
  campus: sprite([
    '....oooo....', '..ookkkkoo..', 'ookkkkkkkkoo', '..ookkkkoo.y', '....okko..y.', '....okko..y.',
    '..oooookooo.'.replace('k', 'o'), '..oouuuuoo..', '.oouuuuuuoo.', '.oouoouuooo.', '.ouuuuuuuuo.', '.oooooooooo.',
  ]),
};

export const ICONS: Readonly<Record<string, Sprite>> = {
  coin: sprite(['..oooo..', '.oyyyyo.', 'oywyyyyo', 'oywyyyyo', 'oyyyyyyo', 'oyyyyyyo', '.oyyyyo.', '..oooo..']),
  gem: sprite(['..oooo..', '.otbbto.', 'otbwbbto', 'oottttoo', '.ottttto', '..ottto.', '...oto..', '....o...']),
  heart: sprite(['.oo..oo.', 'orroorro', 'orwrrrro', 'orrrrrro', '.orrrro.', '..orro..', '...oo...', '........']),
  people: sprite([
    '..oo...oo..', '.osso.osso.', '.osso.osso.', '..oo...oo..', 'ottttollllo', 'ottttollllo', '.ooooo.ooo.', '...........',
  ]),
  sun: sprite([
    '....y....', '.y..y..y.', '..ooooo..', 'y.oyyyo.y', 'yyoywyoyy', 'y.oyyyo.y', '..ooooo..', '.y..y..y.', '....y....',
  ]),
  suncloud: sprite([
    '.y.y.....', '..yyy....', '.yyyyooo.', '..yoeeeeo', '..oeeeeeo', '.oeeeeeeo', '.ooooooo.', '.........', '.........',
  ]),
  cloud: sprite([
    '.........', '...ooo...', '..oeeeo..', '.oeeeeoo.', 'oeeeeeeeo', 'oeeeeeeeo', '.ooooooo.', '.........', '.........',
  ]),
  storm: sprite([
    '...ooo...', '..oBBBo..', '.oBBBBoo.', 'oBBBBBBBo', 'oBBBBBBBo', '.ooyooooo', '...yyo...', '..yyyo...', '...yo....',
  ]),
  rainbow: sprite([
    '..ooooo..', '.orrrrro.', 'orrgggrro', 'orgg.ggro', 'ogg...ggo', 'og.....go', 'ow.....wo', '.........', '.........',
  ]),
};

/** Small mono glyphs for choice tags (ink + paper on a coloured tile). */
export const GLYPHS: Readonly<Record<string, Sprite>> = {
  save: sprite(['..oooo..', '.owwwwo.', '.oooooo.', 'owwwwwwo', 'owwwwwwo', 'owwwwwwo', '.oooooo.', '........']),
  invest: sprite(['...o....', '..ooo.oo', '.ooooooo', '..ooo.oo', '...o....', '...o....', '...o....', '..ooo...']),
  risky: sprite(['.oooooo.', 'owwwwwwo', 'owoowwwo', 'owwwwwwo', 'owwwowwo', 'owwwwwwo', 'owowwowo', '.oooooo.']),
  spend: sprite(['...oo...', '..o..o..', '.oooooo.', 'owwwwwwo', 'owwwwwwo', 'owwwwwwo', 'owwwwwwo', '.oooooo.']),
  family: sprite(['.oo..oo.', 'oooooooo', 'oooooooo', '.oooooo.', '..oooo..', '...oo...', '........', '........']),
  debt: sprite(['oooooooo', 'owwwwwwo', 'oooooooo', 'owwwwwwo', 'owoowwwo', 'owwwwwwo', 'oooooooo', '........']),
  sell: sprite(['...oo...', '...oo...', '...oo...', 'oo.oo.oo', '.oooooo.', '..oooo..', '...oo...', '........']),
  work: sprite(['..oooo..', '..o..o..', 'oooooooo', 'owwwwwwo', 'oooooooo', 'owwwwwwo', 'owwwwwwo', 'oooooooo']),
  safe: sprite(['..oooo..', '.oooooo.', 'oooooooo', 'oooooooo', '...oo...', '...oo...', '.o.oo...', '..ooo...']),
  status: sprite(['...oo...', '...oo...', 'oooooooo', '.oooooo.', '..oooo..', '.oo..oo.', '.o....o.', '........']),
  idle: sprite(['........', '........', '........', 'o.o.o.o.', '........', '........', '........', '........']),
};

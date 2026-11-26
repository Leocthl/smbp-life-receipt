import type { Sprite } from '../components/sprites';

const sprite = (rows: string[]): Sprite => ({ rows });

export const TOOL_ICONS = {
  soundOn: sprite(['...o...o....', '..oo....o...', 'ooooo.o..o..', 'ooooo.o..o..', 'ooooo.o..o..', '..oo....o...', '...o...o....']),
  soundOff: sprite(['...o........', '..oo..o...o.', 'ooooo..o.o..', 'ooooo...o...', 'ooooo..o.o..', '..oo..o...o.', '...o........']),
  help: sprite(['..ooo..', '.oo.oo.', '.oo.oo.', '....oo.', '...oo..', '...oo..', '.......', '...oo..', '...oo..']),
};

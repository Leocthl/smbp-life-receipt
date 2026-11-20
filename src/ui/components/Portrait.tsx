import type { Speaker } from '../../engine/types';
import { PixelIcon } from './PixelIcon';
import { PORTRAITS } from './sprites';
import { SPEAKER_HUE } from './tags';

/** Who is talking: a pixel portrait in a framed tile, tinted by the speaker's colour. */
export function Portrait({ speaker, scale = 4 }: { speaker: Speaker; scale?: number }) {
  return (
    <div className="ml-portrait" data-hue={SPEAKER_HUE[speaker]} data-speaker={speaker}>
      <PixelIcon sprite={PORTRAITS[speaker]} scale={scale} />
    </div>
  );
}

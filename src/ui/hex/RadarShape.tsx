import { useId } from 'react';
import { QUALITIES, type Quality, type Qualities } from '../../world3d/qualities';
import { axisPoint, changedAxes, clampQ, ringPath, shapePoints, toPath } from './geometry';

export interface RadarShapeProps {
  values: Qualities;
  /** drawn as a dashed ghost; vertices that moved pulse */
  previous?: Qualities;
  size: number;
  /** accessible name for the whole chart */
  label: string;
  /** axis names; when given, the chart reserves room and draws "name value" at each axis */
  names?: Record<Quality, string>;
}

const LABEL_ROOM = 72;
const PULSE_HALF = 3;

/** The SVG drawing only: stateless. */
export function RadarShape({ values, previous, size, label, names }: RadarShapeProps) {
  const pid = `ml-hex-dither-${useId().replace(/\W/g, '')}`;
  const c = size / 2;
  const maxR = c - (names ? LABEL_ROOM : 4);
  const cur = shapePoints(values, maxR, c, c);
  const prev = previous ? shapePoints(previous, maxR, c, c) : null;
  const moved = changedAxes(values, previous);
  return (
    <svg className="ml-hex__svg" viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={label} shapeRendering="crispEdges">
      <defs>
        <pattern id={pid} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#4cc3d9" />
          <rect width="2" height="2" fill="#3aaecb" />
          <rect x="2" y="2" width="2" height="2" fill="#3aaecb" />
        </pattern>
      </defs>
      {[1 / 3, 2 / 3, 1].map((f) => <path key={f} className="ml-hex__grid" d={ringPath(f, maxR, c, c)} />)}
      {QUALITIES.map((q, i) => {
        const [x, y] = axisPoint(i, maxR, c, c);
        return <line key={q} className="ml-hex__grid" x1={c} y1={c} x2={x} y2={y} />;
      })}
      {prev && <path className="ml-hex__ghost" d={toPath(prev)} />}
      <path className="ml-hex__shape" fill={`url(#${pid})`} d={toPath(cur)} />
      {cur.map(([x, y], i) => {
        const q = QUALITIES[i];
        // keyed by value so a changed vertex remounts and replays its pulse
        return (
          <rect
            key={`${q}:${clampQ(values[q])}`}
            className={`ml-hex__v${moved[i] ? ' ml-hex__v--pulse' : ''}`}
            x={x - PULSE_HALF} y={y - PULSE_HALF} width={PULSE_HALF * 2} height={PULSE_HALF * 2}
          />
        );
      })}
      {names && QUALITIES.map((q, i) => (
        <AxisLabel key={q} i={i} c={c} r={maxR + 14} text={`${names[q]} ${Math.round(clampQ(values[q]))}`} />
      ))}
    </svg>
  );
}

function AxisLabel({ i, c, r, text }: { i: number; c: number; r: number; text: string }) {
  const [x, y] = axisPoint(i, r, c, c);
  const anchor = Math.abs(x - c) < 2 ? 'middle' : x < c ? 'end' : 'start';
  const baseline = y < c - 2 ? 'auto' : y > c + 2 ? 'hanging' : 'middle';
  return <text className="ml-hex__label" x={x} y={y} textAnchor={anchor} dominantBaseline={baseline}>{text}</text>;
}

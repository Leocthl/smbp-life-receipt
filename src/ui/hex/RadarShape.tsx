import { useId } from 'react';
import { PixelGroup } from '../components/PixelIcon';
import { QUALITY_ICONS } from '../components/sprites';
import { QUALITIES, type Quality, type Qualities } from '../../world3d/qualities';
import { axisPoint, changedAxes, clampQ, ringPath, shapePoints, toPath } from './geometry';

export interface RadarShapeProps {
  values: Qualities;
  /** drawn as a dashed ghost; vertices that moved pulse */
  previous?: Qualities;
  size: number;
  /** accessible name for the whole chart */
  label: string;
  /** axis names; when given, the chart is the roomy labelled layout: a name and an icon with the value at every axis */
  names?: Record<Quality, string>;
}

const PULSE_HALF = 3;
/** labelled layout, in viewBox units where the viewBox is `size` wide: hexagon radius, viewBox height, label block */
const RADIUS = 0.28;
const HEIGHT = 0.88;
const BLOCK_H = 38;
const ICON_PX = 18;
const DIGIT_PX = 10.5;

/** The SVG drawing only: stateless. */
export function RadarShape({ values, previous, size, label, names }: RadarShapeProps) {
  const pid = `ml-hex-dither-${useId().replace(/\W/g, '')}`;
  const w = size;
  const h = names ? Math.round(size * HEIGHT) : size;
  const cx = w / 2;
  const cy = h / 2;
  const maxR = names ? size * RADIUS : size / 2 - 4;
  const cur = shapePoints(values, maxR, cx, cy);
  const prev = previous ? shapePoints(previous, maxR, cx, cy) : null;
  const moved = changedAxes(values, previous);
  return (
    <svg className="ml-hex__svg" viewBox={`0 0 ${w} ${h}`} width={names ? undefined : w} height={names ? undefined : h} role="img" aria-label={label} shapeRendering="crispEdges">
      <defs>
        <pattern id={pid} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#4cc3d9" />
          <rect width="2" height="2" fill="#3aaecb" />
          <rect x="2" y="2" width="2" height="2" fill="#3aaecb" />
        </pattern>
      </defs>
      {[1 / 3, 2 / 3, 1].map((f) => <path key={f} className="ml-hex__grid" d={ringPath(f, maxR, cx, cy)} />)}
      {QUALITIES.map((q, i) => {
        const [x, y] = axisPoint(i, maxR, cx, cy);
        return <line key={q} className="ml-hex__grid" x1={cx} y1={cy} x2={x} y2={y} />;
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
      {names && QUALITIES.map((q, i) => <AxisLabel key={q} i={i} cx={cx} cy={cy} r={maxR} name={names[q]} quality={q} value={Math.round(clampQ(values[q]))} />)}
    </svg>
  );
}

/** Line one: the name. Line two: the quality's icon and its number. The block sits outside the vertex, away from the hexagon. */
function AxisLabel({ i, cx, cy, r, name, quality, value }: { i: number; cx: number; cy: number; r: number; name: string; quality: Quality; value: number }) {
  const [vx, vy] = axisPoint(i, r, cx, cy);
  const side = Math.abs(vx - cx) < 2 ? 'middle' : vx < cx ? 'end' : 'start';
  const x = side === 'middle' ? vx : vx + (side === 'start' ? 12 : -12);
  const top = side === 'middle' ? (vy < cy ? vy - 10 - BLOCK_H : vy + 10) : vy - BLOCK_H / 2 + (vy < cy ? -4 : 4);
  const icon = QUALITY_ICONS[quality];
  const scale = ICON_PX / Math.max(icon.rows[0].length, icon.rows.length);
  const iconW = icon.rows[0].length * scale;
  const numW = String(value).length * DIGIT_PX;
  const rowW = iconW + 5 + numW;
  const rowX = side === 'start' ? x : side === 'end' ? x - rowW : x - rowW / 2;
  return (
    <g>
      <text className="ml-hex__name" x={x} y={top + 14} textAnchor={side}>{name}</text>
      <PixelGroup sprite={icon} x={rowX} y={top + 20} scale={scale} />
      <text className="ml-hex__num" x={rowX + iconW + 5} y={top + 34} textAnchor="start">{value}</text>
    </g>
  );
}

import { rect, type Colour } from './draw';

// Tiny deterministic particles for catches and answers. Angles come from position, so the sim stays pure.

export interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  colour: Colour;
}

export const SPARK_LIFE = 0.8;

export function burst(list: Spark[], x: number, y: number, colour: Colour, n: number): Spark[] {
  const fresh: Spark[] = Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2 + (x + y) * 0.37;
    return { x, y, vx: Math.cos(a) * 26, vy: Math.sin(a) * 26 - 12, age: 0, colour };
  });
  return [...list, ...fresh];
}

export function stepSparks(list: Spark[], dt: number): Spark[] {
  return list
    .map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, vy: p.vy + 60 * dt, age: p.age + dt }))
    .filter((p) => p.age < SPARK_LIFE);
}

export function drawSparks(ctx: CanvasRenderingContext2D, list: Spark[]): void {
  for (const p of list) rect(ctx, p.colour, p.x, p.y, 2, 2);
}

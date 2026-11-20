// Touch stick for phones, bottom-left. Reads as screen directions: x right, y up, each in -1..1.
const RADIUS = 48; // px of knob travel

export interface Stick { x: number; y: number }

export interface Joystick {
  read(): Stick;
  dispose(): void;
}

export function createJoystick(parent: HTMLElement, label: string): Joystick {
  const base = document.createElement('div');
  base.className = 'ml-stage-joy';
  base.setAttribute('role', 'slider');
  base.setAttribute('aria-label', label);
  const knob = document.createElement('div');
  knob.className = 'ml-stage-joy__knob';
  base.append(knob);
  parent.append(base);

  let read: Stick = { x: 0, y: 0 };
  let id: number | null = null;

  const move = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    const r = base.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy), k = len > RADIUS ? RADIUS / len : 1;
    read = { x: (dx * k) / RADIUS, y: (-dy * k) / RADIUS };
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  };
  const release = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = null;
    read = { x: 0, y: 0 };
    knob.style.transform = '';
  };
  const press = (e: PointerEvent) => {
    id = e.pointerId;
    base.setPointerCapture(e.pointerId);
    move(e);
  };
  base.addEventListener('pointerdown', press);
  base.addEventListener('pointermove', move);
  base.addEventListener('pointerup', release);
  base.addEventListener('pointercancel', release);

  return {
    read: () => ({ ...read }),
    dispose() { base.remove(); },
  };
}

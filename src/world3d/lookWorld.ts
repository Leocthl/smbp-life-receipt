import * as THREE from 'three';
import type { Regime } from '../engine/types';
import type { GameState } from '../engine/types';
import { buildAvatar } from './avatar';
import type { AvatarHandle, WorldHandle } from './contracts';
import type { Memento, Scope, WorldDescriptor } from './descriptor';
import type { Category, Tag } from '../engine/types';
import { createDioramaCamera, createPixelRenderer } from './pixel';
import { buildWorld } from './world';

const SCOPES_LIST: readonly Scope[] = ['room', 'home', 'block', 'district', 'city'];
const TAGS: Tag[] = ['save', 'invest', 'risky', 'spend', 'fun', 'family', 'career', 'debt', 'insure', 'status', 'safe', 'hold', 'sell', 'work'];
const CATS: Category[] = ['daily', 'investing', 'career', 'health', 'family', 'friends', 'housing'];

/** n fake decisions with mixed tags, so every keepsake can be seen. */
function fakeMementos(n: number, age: number): Memento[] {
  return Array.from({ length: n }, (_, i) => ({
    turn: i * 2, age: Math.max(18, age - Math.round(((n - i) * (age - 18)) / Math.max(1, n))), eventId: 'evt_' + i, choiceId: 'c' + (i % 3),
    category: CATS[i % CATS.length], tag: TAGS[i % TAGS.length], netWorthDelta: ((i * 7919) % 50) * 1000 * (TAGS[i % TAGS.length] === 'debt' ? -1 : 1),
  }));
}

// ?look=world : the neighbourhood and the character, with a fake descriptor taken from the query string.
//   &home=parents|rent|owner &regime=bull|normal|correction|crash|recovery &job=student|employed|unemployed|retired
//   &age=30 &wealth=.. &safety=.. &joy=.. &bonds=.. &freedom=.. &growth=..  (0..100)
//   &partner=1 &kids=1 &car=1 &hustle=1 &insured=1 &burnt=1 &bankrupt=1 &life=0..1 &vh=30 &orbit=0 &yaw=45 &walk=1 &solo=1 (character only) &tx= &ty= &tz= (camera target)

const REGIMES: Regime[] = ['bull', 'normal', 'correction', 'crash', 'recovery'];
const JOBS: GameState['job'][] = ['student', 'employed', 'unemployed', 'retired'];

function pick<T extends string>(v: string | null, all: readonly T[], fallback: T): T {
  return all.find((a) => a === v) ?? fallback;
}

export function descriptorFromQuery(p: URLSearchParams): WorldDescriptor {
  const num = (k: string, f: number) => (p.has(k) && Number.isFinite(Number(p.get(k))) ? Number(p.get(k)) : f);
  const job = pick(p.get('job'), JOBS, 'employed');
  const age = num('age', job === 'student' ? 20 : job === 'retired' ? 66 : 34);
  const flag = (k: string) => p.get(k) === '1';
  return {
    age, turn: Math.round((age - 18) * 4), stage: job === 'student' ? 'uni' : job === 'retired' ? 'retired' : 'work', job,
    home: pick(p.get('home'), ['parents', 'rent', 'owner'] as const, 'parents'),
    partner: flag('partner'), kids: flag('kids') ? 1 : 0, car: flag('car'), sideHustle: flag('hustle'), insured: flag('insured'),
    burntOut: flag('burnt'), bankrupt: flag('bankrupt'), regime: pick(p.get('regime'), REGIMES, 'normal'),
    invested: num('invested', 0.4), lifestyle: num('life', 0.3),
    q: { wealth: num('wealth', 50), safety: num('safety', 50), joy: num('joy', 60), bonds: num('bonds', 50), freedom: num('freedom', 70), growth: num('growth', 50) },
    done: false, scope: pick(p.get('scope'), SCOPES_LIST, 'city'), mementos: fakeMementos(Math.max(0, Math.floor(num('n', 0))), age),
  };
}

export function mountLookWorld(container: HTMLElement) {
  const params = new URLSearchParams(window.location.search);
  const d = descriptorFromQuery(params);
  const px = createPixelRenderer(container);
  const scene = new THREE.Scene();
  const world: WorldHandle = buildWorld(d, 11);
  const avatar: AvatarHandle = buildAvatar(d, 11);
  scene.background = new THREE.Color(world.sky);
  const solo = params.get('solo') === '1'; // only the character, on a plain ground, for close-up shots
  if (solo) scene.background = new THREE.Color(0x9aa8c4); else scene.add(world.group);
  scene.add(avatar.group);
  const home = world.spots.find((s) => s.id === 'home');
  const small = (world.framing?.viewHeight ?? 99) < 20; // indoors: stand on the home spot
  if (solo) avatar.group.position.set(0, 0, 0); else avatar.group.position.set((home?.x ?? 0) + (small ? 0 : 1.6), 0, (home?.z ?? 0) + (small ? 0 : 1.2));
  avatar.group.rotation.y = Math.PI / 4;
  avatar.setWalking(params.get('walk') === '1');
  const aspect = window.innerWidth / window.innerHeight;
  const fr = world.framing ?? { viewHeight: 36, target: [0, 4, -1] as [number, number, number], yaw: Math.PI / 4 };
  const q = (k: string, f: number) => (params.has(k) ? Number(params.get(k)) : f);
  const portrait = aspect < 1 ? 1 + (1 - aspect) * 1.8 : 1; // a phone shows less width, so back off
  const cam = createDioramaCamera(q('vh', fr.viewHeight * portrait));
  cam.target.set(q('tx', fr.target[0]), q('ty', fr.target[1]), q('tz', fr.target[2]));
  const baseYaw = params.has('yaw') ? Number(params.get('yaw')) * (Math.PI / 180) : fr.yaw, orbit = params.get('orbit') === '1'; // framing is fixed by default, like the stage
  const meshes = [...world.meshes, ...avatar.meshes];
  const start = performance.now();
  let last = start, raf = 0, first = true;
  const frame = () => {
    const now = performance.now(), t = (now - start) / 1000, dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    for (const m of meshes) { m.uniforms.uTime.value = t; m.uniforms.uReveal.value = Math.min(1, t / 1.2); m.uniforms.uViewport.value.copy(px.low); }
    world.update(t, dt); avatar.update(t, dt);
    cam.state.yaw = baseYaw + (orbit ? Math.sin(t * 0.2) * 0.3 : 0);
    cam.update(px.low.x / px.low.y, px.low.y);
    for (const m of meshes) m.sort(cam.camera);
    px.render(scene, cam.camera);
    if (first && t > 1.4) { first = false; document.title = 'ready'; }
    raf = requestAnimationFrame(frame);
  };
  const onResize = () => px.resize();
  window.addEventListener('resize', onResize);
  frame();
  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); world.dispose(); avatar.dispose(); px.dispose(); };
}

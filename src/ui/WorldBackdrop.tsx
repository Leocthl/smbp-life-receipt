import { useEffect, useRef } from 'react';
import { newGame } from '../engine/sim';
import type { GameState } from '../engine/types';
import type { AvatarHandle, WorldHandle } from '../world3d/contracts';
import { worldFor, worldKey } from '../world3d/descriptor';
import { createDioramaCamera, createPixelRenderer, type PixelRenderer } from '../world3d/pixel';
import * as THREE from 'three';
import './world.css';

// The living 3D world behind the game: rebuilt (and re-assembled splat by splat) whenever the life visibly changes.
// shortcut: a slow orbit stand-in until the walkable stage (src/world3d/stage.ts) is wired in.

interface Live { px: PixelRenderer; scene: THREE.Scene; world: WorldHandle | null; avatar: AvatarHandle | null; key: string; born: number }

async function build(live: Live, state: GameState) {
  const d = worldFor(state);
  const key = worldKey(d);
  if (key === live.key) return;
  const [{ buildWorld }, { buildAvatar }] = await Promise.all([import('../world3d/world'), import('../world3d/avatar')]);
  live.world?.dispose(); live.avatar?.dispose();
  live.scene.clear();
  live.world = buildWorld(d, state.seed);
  live.avatar = buildAvatar(d, state.seed);
  live.scene.add(live.world.group, live.avatar.group);
  live.scene.background = new THREE.Color(live.world.sky);
  live.key = key;
  live.born = performance.now();
}

export function WorldBackdrop({ state }: { state: GameState | null }) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef<Live | null>(null);
  const failed = useRef(false);

  useEffect(() => {
    if (!host.current) return;
    let px: PixelRenderer;
    try { px = createPixelRenderer(host.current); } catch { failed.current = true; host.current.dataset.failed = '1'; return; }
    const scene = new THREE.Scene();
    const l: Live = { px, scene, world: null, avatar: null, key: '', born: 0 };
    live.current = l;
    const cam = createDioramaCamera(22);
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    let raf = 0, last = start;
    const frame = (now: number) => {
      const t = (now - start) / 1000, dt = (now - last) / 1000;
      last = now;
      const meshes = [...(l.world?.meshes ?? []), ...(l.avatar?.meshes ?? [])];
      const reveal = still ? 1 : Math.min(1, (now - l.born) / 1200);
      for (const m of meshes) { m.uniforms.uTime.value = t; m.uniforms.uViewport.value.copy(px.low); m.uniforms.uReveal.value = reveal; }
      l.world?.update(t, dt); l.avatar?.update(t, dt);
      cam.state.yaw = Math.PI / 4 + (still ? 0 : t * 0.05);
      cam.target.set(0, 1.5, 0);
      cam.update(px.low.x / px.low.y, px.low.y);
      for (const m of meshes) m.sort(cam.camera);
      px.render(scene, cam.camera);
      if (meshes.length && !host.current?.dataset.ready) host.current!.dataset.ready = '1';
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onResize = () => px.resize();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf); window.removeEventListener('resize', onResize);
      l.world?.dispose(); l.avatar?.dispose(); px.dispose(); live.current = null;
    };
  }, []);

  useEffect(() => {
    const l = live.current;
    if (!l || failed.current) return;
    build(l, state ?? newGameStub()).catch(() => { if (host.current) host.current.dataset.failed = '1'; });
  }, [state]);

  return <div className="ml-world" ref={host} aria-hidden="true" />;
}

let stub: GameState | null = null;
/** Before a life starts, show the neighbourhood an 18-year-old wakes up in. */
function newGameStub(): GameState {
  return (stub ??= newGame(1));
}

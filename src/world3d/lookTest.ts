import * as THREE from 'three';
import { createDioramaCamera, createPixelRenderer } from './pixel';
import { createGaussianBuilder } from './gaussian';

// ?look=splat : one small scene to judge the splat pixel-art look before anything else is built on it.

function box(w: number, h: number, d: number, color: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color }));
  m.position.set(x, y + h / 2, z);
  return m;
}

export function mountLookTest(container: HTMLElement) {
  const px = createPixelRenderer(container);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x23263a);
  const b = createGaussianBuilder(7);
  // ground: a disc island, covered in flat surface splats
  const ground = new THREE.Mesh(new THREE.CircleGeometry(13, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x4f8a6b }));
  b.surface(ground, { density: 14, size: 0.28, jitter: 0.12 });
  const path = new THREE.Mesh(new THREE.PlaneGeometry(3, 24).rotateX(-Math.PI / 2).rotateY(0.3), new THREE.MeshBasicMaterial({ color: 0xc4b89a }));
  path.position.y = 0.02;
  b.surface(path, { density: 16, size: 0.22 });
  const tower = new THREE.Group();
  tower.add(box(3, 9, 3, 0xd9d2c0, -5, 0, -3));
  for (let f = 0; f < 8; f += 1) for (let w = 0; w < 3; w += 1) {
    const lit = (f * 7 + w * 3) % 5 < 2;
    tower.add(box(0.5, 0.5, 0.05, lit ? 0xffd27a : 0x3a3f5c, -6 + w, 0.8 + f * 1.05, -1.47));
  }
  b.surface(tower, { density: 30, size: 0.13 });
  const shop = new THREE.Group();
  shop.add(box(4, 2.4, 3, 0xf4f1e6, 3, 0, -2));
  shop.add(box(4.2, 0.7, 0.2, 0xd8504a, 3, 2.4, -0.45));
  shop.add(box(1.2, 1.6, 0.05, 0x6fb0d8, 2.2, 0, -0.47));
  b.surface(shop, { density: 34, size: 0.12 });
  for (const [x, z] of [[-1, 4], [6, 3], [-8, 2], [8, -5]]) {
    b.blob(x, 0.8, z, 0.12, 0.8, 0.12, 40, 0x6b3f2a, 0.1);
    b.blob(x, 2.4, z, 1.3, 1.1, 1.3, 260, (_x: number, y: number) => (y > 0.2 ? 0x8cbf7a : 0x4f8a6b), 0.28, { sway: 0.05 });
  }
  b.blob(0, 0.55, 1, 0.3, 0.45, 0.25, 70, 0x3c6ea8, 0.12);
  b.blob(0, 1.25, 1, 0.24, 0.24, 0.24, 50, 0xffd2b0, 0.1);
  b.blob(0, 1.45, 1, 0.26, 0.1, 0.26, 30, 0x23263a, 0.09);
  const world = b.build();
  scene.add(world.mesh);
  const w = createGaussianBuilder(9);
  for (let i = 0; i < 1800; i += 1) {
    const t = w.rnd() * Math.PI * 2, r = 13.5 + w.rnd() * 6;
    const sz = 0.35 + w.rnd() * 0.3;
    w.add({ p: [Math.cos(t) * r, -0.3, Math.sin(t) * r], s: [sz * 1.6, 0.03, sz], color: w.rnd() > 0.9 ? 0xb5e2f0 : 0x3c6ea8, opacity: 0.85, sway: 0.08 });
  }
  const water = w.build();
  scene.add(water.mesh);

  const cam = createDioramaCamera(Number(new URLSearchParams(location.search).get('vh')) || 26);
  cam.target.set(0, 2, 0);
  let start = performance.now();
  let raf = 0;
  const frame = () => {
    const t = (performance.now() - start) / 1000;
    world.uniforms.uTime.value = t;
    world.uniforms.uReveal.value = Math.min(1, t / 2.5);
    for (const g of [world, water]) { g.uniforms.uViewport.value.copy(px.low); }
    water.uniforms.uTime.value = t;
    cam.state.yaw = Math.PI / 4 + Math.sin(t * 0.15) * 0.25;
    cam.update(px.low.x / px.low.y, px.low.y);
    world.sort(cam.camera); water.sort(cam.camera);
    px.render(scene, cam.camera);
    raf = requestAnimationFrame(frame);
  };
  const onResize = () => px.resize();
  window.addEventListener('resize', onResize);
  frame();
  document.title = 'ready';
  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); world.dispose(); water.dispose(); px.dispose(); start = 0; };
}

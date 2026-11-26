import * as THREE from 'three';
import type { Spot } from './contracts';
import { createGaussianBuilder, type GaussianMesh } from './gaussian';

// Subtle pulsing pixel-art ground rings around visitable outdoor spots during free-roam mode.

const RING_GOLD = 0xffd85a;
const RING_TEAL = 0x4cc3d9;

export interface SpotRings {
  readonly meshes: readonly GaussianMesh[];
  setSpots(spots: readonly Spot[]): void;
  setVisible(on: boolean): void;
  update(t: number, reduced: boolean): void;
  dispose(): void;
}

export function createSpotRings(scene: THREE.Scene): SpotRings {
  const group = new THREE.Group();
  group.name = 'spotRings';
  group.visible = false;
  scene.add(group);
  let ringMesh: GaussianMesh | null = null;

  function clear() {
    if (!ringMesh) return;
    group.remove(ringMesh.mesh);
    ringMesh.dispose();
    ringMesh = null;
  }

  return {
    get meshes() {
      return ringMesh ? [ringMesh] : [];
    },
    setSpots(spots) {
      clear();
      if (spots.length === 0) return;
      const b = createGaussianBuilder(707);
      spots.forEach((spot, idx) => {
        const radius = Math.max(0.85, Math.min(spot.r * 0.92, 1.55));
        const count = 24;
        for (let i = 0; i < count; i += 1) {
          // subtle dashed ring so it highlights spots cleanly without cluttering the pavement
          if (i % 3 === 2) continue;
          const a = (i / count) * Math.PI * 2;
          b.add({
            p: [spot.x + Math.cos(a) * radius, 0.06, spot.z + Math.sin(a) * radius],
            s: [0.13, 0.025, 0.13],
            color: (i + idx) % 2 === 0 ? RING_GOLD : RING_TEAL,
            opacity: 0.72,
            fx: true,
          });
        }
      });
      if (b.count() === 0) return;
      ringMesh = b.build();
      ringMesh.mesh.frustumCulled = false;
      ringMesh.uniforms.uGlow.value = 0.25;
      group.add(ringMesh.mesh);
    },
    setVisible(on) {
      group.visible = on && ringMesh !== null;
    },
    update(t, reduced) {
      if (!group.visible || !ringMesh) return;
      ringMesh.uniforms.uOpacity.value = reduced ? 0.65 : 0.56 + 0.18 * Math.sin(t * 2.6);
    },
    dispose() {
      clear();
      scene.remove(group);
    },
  };
}

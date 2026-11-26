import * as THREE from 'three';
import type { StageApi } from '../contracts';
import { createGaussianBuilder, type GaussianMesh } from '../gaussian';

/** The view height anchored effects are designed for; they are scaled with the camera so they look the same at any zoom. */
export const REF_VIEW = 18;

export type Builder = ReturnType<typeof createGaussianBuilder>;

/** One splat mesh the cutscene owns. Animate `node`; `root` is placed by you (world props) or by the set (anchored). */
export interface Prop {
  readonly g: GaussianMesh;
  readonly node: THREE.Group;
  readonly root: THREE.Group;
  readonly anchored: boolean;
  readonly depth: number;
}

export interface AddOptions {
  seed?: number;
  /** follow the camera: local x is screen-right, y is screen-up, so screen-space effects ignore the camera arc */
  anchored?: boolean;
  /** how far behind the camera target an anchored prop sits (bigger = behind more of the world) */
  depth?: number;
  at?: [number, number, number];
  glow?: number;
}

export interface PropSet {
  add(build: (b: Builder) => void, o?: AddOptions): Prop;
  /** call once a frame, after moving the camera */
  sync(t: number): void;
  dispose(): void;
}

/** 0..1 opacity for a whole prop; hidden props cost nothing to draw. */
export function setOpacity(p: Prop, v: number) {
  p.g.uniforms.uOpacity.value = Math.max(0, Math.min(1, v));
  p.root.visible = v > 0.01;
}

/**
 * The stage only syncs its own meshes, so the cutscene's props get their uniforms, ordering and anchoring here.
 * shortcut: the viewport is copied from the avatar's mesh, since StageApi does not expose the render size.
 */
export function createPropSet(stage: StageApi): PropSet {
  const { cam, target } = stage.camera();
  const props: Prop[] = [];
  const dir = new THREE.Vector3();
  const vp = new THREE.Vector2(390, 844);
  let seed = 4000;
  return {
    add(build, o = {}) {
      seed += 17;
      const b = createGaussianBuilder(o.seed ?? seed);
      build(b);
      const g = b.build();
      g.mesh.userData.mlProp = true;
      g.mesh.children.forEach((c) => { c.userData.mlProp = true; });
      g.uniforms.uGlow.value = o.glow ?? 0;
      const root = new THREE.Group(), node = new THREE.Group();
      node.add(g.mesh);
      root.add(node);
      if (o.at) root.position.set(...o.at);
      stage.scene.add(root);
      const prop: Prop = { g, node, root, anchored: Boolean(o.anchored), depth: o.depth ?? 30 };
      props.push(prop);
      return prop;
    },
    sync(t) {
      const u = stage.avatar().meshes[0]?.uniforms.uViewport.value;
      if (u) vp.copy(u);
      cam.getWorldDirection(dir);
      for (const p of props) {
        if (p.anchored) {
          p.root.position.copy(target).addScaledVector(dir, p.depth);
          p.root.quaternion.copy(cam.quaternion);
          p.root.scale.setScalar((cam.top - cam.bottom) / REF_VIEW);
        }
        p.root.updateMatrixWorld(true);
        p.g.uniforms.uTime.value = t;
        p.g.uniforms.uViewport.value.copy(vp);
        if (p.root.visible) p.g.sort(cam);
      }
    },
    dispose() {
      for (const p of props) { stage.scene.remove(p.root); p.g.dispose(); }
      props.length = 0;
    },
  };
}
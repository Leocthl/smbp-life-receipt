import type * as THREE from 'three';
import type { WorldDescriptor } from './descriptor';
import type { GaussianMesh } from './gaussian';

// Interfaces shared by the world, the avatar, the stage and the cutscenes. Owned by the lead; change only by agreement.

/** Places in the neighbourhood the player can walk to. Some decisions ask you to go to one. */
export type SpotId = 'home' | 'office' | 'bank' | 'market' | 'cafe' | 'park' | 'clinic' | 'campus' | 'pier';

export interface Spot { id: SpotId; x: number; z: number; /** walking within this radius counts as arriving */ r: number }

/** A round obstacle on the ground plane. */
export interface Collider { x: number; z: number; r: number }

export interface Framing { viewHeight: number; target: [number, number, number]; yaw: number }

export interface WorldHandle {
  /** add this to the scene */
  group: THREE.Group;
  /** every Gaussian mesh in the world; the stage sorts them and feeds uViewport/uTime each frame */
  meshes: GaussianMesh[];
  spots: Spot[];
  colliders: Collider[];
  /** half-size of the walkable square, centred on the origin */
  bounds: number;
  /**
   * meshes that just appeared (the keepsake of the latest decision); when the scope did not change the stage reveals
   * only these, so one new prop grows in instead of the whole world re-assembling
   */
  fresh?: GaussianMesh[];
  /** how the camera frames this scope (the bedroom close up, the city wide); the stage tweens to it, no orbiting */
  framing?: Framing;
  /** sky colour behind everything (hex) */
  sky: number;
  /** per-frame animation (water, weather, lights); t = seconds since mount */
  update(t: number, dt: number): void;
  dispose(): void;
}

export interface AvatarHandle {
  /** move/rotate this group to place the character; the figure stands at its origin facing +z */
  group: THREE.Group;
  meshes: GaussianMesh[];
  /** height of the head top, for camera framing and speech bubbles */
  height: number;
  setWalking(on: boolean): void;
  update(t: number, dt: number): void;
  dispose(): void;
}

export type BuildWorld = (d: WorldDescriptor, seed: number) => WorldHandle;
export type BuildAvatar = (d: WorldDescriptor, seed: number) => AvatarHandle;

/** What the stage offers to overlays and cutscenes. */
export interface StageApi {
  /** rebuild the world and character if the descriptor's worldKey changed; the new world assembles itself in */
  setWorld(d: WorldDescriptor): void;
  /** current descriptor */
  world(): WorldDescriptor;
  /** let the player walk (true) or freeze input (false), e.g. while a card is open */
  setControls(on: boolean): void;
  /** highlight a spot with a beacon; resolves when the player walks into it */
  goTo(id: SpotId): Promise<void>;
  /** cancel a pending goTo and remove the beacon */
  clearGoal(): void;
  /** take over the camera: cutscenes drive it themselves until released */
  camera(): { cam: THREE.OrthographicCamera; state: { viewHeight: number; yaw: number; pitch: number }; target: THREE.Vector3; hold(on: boolean): void };
  /** the THREE.Scene, for cutscene props */
  scene: THREE.Scene;
  /** the character, for cutscene staging */
  avatar(): AvatarHandle;
  /** run a function every frame until it returns true */
  animate(step: (t: number, dt: number) => boolean | void): Promise<void>;
  /** fade the pixel picture to a colour (0 = clear, 1 = solid) over ms */
  fade(to: number, ms: number, color?: number): Promise<void>;
  dispose(): void;
}

export enum TreeMorphState {
  SCATTERED = 'SCATTERED',
  MORPHING = 'MORPHING',
  TREE_SHAPE = 'TREE_SHAPE',
  RIDE_RIBBON = 'RIDE_RIBBON',
  RIDE_FIREWORK = 'RIDE_FIREWORK',
  RIDE_PREPARE = 'RIDE_PREPARE',
  RIDE = 'RIDE'
}

export interface TreeConfig {
  foliageCount: number;
  ornamentCount: number;
  giftCount: number;
  polaroidCount: number;
  treeHeight: number;
  treeRadius: number;
  chaosRadius: number;
}

export type Vec3 = [number, number, number];
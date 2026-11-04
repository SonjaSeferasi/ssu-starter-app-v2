// Pure pose maths for the DormSpace 3D avatar (no Three.js). Rotations follow the Game 1 rig:
// the model faces +Z; a negative hip/shoulder angle swings the limb forward, a positive knee
// angle folds the shin back and a negative elbow angle folds the forearm forward.

export const DORM_AVATAR_POSES = ['idle', 'walk', 'run', 'sit', 'sleep'] as const;
export type DormAvatarPose = typeof DORM_AVATAR_POSES[number];
export type DormPoseOptions = {
  /** Holds every pose still (no stride, sway or breathing). Movement is still shown by the scene moving the root. */
  reducedMotion?: boolean;
  /** Seat surface height for `sit`, in metres above the floor. */
  seatHeight?: number;
  /** Mattress surface height for `sleep`. */
  bedHeight?: number;
};
export const DEFAULT_SEAT_HEIGHT = 0.42;
export const DEFAULT_BED_HEIGHT = 0.5;
/** Half the trouser thickness: how far the hip joint sits above the seat surface. */
export const THIGH_RADIUS = 0.065;

/** Measured from the built rig (see avatar-model.ts). */
export type LegMetrics = {
  hip: number;      // hip joint height in rig coordinates
  knee: number;     // hip -> knee joint distance
  soleY: number; soleZ: number;   // sole centre relative to the knee joint
  soleRY: number; soleRZ: number; // sole ellipsoid radii
  legDepth: number; // trouser mesh z scale between the hip and knee joints
};

export type JointAngles = {
  hips: [number, number]; knees: [number, number];
  shoulders: [number, number]; elbows: [number, number]; shoulderSpread: number;
  lean: number; headPitch: number; breath: number;
  /** Body offset that keeps the lowest sole on the floor (standing) or the hips on the seat (sitting). */
  bodyY: number;
  lying: boolean; eyesClosed: boolean;
};

type V = [number, number]; // (y, z)
const rot = (a: number, [y, z]: V): V => [y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
const scaleZ = (s: number, [y, z]: V): V => [y, z * s];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];

/**
 * Lowest point of one sole in rig coordinates for the given joint angles. Exact for the rig's
 * chain body R(lean)·S(width) → hip → leg R(hip)·S(legDepth) → knee R(knee) → sole ellipsoid.
 */
export function soleBottom(m: LegMetrics, hip: number, knee: number, lean = 0, width = 1) {
  const chain = (v: V) => rot(lean, scaleZ(width, rot(hip, scaleZ(m.legDepth, v))));
  const centre = rot(lean, scaleZ(width, add([m.hip, 0], rot(hip, scaleZ(m.legDepth, add([-m.knee, 0], rot(knee, [m.soleY, m.soleZ])))))));
  const a = chain(rot(knee, [m.soleRY, 0])), b = chain(rot(knee, [0, m.soleRZ]));
  return centre[0] - Math.hypot(a[0], b[0]);
}
export const restSole = (m: LegMetrics) => soleBottom(m, 0, 0);

const TAU = Math.PI * 2;

/** Joint angles for a pose at `timeMs`. Deterministic, so remote players animate identically. */
export function poseAngles(pose: DormAvatarPose, timeMs: number, m: LegMetrics, options: DormPoseOptions = {}, width = 1): JointAngles {
  const still = !!options.reducedMotion, t = still ? 0 : Math.max(0, timeMs) / 1000;
  const angles: JointAngles = {
    hips: [0, 0], knees: [0, 0], shoulders: [0, 0], elbows: [-0.18, -0.18], shoulderSpread: 0.085,
    lean: 0, headPitch: 0, breath: still ? 0 : Math.sin(t * TAU * 0.25), bodyY: 0, lying: false, eyesClosed: false,
  };
  const rest = restSole(m);
  const standOnFloor = () => {
    const lowest = Math.min(...[0, 1].map(i => soleBottom(m, angles.hips[i], angles.knees[i], angles.lean, width)));
    angles.bodyY = rest - lowest;
  };

  if (pose === 'idle') {
    const sway = angles.breath * 0.025;
    angles.shoulders = [sway, sway];
    standOnFloor();
  } else if (pose === 'walk' || pose === 'run') {
    const running = pose === 'run';
    // A full stride (two steps) per cycle; running is the existing 1.5x speed with longer strides.
    const swing = still ? 0 : Math.sin(t * TAU * (running ? 1.45 : 0.95)) * (running ? 0.78 : 0.5);
    angles.hips = [swing, -swing];
    angles.knees = angles.hips.map(h => Math.max(0, -h) * (running ? 1.5 : 1.2) + (running ? 0.22 : 0.04)) as [number, number];
    angles.shoulders = angles.hips.map(h => -h * 0.9) as [number, number];
    angles.elbows = running ? [-1.2, -1.2] : [-0.32, -0.32];
    angles.lean = running ? 0.13 : 0.035;
    angles.headPitch = -angles.lean * 0.7;
    angles.breath = 0;
    standOnFloor();
  } else if (pose === 'sit') {
    const seat = options.seatHeight ?? DEFAULT_SEAT_HEIGHT;
    angles.lean = -0.06; angles.headPitch = 0.05;
    angles.shoulders = [-0.42, -0.42]; angles.elbows = [-0.95, -0.95]; angles.shoulderSpread = 0.06;
    // Hips rest on the seat; thighs tilt down (up to ~35°) so the soles reach the floor.
    const seatBody = seat + THIGH_RADIUS - m.hip * Math.cos(angles.lean) + rest;
    let hip = -1.52;
    for (let candidate = -1.52; candidate <= -0.9; candidate += 0.02) {
      if (seatBody + soleBottom(m, candidate, -0.04 - candidate, angles.lean, width) - rest < 0) break;
      hip = candidate;
    }
    angles.hips = [hip, hip]; angles.knees = [-0.04 - hip, -0.04 - hip];
    // A seat lower than the shins lifts the hips just enough to keep the soles above the floor.
    const floorBody = rest - Math.min(...[0, 1].map(i => soleBottom(m, angles.hips[i], angles.knees[i], angles.lean, width)));
    angles.bodyY = Math.max(seatBody, floorBody);
  } else {
    angles.lying = true; angles.eyesClosed = true;
    angles.knees = [0.06, 0.06]; angles.shoulders = [0.05, 0.05]; angles.elbows = [-0.12, -0.12]; angles.shoulderSpread = 0.05;
    angles.breath = still ? 0 : Math.sin(t * TAU * 0.2);
  }
  return angles;
}

let motionQuery: MediaQueryList | null | undefined;
/** The viewer's reduced-motion preference (false during SSR). */
export function prefersReducedMotion() {
  if (motionQuery === undefined) {
    motionQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  }
  return !!motionQuery?.matches;
}

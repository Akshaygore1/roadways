import * as THREE from 'three';

export type RoadsideBusinessType = 'dhaba' | 'chai';
export type RoadSide = -1 | 1;

export interface RoadsideBusinessSite {
  type: RoadsideBusinessType;
  side: RoadSide;
  center: THREE.Vector3;
  orientation: THREE.Quaternion;
  localX: THREE.Vector3;
  roadDirection: THREE.Vector3;
  plateauElevation: number;
  plotWidth: number;
  plotDepth: number;
  gradingTransition: number;
}

/**
 * Returns the horizontal distance from a point to the edge of a site's flat
 * rectangular core. Points inside the core have zero distance.
 */
export const getDistanceFromPlotCore = (
  site: RoadsideBusinessSite,
  worldX: number,
  worldZ: number
): number => {
  const offsetX = worldX - site.center.x;
  const offsetZ = worldZ - site.center.z;
  const localX = offsetX * site.localX.x + offsetZ * site.localX.z;
  const localZ = offsetX * site.roadDirection.x + offsetZ * site.roadDirection.z;
  const outsideX = Math.max(Math.abs(localX) - site.plotWidth * 0.5, 0);
  const outsideZ = Math.max(Math.abs(localZ) - site.plotDepth * 0.5, 0);
  return Math.hypot(outsideX, outsideZ);
};

/**
 * Flattens the plot core and eases the surrounding grade back into the
 * unmodified engineered terrain with a smoothstep curve.
 */
export const applyRoadsidePlotHeight = (
  naturalHeight: number,
  worldX: number,
  worldZ: number,
  site: RoadsideBusinessSite | null
): number => {
  if (!site) return naturalHeight;

  const distance = getDistanceFromPlotCore(site, worldX, worldZ);
  if (distance > site.gradingTransition) return naturalHeight;

  const ratio = THREE.MathUtils.clamp(distance / site.gradingTransition, 0, 1);
  const smoothRatio = ratio * ratio * (3 - 2 * ratio);
  return THREE.MathUtils.lerp(site.plateauElevation, naturalHeight, smoothRatio);
};

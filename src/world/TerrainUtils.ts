import * as THREE from 'three';
import { CONFIG } from '../config';

export class TerrainUtils {
  /**
   * Low-frequency FBM for highway centerline grade. Filters out micro-ridges and high-frequency noise.
   */
  public static fbmHighwayGrade2D(
    x: number,
    z: number,
    noise2D: (nx: number, nz: number) => number
  ): number {
    // Large, gentle rolling landforms for highways (smooth long wavelengths)
    const qx = noise2D(x * 0.002 + 1.2, z * 0.002 + 2.8) * 16.0;
    const qz = noise2D(x * 0.002 + 5.3, z * 0.002 + 8.1) * 16.0;

    const wx = x + qx;
    const wz = z + qz;

    // Octave 1: Rolling highway hills
    let elevation = noise2D(wx * 0.0025, wz * 0.0025) * 18.0;

    // Octave 2: Gentle elevation transitions
    elevation += noise2D(wx * 0.006, wz * 0.006) * 5.0;

    return elevation;
  }

  /**
   * 4-Octave Fractional Brownian Motion (FBM) with gentle domain warping for natural rolling terrain.
   */
  public static fbmNoise2D(
    x: number,
    z: number,
    noise2D: (nx: number, nz: number) => number
  ): number {
    // Domain warp: perturb input coordinates subtly
    const qx = noise2D(x * 0.003 + 1.2, z * 0.003 + 2.8) * 22.0;
    const qz = noise2D(x * 0.003 + 5.3, z * 0.003 + 8.1) * 22.0;

    const wx = x + qx;
    const wz = z + qz;

    // Octave 1: Large rolling landforms & hills
    let elevation = noise2D(wx * 0.0035, wz * 0.0035) * 24.0;

    // Octave 2: Mid-range terrain variation & knolls
    elevation += noise2D(wx * 0.009, wz * 0.009) * 10.0;

    // Octave 3: Small ridges and undulations
    elevation += noise2D(wx * 0.022, wz * 0.022) * 4.0;

    // Octave 4: Fine surface roughness
    elevation += noise2D(wx * 0.055, wz * 0.055) * 1.2;

    // Gentle ridge definition
    const ridgeNoise = Math.abs(noise2D(wx * 0.006 + 10.0, wz * 0.006 + 30.0));
    elevation += (1.0 - ridgeNoise) * 4.5;

    return elevation;
  }

  /**
   * Calculates the natural ground elevation at (x, z) blended with the highway earthworks (cut & fill).
   * Supports 3D banked binormal and normal vectors for exact alignment with the visual road mesh.
   */
  public static getEngineeredHeight(
    worldX: number,
    worldZ: number,
    roadCenterPoint: THREE.Vector3,
    distanceFromCenter: number,
    noise2D: (nx: number, nz: number) => number,
    roadBinormal?: THREE.Vector3,
    roadNormal?: THREE.Vector3
  ): number {
    const rawTerrainY = this.fbmNoise2D(worldX, worldZ, noise2D);
    const roadY = roadCenterPoint.y;
    const absDist = Math.abs(distanceFromCenter);

    const halfRoadWidth = CONFIG.road.width * 0.5;
    const shoulderWidth = CONFIG.road.shoulderWidth;
    const roadEdge = halfRoadWidth + shoulderWidth;

    // Vector components for 3D banking and normal inclination
    const by = roadBinormal ? roadBinormal.y : 0;
    const ny = roadNormal ? roadNormal.y : 1;

    // On road: exact 3D banked road surface with parabolic camber crown (+0.06m at center)
    if (absDist <= halfRoadWidth) {
      const normalizedDist = absDist / halfRoadWidth;
      const camberHeightOffset = (1.0 - normalizedDist * normalizedDist) * 0.06;
      return roadY + by * distanceFromCenter + ny * camberHeightOffset;
    }

    // On shoulder: gentle slope down by ~0.10m matching shoulder mesh
    if (absDist <= roadEdge) {
      const shoulderRatio = (absDist - halfRoadWidth) / shoulderWidth;
      const shoulderHeightOffset = -0.04 - shoulderRatio * 0.10;
      return roadY + by * distanceFromCenter + ny * shoulderHeightOffset;
    }

    // Outside shoulder: Earthwork transition (cut or fill)
    const distPastShoulder = absDist - roadEdge;
    const shoulderEdgeSide = Math.sign(distanceFromCenter) * roadEdge;
    const shoulderEdgeY = roadY + by * shoulderEdgeSide + ny * -0.14;

    // Height difference between road shoulder edge and natural landscape
    const heightDiff = rawTerrainY - shoulderEdgeY;

    if (heightDiff < 0) {
      // Valley / Embankment condition: Fill slope down to terrain
      const fillTransitionWidth = Math.max(14.0, Math.min(55.0, Math.abs(heightDiff) * 2.2));
      const t = Math.min(1.0, distPastShoulder / fillTransitionWidth);
      const smoothT = t * t * (3.0 - 2.0 * t);
      const swaleDip = Math.sin(t * Math.PI) * -0.2 * (1.0 - t);
      return THREE.MathUtils.lerp(shoulderEdgeY, rawTerrainY, smoothT) + swaleDip;
    } else {
      // Hill / Cutting condition: Cut slope up to mountain terrain
      const cutTransitionWidth = Math.max(12.0, Math.min(45.0, heightDiff * 1.6));
      const t = Math.min(1.0, distPastShoulder / cutTransitionWidth);
      const smoothT = t * t * (3.0 - 2.0 * t);
      const drainDip = Math.sin(Math.min(1.0, t * 2.0) * Math.PI) * -0.3 * (1.0 - t);
      return THREE.MathUtils.lerp(shoulderEdgeY, rawTerrainY, smoothT) + drainDip;
    }
  }

  /**
   * Computes rich biome vertex colors for Indian landscape (NH 44):
   * - Lush Deccan green grass in low valleys and plains.
   * - Sun-baked golden savanna grass on rolling mid-slopes.
   * - Warm reddish laterite moorum soil along road verges and cuttings.
   * - Dark basalt / granite rock strata on steep cliff cuts.
   */
  public static getBiomeVertexColor(
    worldY: number,
    normalY: number,
    distFromRoad: number,
    noiseVal: number
  ): THREE.Color {
    // Slope calculation: 1.0 = completely flat horizontal ground, 0.0 = sheer vertical cliff
    const slope = Math.max(0.0, Math.min(1.0, normalY));

    // Rich Indian Deccan Landscape Colors
    const colorLushGrass = new THREE.Color(0x4d7c38);      // Fresh vibrant green
    const colorSavannaGrass = new THREE.Color(0x738739);   // Sun-warmed savanna green-yellow
    const colorRedMoorum = new THREE.Color(0x8a482b);      // Warm Indian red laterite dirt
    const colorDarkRock = new THREE.Color(0x48443e);       // Dark Deccan basalt
    const colorRockHighlight = new THREE.Color(0x6e685f);  // Weathered granite rock

    const result = new THREE.Color();

    if (slope < 0.42) {
      // Sheer cliff / cutting
      result.lerpColors(colorDarkRock, colorRockHighlight, (noiseVal + 1.0) * 0.5);
      if (slope > 0.28) {
        result.lerp(colorRedMoorum, 0.3);
      }
    } else {
      // Rolling plains and gentle hills
      const grassRatio = Math.max(0.0, Math.min(1.0, (worldY * 0.035) + noiseVal * 0.25 + 0.35));
      result.lerpColors(colorLushGrass, colorSavannaGrass, grassRatio);

      // Road verge & embankment red dirt blend
      const vergeFactor = Math.max(0.0, Math.min(1.0, (18.0 - distFromRoad) / 14.0));
      if (vergeFactor > 0.02) {
        result.lerp(colorRedMoorum, vergeFactor * 0.75);
      } else if (slope < 0.70) {
        // Exposed soil on steeper hillsides
        result.lerp(colorRedMoorum, (0.70 - slope) * 1.2);
      }
    }

    return result;
  }
}

import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { CONFIG } from '../config';
import { SplineChunk, RoadSample } from './SplineChunk';
import { TextureGenerator } from './Textures';
import { TerrainUtils } from './TerrainUtils';

export interface ClosestRoadInfo {
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  binormal: THREE.Vector3;
  normal: THREE.Vector3;
  distanceToCenter: number;
  elevation: number;
  banking: number;
  chunkIndex: number;
}

const POINTS_PER_CHUNK = 5;

export class RoadManager {
  public scene: THREE.Scene;
  public chunks: SplineChunk[] = [];
  public roadGroup: THREE.Group = new THREE.Group();
  
  private noise2D: (x: number, y: number) => number;
  private roadMaterial: THREE.MeshStandardMaterial;
  private shoulderMaterial: THREE.MeshStandardMaterial;
  private terrainMaterial: THREE.MeshStandardMaterial;
  private currentHighestChunkIndex: number = -1;

  // Global continuous control point sequence
  private controlPoints: Map<number, THREE.Vector3> = new Map();
  private controlDirections: Map<number, THREE.Vector3> = new Map();
  private lastGeneratedIndex: number = -3;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.scene.add(this.roadGroup);
    this.noise2D = createNoise2D();

    // High-fidelity Textures & Materials with Normal Maps
    const roadTex = TextureGenerator.createRoadTexture();
    const roadNorm = TextureGenerator.createRoadNormalMap();
    this.roadMaterial = new THREE.MeshStandardMaterial({
      map: roadTex,
      normalMap: roadNorm,
      normalScale: new THREE.Vector2(0.65, 0.65),
      roughness: 0.72,
      metalness: 0.08
    });

    const shoulderTex = TextureGenerator.createShoulderTexture();
    const shoulderNorm = TextureGenerator.createShoulderNormalMap();
    this.shoulderMaterial = new THREE.MeshStandardMaterial({
      map: shoulderTex,
      normalMap: shoulderNorm,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughness: 0.95,
      metalness: 0.0
    });

    // Multi-biome vertex colored terrain
    this.terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.02,
      flatShading: true
    });

    this.initControlPoints();
    this.initStartingChunks();
  }

  private initControlPoints(): void {
    const segLength = CONFIG.road.chunkLength / POINTS_PER_CHUNK;
    const startY = TerrainUtils.fbmNoise2D(0, 0, this.noise2D);
    const p0 = new THREE.Vector3(0, startY, 0);
    const d0 = new THREE.Vector3(0, 0, 1);

    this.controlPoints.set(0, p0);
    this.controlDirections.set(0, d0.clone());

    // Padding control points behind starting origin
    const pMinus1 = p0.clone().addScaledVector(d0, -segLength);
    const pMinus2 = p0.clone().addScaledVector(d0, -2 * segLength);
    this.controlPoints.set(-1, pMinus1);
    this.controlDirections.set(-1, d0.clone());
    this.controlPoints.set(-2, pMinus2);
    this.controlDirections.set(-2, d0.clone());

    this.lastGeneratedIndex = 0;
  }

  public ensureControlPoints(targetIndex: number): void {
    const segLength = CONFIG.road.chunkLength / POINTS_PER_CHUNK;

    while (this.lastGeneratedIndex < targetIndex) {
      const i = this.lastGeneratedIndex + 1;
      const prevPos = this.controlPoints.get(i - 1)!;
      const prevDir = this.controlDirections.get(i - 1)!;
      const currentDir = prevDir.clone();

      const globalProgress = i * 0.08;
      const curveNoise = this.noise2D(globalProgress * 0.55, 12.3);
      const angle = curveNoise * CONFIG.road.maxCurveAngle;

      const rot = new THREE.Matrix4().makeRotationY(angle * 0.38);
      currentDir.applyMatrix4(rot).normalize();

      const nextPos = prevPos.clone().add(currentDir.clone().multiplyScalar(segLength));

      const naturalTerrainY = TerrainUtils.fbmHighwayGrade2D(nextPos.x, nextPos.z, this.noise2D);
      const maxDeltaY = segLength * 0.045;
      const rawDeltaY = naturalTerrainY - prevPos.y;
      const clampedDeltaY = THREE.MathUtils.clamp(rawDeltaY * 0.32, -maxDeltaY, maxDeltaY);
      nextPos.y = prevPos.y + clampedDeltaY;

      this.controlPoints.set(i, nextPos);
      this.controlDirections.set(i, currentDir);
      this.lastGeneratedIndex = i;
    }
  }

  public getChunkControlPoints(chunkIndex: number): THREE.Vector3[] {
    const startIdx = chunkIndex * POINTS_PER_CHUNK - 2;
    const endIdx = (chunkIndex + 1) * POINTS_PER_CHUNK + 2;
    this.ensureControlPoints(endIdx);

    const points: THREE.Vector3[] = [];
    for (let idx = startIdx; idx <= endIdx; idx++) {
      points.push(this.controlPoints.get(idx)!);
    }
    return points;
  }

  private createChunk(chunkIndex: number): SplineChunk {
    const points = this.getChunkControlPoints(chunkIndex);
    return new SplineChunk(
      chunkIndex,
      points,
      this.noise2D,
      this.roadMaterial,
      this.shoulderMaterial,
      this.terrainMaterial
    );
  }

  private initStartingChunks(): void {
    for (let i = 0; i < CONFIG.road.activeChunksAhead + 1; i++) {
      const chunk = this.createChunk(i);
      this.chunks.push(chunk);
      this.roadGroup.add(chunk.group);
      this.currentHighestChunkIndex = i;
    }
  }

  public update(carPosition: THREE.Vector3): void {
    // Find current closest chunk
    let closestChunkIdx = 0;
    let minSqDist = Infinity;

    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      // Check distance to middle sample of chunk
      const midSample = chunk.samples[Math.floor(chunk.samples.length / 2)];
      const d = midSample.point.distanceToSquared(carPosition);
      if (d < minSqDist) {
        minSqDist = d;
        closestChunkIdx = chunk.chunkIndex;
      }
    }

    // Spawn new chunks ahead if needed
    while (this.currentHighestChunkIndex < closestChunkIdx + CONFIG.road.activeChunksAhead) {
      const newChunkIndex = this.currentHighestChunkIndex + 1;
      const newChunk = this.createChunk(newChunkIndex);

      this.chunks.push(newChunk);
      this.roadGroup.add(newChunk.group);
      this.currentHighestChunkIndex = newChunkIndex;
    }

    // Remove old chunks behind
    while (this.chunks.length > 0 && this.chunks[0].chunkIndex < closestChunkIdx - CONFIG.road.activeChunksBehind) {
      const oldChunk = this.chunks.shift()!;
      this.roadGroup.remove(oldChunk.group);
      oldChunk.dispose();
    }

    // Prune obsolete control points from memory
    const minNeededCPIndex = (closestChunkIdx - CONFIG.road.activeChunksBehind - 1) * POINTS_PER_CHUNK - 2;
    for (const key of this.controlPoints.keys()) {
      if (key < minNeededCPIndex) {
        this.controlPoints.delete(key);
        this.controlDirections.delete(key);
      }
    }
  }

  /**
   * Continuous query for the closest road point, tangent, binormal, normal, and banking.
   * Projects onto polyline segments to eliminate stair-stepping and coordinate jumps.
   */
  public getClosestRoadSample(pos: THREE.Vector3): ClosestRoadInfo {
    let bestDistSq = Infinity;
    let bestChunkIndex = 0;
    let bestSampleA: RoadSample | null = null;
    let bestSampleB: RoadSample | null = null;
    let bestT = 0;

    for (const chunk of this.chunks) {
      const samples = chunk.samples;
      const numSamples = samples.length;
      if (numSamples < 2) continue;

      for (let sIdx = 0; sIdx < numSamples - 1; sIdx++) {
        const sA = samples[sIdx];
        const sB = samples[sIdx + 1];

        const segX = sB.point.x - sA.point.x;
        const segZ = sB.point.z - sA.point.z;
        const segLenSq = segX * segX + segZ * segZ;

        if (segLenSq < 0.000001) continue;

        // Project pos onto horizontal 2D segment
        const dX = pos.x - sA.point.x;
        const dZ = pos.z - sA.point.z;
        const t = Math.max(0, Math.min(1, (dX * segX + dZ * segZ) / segLenSq));

        // Closest point on this segment
        const projX = sA.point.x + t * segX;
        const projZ = sA.point.z + t * segZ;

        const distSq = (pos.x - projX) * (pos.x - projX) + (pos.z - projZ) * (pos.z - projZ);

        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          bestChunkIndex = chunk.chunkIndex;
          bestSampleA = sA;
          bestSampleB = sB;
          bestT = t;
        }
      }
    }

    if (!bestSampleA || !bestSampleB) {
      return {
        point: new THREE.Vector3(0, 0, 0),
        tangent: new THREE.Vector3(0, 0, 1),
        binormal: new THREE.Vector3(1, 0, 0),
        normal: new THREE.Vector3(0, 1, 0),
        distanceToCenter: 0,
        elevation: 0,
        banking: 0,
        chunkIndex: 0
      };
    }

    // Continuous linear interpolation along the exact closest segment
    const point = bestSampleA.point.clone().lerp(bestSampleB.point, bestT);
    const tangent = bestSampleA.tangent.clone().lerp(bestSampleB.tangent, bestT).normalize();
    const binormal = bestSampleA.binormal.clone().lerp(bestSampleB.binormal, bestT).normalize();
    const normal = bestSampleA.normal.clone().lerp(bestSampleB.normal, bestT).normalize();
    const elevation = point.y;
    const banking = THREE.MathUtils.lerp(bestSampleA.banking, bestSampleB.banking, bestT);

    // Project vector from road center to pos onto continuous binormal
    const toPos = pos.clone().sub(point);
    const distToCenter = toPos.dot(binormal);

    return {
      point,
      tangent,
      binormal,
      normal,
      distanceToCenter: distToCenter,
      elevation,
      banking,
      chunkIndex: bestChunkIndex
    };
  }

  /**
   * Get precise ground elevation at any (x, z) matching the visual terrain and road earthworks.
   */
  public getGroundHeight(x: number, z: number): number {
    const probe = new THREE.Vector3(x, 0, z);
    const roadInfo = this.getClosestRoadSample(probe);
    return TerrainUtils.getEngineeredHeight(
      x,
      z,
      roadInfo.point,
      roadInfo.distanceToCenter,
      this.noise2D,
      roadInfo.binormal,
      roadInfo.normal
    );
  }
}

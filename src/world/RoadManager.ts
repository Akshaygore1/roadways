import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { CONFIG } from '../config';
import { SplineChunk, RoadSample } from './SplineChunk';
import { TextureGenerator } from './Textures';

export interface ClosestRoadInfo {
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  binormal: THREE.Vector3;
  distanceToCenter: number;
  elevation: number;
  chunkIndex: number;
}

export class RoadManager {
  public scene: THREE.Scene;
  public chunks: SplineChunk[] = [];
  public roadGroup: THREE.Group = new THREE.Group();
  
  private noise2D: (x: number, y: number) => number;
  private roadMaterial: THREE.MeshStandardMaterial;
  private shoulderMaterial: THREE.MeshStandardMaterial;
  private terrainMaterial: THREE.MeshStandardMaterial;
  private currentHighestChunkIndex: number = -1;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.scene.add(this.roadGroup);
    this.noise2D = createNoise2D();

    // Textures & Materials
    const roadTex = TextureGenerator.createRoadTexture();
    this.roadMaterial = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.8,
      metalness: 0.05
    });

    const shoulderTex = TextureGenerator.createShoulderTexture();
    this.shoulderMaterial = new THREE.MeshStandardMaterial({
      map: shoulderTex,
      roughness: 0.95,
      metalness: 0.0
    });

    this.terrainMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a7d42, // Deccan greenery / grass
      roughness: 0.9,
      flatShading: true
    });

    this.initStartingChunks();
  }

  private initStartingChunks(): void {
    let startPoint = new THREE.Vector3(0, 0, 0);
    let startTangent = new THREE.Vector3(0, 0, 1);

    for (let i = 0; i < CONFIG.road.activeChunksAhead + 1; i++) {
      const chunk = new SplineChunk(
        i,
        startPoint,
        startTangent,
        this.noise2D,
        this.roadMaterial,
        this.shoulderMaterial,
        this.terrainMaterial
      );

      this.chunks.push(chunk);
      this.roadGroup.add(chunk.group);
      
      startPoint = chunk.endPoint;
      startTangent = chunk.endTangent;
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
      const lastChunk = this.chunks[this.chunks.length - 1];
      const newChunkIndex = this.currentHighestChunkIndex + 1;
      
      const newChunk = new SplineChunk(
        newChunkIndex,
        lastChunk.endPoint,
        lastChunk.endTangent,
        this.noise2D,
        this.roadMaterial,
        this.shoulderMaterial,
        this.terrainMaterial
      );

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
  }

  /**
   * Fast query for the closest road sample and tangent vector to any 3D coordinate
   */
  public getClosestRoadSample(pos: THREE.Vector3): ClosestRoadInfo {
    let closestSample: RoadSample | null = null;
    let nextSample: RoadSample | null = null;
    let minSqDist = Infinity;
    let targetChunkIndex = 0;

    for (const chunk of this.chunks) {
      for (let sIdx = 0; sIdx < chunk.samples.length; sIdx++) {
        const sample = chunk.samples[sIdx];
        const dx = sample.point.x - pos.x;
        const dz = sample.point.z - pos.z;
        const d = dx * dx + dz * dz;
        if (d < minSqDist) {
          minSqDist = d;
          closestSample = sample;
          targetChunkIndex = chunk.chunkIndex;
          // Look at adjacent sample for continuous interpolation
          if (sIdx < chunk.samples.length - 1) {
            nextSample = chunk.samples[sIdx + 1];
          } else {
            nextSample = null;
          }
        }
      }
    }

    if (!closestSample && this.chunks.length > 0 && this.chunks[0].samples.length > 0) {
      closestSample = this.chunks[0].samples[0];
    }

    if (!closestSample) {
      return {
        point: new THREE.Vector3(0, 0, 0),
        tangent: new THREE.Vector3(0, 0, 1),
        binormal: new THREE.Vector3(1, 0, 0),
        distanceToCenter: 0,
        elevation: 0,
        chunkIndex: 0
      };
    }

    // Interpolate elevation between closestSample and nextSample if applicable
    let interpolatedElevation = closestSample.elevation;
    if (nextSample) {
      const segX = nextSample.point.x - closestSample.point.x;
      const segZ = nextSample.point.z - closestSample.point.z;
      const segLenSq = segX * segX + segZ * segZ;
      if (segLenSq > 0.001) {
        const t = Math.max(0, Math.min(1, ((pos.x - closestSample.point.x) * segX + (pos.z - closestSample.point.z) * segZ) / segLenSq));
        interpolatedElevation = closestSample.elevation + t * (nextSample.elevation - closestSample.elevation);
      }
    }

    // Project vector from road center to pos onto binormal
    const toPos = pos.clone().sub(closestSample.point);
    const distToCenter = toPos.dot(closestSample.binormal);

    return {
      point: closestSample.point.clone(),
      tangent: closestSample.tangent.clone(),
      binormal: closestSample.binormal.clone(),
      distanceToCenter: distToCenter,
      elevation: interpolatedElevation,
      chunkIndex: targetChunkIndex
    };
  }

  /**
   * Get approximate ground height at any (x, z)
   */
  public getGroundHeight(x: number, z: number): number {
    const probe = new THREE.Vector3(x, 0, z);
    const roadInfo = this.getClosestRoadSample(probe);
    const halfRoad = CONFIG.road.width / 2 + CONFIG.road.shoulderWidth;

    const absDist = Math.abs(roadInfo.distanceToCenter);
    if (absDist <= halfRoad) {
      return roadInfo.elevation;
    } else {
      // Off-road terrain blend
      const blend = Math.min(1, (absDist - halfRoad) / 30);
      const rawNoise = this.noise2D(x * 0.008, z * 0.008) * 18 + this.noise2D(x * 0.02, z * 0.02) * 5;
      return roadInfo.elevation * (1 - blend) + (roadInfo.elevation - 0.2 + rawNoise) * blend;
    }
  }
}

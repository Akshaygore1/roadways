import * as THREE from 'three';
import { CONFIG } from '../config';
import { TextureGenerator } from './Textures';
import { TerrainUtils } from './TerrainUtils';
import { RoadsideBusiness } from './RoadsideBusiness';
import {
  applyRoadsidePlotHeight,
  getDistanceFromPlotCore,
  RoadSide,
  RoadsideBusinessSite,
  RoadsideBusinessType
} from './RoadsidePlot';

export interface RoadSample {
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  binormal: THREE.Vector3;
  normal: THREE.Vector3;
  elevation: number;
  banking: number;     // Superelevation in radians
  curvature: number;   // Curvature kappa
}

export class SplineChunk {
  public chunkIndex: number;
  public group: THREE.Group;
  public curve: THREE.CatmullRomCurve3;
  public samples: RoadSample[] = [];
  public length: number;
  public startPoint: THREE.Vector3;
  public endPoint: THREE.Vector3;
  public startTangent: THREE.Vector3;
  public endTangent: THREE.Vector3;
  public roadsideBusinessSite: RoadsideBusinessSite | null = null;

  private roadMesh!: THREE.Mesh;
  private leftShoulderMesh!: THREE.Mesh;
  private rightShoulderMesh!: THREE.Mesh;
  private terrainMesh!: THREE.Mesh;
  private propsGroup: THREE.Group = new THREE.Group();

  constructor(
    chunkIndex: number,
    controlPoints: THREE.Vector3[],
    noise2D: (x: number, y: number) => number,
    roadMaterial: THREE.Material,
    shoulderMaterial: THREE.Material,
    terrainMaterial: THREE.Material
  ) {
    this.chunkIndex = chunkIndex;
    this.group = new THREE.Group();
    this.length = CONFIG.road.chunkLength;

    // 1. Build curve with 10 padded control points (C1/C2 continuous across all chunk boundaries)
    this.curve = new THREE.CatmullRomCurve3(controlPoints, false, 'centripetal', 0.5);

    // 2. Pre-sample spline strictly between CP_0 (u = 2/9) and CP_5 (u = 7/9)
    this.sampleSpline();

    this.startPoint = this.samples[0].point.clone();
    this.endPoint = this.samples[this.samples.length - 1].point.clone();
    this.startTangent = this.samples[0].tangent.clone();
    this.endTangent = this.samples[this.samples.length - 1].tangent.clone();
    this.roadsideBusinessSite = this.selectRoadsideBusinessSite(noise2D);

    // 3. Build engineered geometries
    this.buildRoadMesh(roadMaterial);
    this.buildShoulderMesh(shoulderMaterial);
    this.buildTerrainMesh(noise2D, terrainMaterial);
    this.buildProps(noise2D);

    this.group.add(this.propsGroup);
  }

  private sampleSpline(): void {
    const steps = CONFIG.road.segmentCount;
    this.samples = [];
    const worldUp = new THREE.Vector3(0, 1, 0);

    // With 10 control points (indices 0..9, 9 curve segments):
    // CP_0 is at index 2 (u = 2/9), CP_5 is at index 7 (u = 7/9)
    const uStart = 2.0 / 9.0;
    const uEnd = 7.0 / 9.0;
    const uSpan = uEnd - uStart; // 5/9

    for (let i = 0; i <= steps; i++) {
      const alpha = i / steps;
      const u = uStart + alpha * uSpan;

      const point = this.curve.getPoint(u);
      const tangent = this.curve.getTangent(u).normalize();

      // Instantaneous curvature kappa evaluated symmetrically
      const dt = 0.005;
      const uPrev = u - dt;
      const uNext = u + dt;
      const tanPrev = this.curve.getTangent(uPrev).normalize();
      const tanNext = this.curve.getTangent(uNext).normalize();

      // Cross product gives turning direction and magnitude
      const turnCross = new THREE.Vector3().crossVectors(tanPrev, tanNext);
      const curvature = turnCross.y / (dt * 2.0);

      // Banking angle: tilt road into corner (up to ~4.5 degrees)
      const banking = THREE.MathUtils.clamp(-curvature * 2.4, -0.075, 0.075);

      // Unbanked horizontal binormal pointing right (+X) and normal pointing UP (+Y)
      const baseBinormal = new THREE.Vector3().crossVectors(worldUp, tangent).normalize();
      const baseNormal = new THREE.Vector3().crossVectors(tangent, baseBinormal).normalize();

      // Banked binormal and normal vectors
      const cosB = Math.cos(banking);
      const sinB = Math.sin(banking);

      const binormal = baseBinormal.clone().multiplyScalar(cosB).addScaledVector(baseNormal, sinB).normalize();
      const normal = baseNormal.clone().multiplyScalar(cosB).addScaledVector(baseBinormal, -sinB).normalize();

      this.samples.push({
        point,
        tangent,
        binormal,
        normal,
        elevation: point.y,
        banking,
        curvature
      });
    }
  }

  /**
   * Builds high-fidelity 3D asphalt road mesh with camber crown (+0.06m) and edge bevel drops (-0.04m).
   */
  private buildRoadMesh(roadMat: THREE.Material): void {
    const steps = this.samples.length;
    const halfWidth = CONFIG.road.width * 0.5;

    // Cross-section offsets (lateral offset factor, height offset, u-coord)
    // 7 cross-section profile vertices per step for smooth parabolic camber and crisp bevels
    const profile = [
      { offset: -halfWidth,           heightOffset: -0.04, u: 0.00 }, // Left edge bevel bottom
      { offset: -halfWidth + 0.08,    heightOffset:  0.00, u: 0.04 }, // Left edge solid line
      { offset: -halfWidth * 0.5,     heightOffset:  0.045, u: 0.28 }, // Left wheel track
      { offset: 0.0,                  heightOffset:  0.06, u: 0.50 }, // Center crown
      { offset:  halfWidth * 0.5,     heightOffset:  0.045, u: 0.72 }, // Right wheel track
      { offset:  halfWidth - 0.08,    heightOffset:  0.00, u: 0.96 }, // Right edge solid line
      { offset:  halfWidth,           heightOffset: -0.04, u: 1.00 }  // Right edge bevel bottom
    ];

    const numCols = profile.length;
    const roadGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < steps; i++) {
      const s = this.samples[i];
      const p = s.point;
      const b = s.binormal;
      const n = s.normal;

      // Longitudinal texture repeating every 14 meters
      const vProgress = (this.chunkIndex * CONFIG.road.chunkLength + (i / steps) * CONFIG.road.chunkLength) / 14.0;

      for (let c = 0; c < numCols; c++) {
        const prof = profile[c];
        const vPos = p.clone()
          .addScaledVector(b, prof.offset)
          .addScaledVector(n, prof.heightOffset);

        positions.push(vPos.x, vPos.y, vPos.z);
        normals.push(n.x, n.y, n.z);
        uvs.push(prof.u, vProgress);
      }

      if (i < steps - 1) {
        const row = i * numCols;
        const nextRow = (i + 1) * numCols;
        for (let c = 0; c < numCols - 1; c++) {
          const a = row + c;
          const b_idx = nextRow + c;
          const d = row + c + 1;
          const c_idx = nextRow + c + 1;

          indices.push(a, b_idx, c_idx);
          indices.push(a, c_idx, d);
        }
      }
    }

    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roadGeo.setIndex(indices);
    roadGeo.computeVertexNormals();

    this.roadMesh = new THREE.Mesh(roadGeo, roadMat);
    this.roadMesh.receiveShadow = true;
    this.group.add(this.roadMesh);

    // Build retro-reflective road studs (Cat's eyes) along center line and edges
    this.buildRoadStuds();
  }

  /**
   * Adds glowing retro-reflective road studs (Amber on center line, Red on left, White on right).
   */
  private buildRoadStuds(): void {
    const studMatAmber = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      emissive: 0xff9900,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.8
    });
    const studMatRed = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      emissive: 0xcc1111,
      emissiveIntensity: 0.3,
      roughness: 0.3
    });
    const studMatWhite = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xcccccc,
      emissiveIntensity: 0.3,
      roughness: 0.3
    });

    const studGeo = new THREE.BoxGeometry(0.12, 0.03, 0.22);
    const halfWidth = CONFIG.road.width * 0.5 - 0.12;

    // Place studs every 5 spline steps (~13 meters)
    for (let i = 2; i < this.samples.length - 2; i += 5) {
      const s = this.samples[i];

      // Center Amber Stud
      const centerPos = s.point.clone().addScaledVector(s.normal, 0.065);
      const centerStud = new THREE.Mesh(studGeo, studMatAmber);
      centerStud.position.copy(centerPos);
      centerStud.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().lookAt(s.tangent, new THREE.Vector3(0, 0, 0), s.normal)
      );
      this.propsGroup.add(centerStud);

      // Left Red Stud
      const leftPos = s.point.clone().addScaledVector(s.binormal, -halfWidth).addScaledVector(s.normal, 0.015);
      const leftStud = new THREE.Mesh(studGeo, studMatRed);
      leftStud.position.copy(leftPos);
      leftStud.quaternion.copy(centerStud.quaternion);
      this.propsGroup.add(leftStud);

      // Right White Stud
      const rightPos = s.point.clone().addScaledVector(s.binormal, halfWidth).addScaledVector(s.normal, 0.015);
      const rightStud = new THREE.Mesh(studGeo, studMatWhite);
      rightStud.position.copy(rightPos);
      rightStud.quaternion.copy(centerStud.quaternion);
      this.propsGroup.add(rightStud);
    }
  }

  /**
   * Builds multi-stage roadside shoulder meshes (hard compacted gravel + soft red moorum verge).
   */
  private buildShoulderMesh(shoulderMat: THREE.Material): void {
    const steps = this.samples.length;
    const halfWidth = CONFIG.road.width * 0.5;
    const shoulderW = CONFIG.road.shoulderWidth;

    // Left shoulder geometry
    const leftGeo = new THREE.BufferGeometry();
    const leftPositions: number[] = [];
    const leftNormals: number[] = [];
    const leftUvs: number[] = [];
    const leftIndices: number[] = [];

    // Right shoulder geometry
    const rightGeo = new THREE.BufferGeometry();
    const rightPositions: number[] = [];
    const rightNormals: number[] = [];
    const rightUvs: number[] = [];
    const rightIndices: number[] = [];

    // 3 cross-section points per shoulder (road bevel bottom -> mid gravel -> outer dirt slope)
    for (let i = 0; i < steps; i++) {
      const s = this.samples[i];
      const p = s.point;
      const b = s.binormal;
      const n = s.normal;
      const vProgress = (this.chunkIndex * CONFIG.road.chunkLength + (i / steps) * CONFIG.road.chunkLength) / 6.0;

      // Left Shoulder Vertices (Inner -> Mid -> Outer)
      const l0 = p.clone().addScaledVector(b, -halfWidth).addScaledVector(n, -0.04);
      const l1 = p.clone().addScaledVector(b, -(halfWidth + shoulderW * 0.45)).addScaledVector(n, -0.07);
      const l2 = p.clone().addScaledVector(b, -(halfWidth + shoulderW)).addScaledVector(n, -0.14);

      leftPositions.push(l2.x, l2.y, l2.z, l1.x, l1.y, l1.z, l0.x, l0.y, l0.z);
      leftNormals.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
      leftUvs.push(0.0, vProgress, 0.5, vProgress, 1.0, vProgress);

      // Right Shoulder Vertices (Inner -> Mid -> Outer)
      const r0 = p.clone().addScaledVector(b, halfWidth).addScaledVector(n, -0.04);
      const r1 = p.clone().addScaledVector(b, halfWidth + shoulderW * 0.45).addScaledVector(n, -0.07);
      const r2 = p.clone().addScaledVector(b, halfWidth + shoulderW).addScaledVector(n, -0.14);

      rightPositions.push(r0.x, r0.y, r0.z, r1.x, r1.y, r1.z, r2.x, r2.y, r2.z);
      rightNormals.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
      rightUvs.push(0.0, vProgress, 0.5, vProgress, 1.0, vProgress);

      if (i < steps - 1) {
        const row = i * 3;
        const nextRow = (i + 1) * 3;

        // Left quads (2 quad columns)
        for (let c = 0; c < 2; c++) {
          const a = row + c;
          const b_idx = nextRow + c;
          const d = row + c + 1;
          const c_idx = nextRow + c + 1;
          leftIndices.push(a, b_idx, c_idx, a, c_idx, d);
        }

        // Right quads (2 quad columns)
        for (let c = 0; c < 2; c++) {
          const a = row + c;
          const b_idx = nextRow + c;
          const d = row + c + 1;
          const c_idx = nextRow + c + 1;
          rightIndices.push(a, b_idx, c_idx, a, c_idx, d);
        }
      }
    }

    leftGeo.setAttribute('position', new THREE.Float32BufferAttribute(leftPositions, 3));
    leftGeo.setAttribute('normal', new THREE.Float32BufferAttribute(leftNormals, 3));
    leftGeo.setAttribute('uv', new THREE.Float32BufferAttribute(leftUvs, 2));
    leftGeo.setIndex(leftIndices);
    leftGeo.computeVertexNormals();

    this.leftShoulderMesh = new THREE.Mesh(leftGeo, shoulderMat);
    this.leftShoulderMesh.receiveShadow = true;
    this.group.add(this.leftShoulderMesh);

    rightGeo.setAttribute('position', new THREE.Float32BufferAttribute(rightPositions, 3));
    rightGeo.setAttribute('normal', new THREE.Float32BufferAttribute(rightNormals, 3));
    rightGeo.setAttribute('uv', new THREE.Float32BufferAttribute(rightUvs, 2));
    rightGeo.setIndex(rightIndices);
    rightGeo.computeVertexNormals();

    this.rightShoulderMesh = new THREE.Mesh(rightGeo, shoulderMat);
    this.rightShoulderMesh.receiveShadow = true;
    this.group.add(this.rightShoulderMesh);
  }

  /**
   * Builds a high-resolution landscape mesh with 4-octave FBM noise,
   * engineered cut-and-fill slopes, and multi-biome vertex colors.
   */
  private buildTerrainMesh(noise2D: (x: number, y: number) => number, terrainMat: THREE.Material): void {
    const terrainSamples = this.getTerrainSamples();
    const steps = terrainSamples.length;
    const terrainWidth = 320; // 320m expansive terrain on both sides
    const site = this.roadsideBusinessSite;
    // Plot boundary columns replace generic columns so business chunks retain
    // approximately the same vertex budget as ordinary terrain chunks.
    const terrainCols = site ? 17 : 20;

    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const halfRoad = CONFIG.road.width * 0.5 + CONFIG.road.shoulderWidth;

    // Precalculate non-linear column lateral distances (dense near road, wider far out).
    // Site boundary columns prevent interpolation from cutting beneath a flat plot edge.
    const basePositiveDistances: number[] = [];

    for (let c = 0; c <= terrainCols; c++) {
      const u = c / terrainCols;
      // Non-linear power distribution u^1.7 gives dense roadside berms and expansive distant hills
      const dist = halfRoad + Math.pow(u, 1.7) * (terrainWidth - halfRoad);
      basePositiveDistances.push(dist);
    }

    const leftPositiveDistances = [...basePositiveDistances];
    const rightPositiveDistances = [...basePositiveDistances];
    if (site) {
      const centerDistance = halfRoad + CONFIG.roadside[site.type].setback;
      const halfPlotDepth = site.plotDepth * 0.5;
      const siteDistances = site.side === 1 ? rightPositiveDistances : leftPositiveDistances;
      siteDistances.push(
        centerDistance - halfPlotDepth,
        centerDistance,
        centerDistance + halfPlotDepth,
        centerDistance + halfPlotDepth + site.gradingTransition
      );
    }

    const sortUniqueDistances = (distances: number[]): number[] => {
      distances.sort((a, b) => a - b);
      return distances.filter(
        (distance, index) => index === 0 || Math.abs(distance - distances[index - 1]) > 0.01
      );
    };
    const rightDistances = sortUniqueDistances(rightPositiveDistances);
    const leftDistances = sortUniqueDistances(leftPositiveDistances)
      .map((distance) => -distance)
      .reverse();
    const leftColumnCount = leftDistances.length;
    const rightColumnCount = rightDistances.length;
    const totalColumnCount = leftColumnCount + rightColumnCount;

    for (let i = 0; i < steps; i++) {
      const s = terrainSamples[i];
      const p = s.point;
      const b = s.binormal;
      const n = s.normal;

      // 1. Left Terrain Strip (from -terrainWidth inwards to -halfRoad)
      for (let c = 0; c < leftColumnCount; c++) {
        const dist = leftDistances[c];
        const pt = p.clone().addScaledVector(b, dist);
        
        // At innermost column bordering shoulder, match shoulder outer edge normal offset
        if (c === leftColumnCount - 1) {
          pt.addScaledVector(n, -0.14);
        }

        // Calculate ground elevation using cut-and-fill FBM model with 3D banking
        pt.y = this.getPreparedTerrainHeight(pt, s, dist, noise2D);

        positions.push(pt.x, pt.y, pt.z);
        normals.push(0, 1, 0); // Will be recalculated by computeVertexNormals
        uvs.push(pt.x * 0.035, pt.z * 0.035);

        // Biome vertex coloring
        const noiseVal = noise2D(pt.x * 0.015, pt.z * 0.015);
        const col = TerrainUtils.getBiomeVertexColor(pt.y, 0.9, Math.abs(dist), noiseVal);
        colors.push(col.r, col.g, col.b);
      }

      // 2. Right Terrain Strip (from +halfRoad outwards to +terrainWidth)
      for (let c = 0; c < rightColumnCount; c++) {
        const dist = rightDistances[c];
        const pt = p.clone().addScaledVector(b, dist);

        // At innermost column bordering shoulder, match shoulder outer edge normal offset
        if (c === 0) {
          pt.addScaledVector(n, -0.14);
        }

        pt.y = this.getPreparedTerrainHeight(pt, s, dist, noise2D);

        positions.push(pt.x, pt.y, pt.z);
        normals.push(0, 1, 0);
        uvs.push(pt.x * 0.035, pt.z * 0.035);

        const noiseVal = noise2D(pt.x * 0.015, pt.z * 0.015);
        const col = TerrainUtils.getBiomeVertexColor(pt.y, 0.9, Math.abs(dist), noiseVal);
        colors.push(col.r, col.g, col.b);
      }

      if (i < steps - 1) {
        const row = i * totalColumnCount;
        const nextRow = (i + 1) * totalColumnCount;

        // Left strip quads
        for (let c = 0; c < leftColumnCount - 1; c++) {
          const a = row + c;
          const d = row + c + 1;
          const c_idx = nextRow + c + 1;
          const b_idx = nextRow + c;
          indices.push(a, b_idx, c_idx, a, c_idx, d);
        }

        // Right strip quads
        const offset = leftColumnCount;
        for (let c = 0; c < rightColumnCount - 1; c++) {
          const a = row + offset + c;
          const d = row + offset + c + 1;
          const c_idx = nextRow + offset + c + 1;
          const b_idx = nextRow + offset + c;
          indices.push(a, b_idx, c_idx, a, c_idx, d);
        }
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    // Recompute vertex colors using true surface normals for rich slope detection
    const normAttr = geo.getAttribute('normal');
    const colorAttr = geo.getAttribute('color');
    for (let idx = 0; idx < positions.length / 3; idx++) {
      const px = positions[idx * 3];
      const py = positions[idx * 3 + 1];
      const pz = positions[idx * 3 + 2];
      const ny = normAttr.getY(idx);

      // Find approximate distance to road center
      const s = terrainSamples[Math.min(steps - 1, Math.floor(idx / totalColumnCount))];
      const dist = s.point.distanceTo(new THREE.Vector3(px, py, pz));
      const noiseVal = noise2D(px * 0.015, pz * 0.015);

      const col = TerrainUtils.getBiomeVertexColor(py, ny, dist, noiseVal);
      colorAttr.setXYZ(idx, col.r, col.g, col.b);
    }

    this.terrainMesh = new THREE.Mesh(geo, terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.group.add(this.terrainMesh);
  }

  private getTerrainSamples(): RoadSample[] {
    const site = this.roadsideBusinessSite;
    if (!site) return this.samples;

    const samplesWithProgress = this.samples.map((sample, index) => ({
      progress: index,
      sample
    }));
    const halfPlotWidth = site.plotWidth * 0.5;
    const boundaryOffsets = [
      -halfPlotWidth - site.gradingTransition,
      -halfPlotWidth,
      halfPlotWidth,
      halfPlotWidth + site.gradingTransition
    ];

    for (const boundaryOffset of boundaryOffsets) {
      for (let index = 0; index < this.samples.length - 1; index++) {
        const start = this.samples[index];
        const end = this.samples[index + 1];
        const startOffset = start.point.clone().sub(site.center).dot(site.localX);
        const endOffset = end.point.clone().sub(site.center).dot(site.localX);
        if ((boundaryOffset - startOffset) * (boundaryOffset - endOffset) > 0) continue;

        const offsetSpan = endOffset - startOffset;
        if (Math.abs(offsetSpan) < 0.0001) break;
        const ratio = THREE.MathUtils.clamp(
          (boundaryOffset - startOffset) / offsetSpan,
          0,
          1
        );
        if (ratio > 0.001 && ratio < 0.999) {
          samplesWithProgress.push({
            progress: index + ratio,
            sample: this.interpolateRoadSample(start, end, ratio)
          });
        }
        break;
      }
    }

    samplesWithProgress.sort((a, b) => a.progress - b.progress);
    return samplesWithProgress
      .filter((entry, index) => (
        index === 0 || Math.abs(entry.progress - samplesWithProgress[index - 1].progress) > 0.0001
      ))
      .map((entry) => entry.sample);
  }

  private interpolateRoadSample(start: RoadSample, end: RoadSample, ratio: number): RoadSample {
    const point = start.point.clone().lerp(end.point, ratio);
    return {
      point,
      tangent: start.tangent.clone().lerp(end.tangent, ratio).normalize(),
      binormal: start.binormal.clone().lerp(end.binormal, ratio).normalize(),
      normal: start.normal.clone().lerp(end.normal, ratio).normalize(),
      elevation: point.y,
      banking: THREE.MathUtils.lerp(start.banking, end.banking, ratio),
      curvature: THREE.MathUtils.lerp(start.curvature, end.curvature, ratio)
    };
  }

  private getPreparedTerrainHeight(
    point: THREE.Vector3,
    roadSample: RoadSample,
    distanceFromCenter: number,
    noise2D: (x: number, y: number) => number
  ): number {
    const naturalHeight = TerrainUtils.getEngineeredHeight(
      point.x,
      point.z,
      roadSample.point,
      distanceFromCenter,
      noise2D,
      roadSample.binormal,
      roadSample.normal
    );
    return applyRoadsidePlotHeight(
      naturalHeight,
      point.x,
      point.z,
      this.roadsideBusinessSite
    );
  }

  /**
   * Places highway infrastructure (W-beam guardrails, signs, milestones) and authentic Indian flora.
   */
  private buildProps(noise2D: (x: number, y: number) => number): void {
    const halfRoad = CONFIG.road.width * 0.5 + CONFIG.road.shoulderWidth + 0.3;
    const kmNumber = (this.chunkIndex * 2) + 12;

    // 1. Milestone every chunk
    const milestoneSampleIdx = Math.floor(this.samples.length * 0.35);
    const msSample = this.samples[milestoneSampleIdx];
    const msPos = msSample.point.clone().addScaledVector(msSample.binormal, halfRoad + 0.8);
    const milestone = this.createMilestoneMesh(kmNumber);
    milestone.position.copy(msPos);
    milestone.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().lookAt(msSample.tangent, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0))
    );
    this.propsGroup.add(milestone);

    // 2. Highway Caution Signs on curves
    const hasCurve = Math.abs(msSample.curvature) > 0.008;
    if (hasCurve) {
      const signIdx = Math.max(2, milestoneSampleIdx - 12);
      const signSample = this.samples[signIdx];
      const signSide = signSample.curvature > 0 ? 1 : -1;
      const signPos = signSample.point.clone().addScaledVector(signSample.binormal, signSide * (halfRoad + 1.2));
      const signType = signSample.curvature > 0 ? 'curve_right' : 'curve_left';
      const signMesh = this.createHighwaySignMesh(signType);
      signMesh.position.copy(signPos);
      signMesh.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().lookAt(signSample.tangent, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0))
      );
      this.propsGroup.add(signMesh);
    }

    // 3. W-Beam Metal Guardrails along sharp curves or steep drop-offs
    this.buildGuardrails();

    // 4. Roadside dhabas and chai stalls on quieter, guardrail-free verges
    const businessSite = this.roadsideBusinessSite;
    this.buildRoadsideBusiness(businessSite);

    // 5. Diverse Indian Roadside Trees (Gulmohar, Banyan, Neem, Palm)
    for (let i = 3; i < this.samples.length - 3; i += 4) {
      const s = this.samples[i];
      const side = (i % 8 === 0) ? -1 : 1;
      const lateralDist = halfRoad + 4.5 + (i % 5) * 4.2;
      const treePos = s.point.clone().addScaledVector(s.binormal, side * lateralDist);
      if (this.isInsideBusinessClearance(businessSite, treePos.x, treePos.z, 2.5)) continue;

      // Height on terrain
      treePos.y = TerrainUtils.getEngineeredHeight(treePos.x, treePos.z, s.point, side * lateralDist, noise2D, s.binormal, s.normal);

      const treeType = (i % 4 === 0) ? 'gulmohar' : (i % 4 === 1 ? 'banyan' : (i % 4 === 2 ? 'palm' : 'neem'));
      const tree = this.createRealisticTree(treeType, i);
      tree.position.copy(treePos);
      tree.rotation.y = (i * 2.37);
      const scale = 0.85 + (i % 5) * 0.18;
      tree.scale.set(scale, scale, scale);
      this.propsGroup.add(tree);
    }

    // 6. Roadside Bush Clusters & Rock Boulders
    for (let i = 2; i < this.samples.length - 2; i += 3) {
      const s = this.samples[i];
      const side = (i % 2 === 0) ? -1 : 1;
      const dist = halfRoad + 1.6 + ((i * 3) % 4) * 2.2;
      const propPos = s.point.clone().addScaledVector(s.binormal, side * dist);
      if (this.isInsideBusinessClearance(businessSite, propPos.x, propPos.z, 1.5)) continue;
      propPos.y = TerrainUtils.getEngineeredHeight(propPos.x, propPos.z, s.point, side * dist, noise2D, s.binormal, s.normal);

      if (i % 3 === 0) {
        // Flowering Bougainvillea / Lantana Bush
        const bush = this.createFloweringBush(i);
        bush.position.copy(propPos);
        bush.rotation.y = i * 1.4;
        this.propsGroup.add(bush);
      } else {
        // Granite Boulder
        const boulder = this.createGraniteBoulder(i);
        boulder.position.copy(propPos);
        boulder.rotation.set(i * 0.5, i * 1.1, i * 0.3);
        this.propsGroup.add(boulder);
      }
    }
  }

  private selectRoadsideBusinessSite(
    noise2D: (x: number, y: number) => number
  ): RoadsideBusinessSite | null {
    const businessTypes: RoadsideBusinessType[] = ['dhaba', 'chai'];
    const type = businessTypes.find((candidate) => {
      const businessConfig = CONFIG.roadside[candidate];
      return this.chunkIndex % businessConfig.chunkInterval === businessConfig.chunkPhase;
    });

    if (!type) return null;

    const businessConfig = CONFIG.roadside[type];
    const sampleIndex = Math.floor(this.samples.length * businessConfig.sampleFraction);
    const sample = this.samples[sampleIndex];

    // Prefer the inside of a bend to avoid guardrails; alternate sides on straights.
    const side: RoadSide = Math.abs(sample.curvature) > CONFIG.roadside.curveSideThreshold
      ? (sample.curvature > 0 ? 1 : -1)
      : (this.chunkIndex % 2 === 0 ? -1 : 1);
    const shoulderEdge = CONFIG.road.width * 0.5 + CONFIG.road.shoulderWidth;
    const lateralDistance = shoulderEdge + businessConfig.setback;
    const businessPosition = sample.point.clone().addScaledVector(
      sample.binormal,
      side * lateralDistance
    );
    businessPosition.y = TerrainUtils.getEngineeredHeight(
      businessPosition.x,
      businessPosition.z,
      sample.point,
      side * lateralDistance,
      noise2D,
      sample.binormal,
      sample.normal
    );

    const towardRoad = sample.binormal.clone().multiplyScalar(-side);
    towardRoad.y = 0;
    towardRoad.normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const localX = new THREE.Vector3().crossVectors(worldUp, towardRoad).normalize();
    const localY = new THREE.Vector3().crossVectors(towardRoad, localX).normalize();
    const orientation = new THREE.Matrix4().makeBasis(localX, localY, towardRoad);

    return {
      type,
      side,
      center: businessPosition,
      orientation: new THREE.Quaternion().setFromRotationMatrix(orientation),
      localX,
      roadDirection: towardRoad,
      plateauElevation: businessPosition.y,
      plotWidth: businessConfig.plotWidth,
      plotDepth: businessConfig.plotDepth,
      gradingTransition: businessConfig.gradingTransition
    };
  }

  private buildRoadsideBusiness(site: RoadsideBusinessSite | null): void {
    if (!site) return;

    const business = RoadsideBusiness.create(site.type, this.chunkIndex);
    business.position.copy(site.center);
    business.quaternion.copy(site.orientation);
    this.propsGroup.add(business);
  }

  private isInsideBusinessClearance(
    site: RoadsideBusinessSite | null,
    worldX: number,
    worldZ: number,
    margin: number
  ): boolean {
    if (!site) return false;
    return getDistanceFromPlotCore(site, worldX, worldZ) <= site.gradingTransition + margin;
  }

  /**
   * Generates continuous galvanized steel W-beam guardrails with reflective tabs on outer curves.
   */
  private buildGuardrails(): void {
    const halfRoad = CONFIG.road.width * 0.5 + CONFIG.road.shoulderWidth - 0.15;
    const railMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createGuardrailTexture(),
      roughness: 0.45,
      metalness: 0.8
    });
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x6e757d,
      roughness: 0.6,
      metalness: 0.7
    });

    const postGeo = new THREE.BoxGeometry(0.12, 0.85, 0.12);

    // Identify sections with notable curve or embankment
    let inGuardrail = false;
    let guardrailStart = 0;
    let guardrailSide = 1;

    for (let i = 0; i < this.samples.length; i++) {
      const s = this.samples[i];
      const needsRail = Math.abs(s.curvature) > 0.0065;
      const side = s.curvature > 0 ? -1 : 1; // Outer side of curve

      if (needsRail && !inGuardrail) {
        inGuardrail = true;
        guardrailStart = Math.max(0, i - 2);
        guardrailSide = side;
      } else if (!needsRail && inGuardrail && (i - guardrailStart > 8)) {
        inGuardrail = false;
        this.generateRailRibbon(guardrailStart, i, guardrailSide, halfRoad, railMat, postMat, postGeo);
      }
    }

    if (inGuardrail) {
      this.generateRailRibbon(guardrailStart, this.samples.length - 1, guardrailSide, halfRoad, railMat, postMat, postGeo);
    }
  }

  private generateRailRibbon(
    startIdx: number,
    endIdx: number,
    side: number,
    lateralDist: number,
    railMat: THREE.Material,
    postMat: THREE.Material,
    postGeo: THREE.BufferGeometry
  ): void {
    const count = endIdx - startIdx + 1;
    if (count < 2) return;

    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const railHeight = 0.35;
    const railElevation = 0.55;

    for (let j = 0; j < count; j++) {
      const s = this.samples[startIdx + j];
      const b = s.binormal;
      const n = s.normal;
      const basePos = s.point.clone().addScaledVector(b, side * lateralDist);

      const topPos = basePos.clone().addScaledVector(n, railElevation + railHeight * 0.5);
      const botPos = basePos.clone().addScaledVector(n, railElevation - railHeight * 0.5);

      positions.push(topPos.x, topPos.y, topPos.z);
      positions.push(botPos.x, botPos.y, botPos.z);

      normals.push(-b.x * side, 0.1, -b.z * side);
      normals.push(-b.x * side, 0.1, -b.z * side);

      const globalSampleIdx = this.chunkIndex * (this.samples.length - 1) + (startIdx + j);
      const uProgress = globalSampleIdx / 4.0;
      uvs.push(uProgress, 0.0, uProgress, 1.0);

      if (j < count - 1) {
        const row = j * 2;
        indices.push(row, row + 1, row + 2);
        indices.push(row + 1, row + 3, row + 2);
      }

      // Spawn steel post every 3 steps
      if (j % 3 === 0) {
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.copy(basePos).addScaledVector(n, railElevation * 0.5);
        this.propsGroup.add(post);
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);

    const railMesh = new THREE.Mesh(geo, railMat);
    railMesh.castShadow = true;
    this.propsGroup.add(railMesh);
  }

  private createHighwaySignMesh(type: 'curve_left' | 'curve_right' | 'ghat' | 'speed_60' | 'go_slow'): THREE.Group {
    const group = new THREE.Group();

    // Steel pole
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x555c66, roughness: 0.6, metalness: 0.8 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8), poleMat);
    pole.position.y = 1.4;
    pole.castShadow = true;
    group.add(pole);

    // Signboard diamond panel
    const signMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createRoadSignTexture(type),
      roughness: 0.4
    });
    const signPanel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.04), signMat);
    signPanel.position.y = 2.4;
    signPanel.rotation.z = Math.PI * 0.25; // Diamond orientation
    signPanel.castShadow = true;
    group.add(signPanel);

    return group;
  }

  private createMilestoneMesh(km: number): THREE.Group {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createMilestoneTexture(km, 'NH 44'),
      roughness: 0.85
    });

    const baseGeo = new THREE.BoxGeometry(0.8, 1.2, 0.4);
    const baseMesh = new THREE.Mesh(baseGeo, stoneMat);
    baseMesh.position.y = 0.6;
    baseMesh.castShadow = true;
    group.add(baseMesh);

    const topGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16);
    topGeo.rotateZ(Math.PI / 2);
    const topMesh = new THREE.Mesh(topGeo, stoneMat);
    topMesh.position.y = 1.2;
    topMesh.castShadow = true;
    group.add(topMesh);

    return group;
  }

  /**
   * Creates realistic Indian trees: Gulmohar, Banyan (with aerial roots), Neem, and Date Palms.
   */
  private createRealisticTree(type: 'gulmohar' | 'banyan' | 'neem' | 'palm', seed: number): THREE.Group {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x422f20, roughness: 0.92 });

    const heightVar = (seed % 3) * 0.4;
    if (type === 'palm') {
      // Slender ridged trunk
      const trunkH = 7.5 + heightVar;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, trunkH, 7), trunkMat);
      trunk.position.y = trunkH * 0.5;
      trunk.castShadow = true;
      group.add(trunk);

      // Radial Palm Fronds
      const frondMat = new THREE.MeshStandardMaterial({ color: 0x2e6b2c, roughness: 0.7, flatShading: true });
      const numFronds = 9;
      for (let f = 0; f < numFronds; f++) {
        const frondAngle = (f / numFronds) * Math.PI * 2;
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.2, 4), frondMat);
        frond.position.set(0, trunkH - 0.2, 0);
        frond.rotation.y = frondAngle;
        frond.rotation.x = 0.9;
        frond.castShadow = true;
        group.add(frond);
      }
    } else if (type === 'gulmohar') {
      // Umbrella-shaped blooming orange-red crown
      const trunkH = 5.2 + heightVar;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.65, trunkH, 8), trunkMat);
      trunk.position.y = trunkH * 0.5;
      trunk.castShadow = true;
      group.add(trunk);

      const bloomMat = new THREE.MeshStandardMaterial({
        color: 0xe03a18, // Vibrant Indian red-orange Gulmohar blossoms
        roughness: 0.7,
        flatShading: true
      });

      // Sprawling umbrella crown clusters
      const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2, 1), bloomMat);
      crown1.position.set(0, trunkH + 1.4, 0);
      crown1.scale.set(1.6, 0.65, 1.6);
      crown1.castShadow = true;
      group.add(crown1);

      const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4, 1), bloomMat);
      crown2.position.set(1.4, trunkH + 1.1, 0.8);
      crown2.scale.set(1.3, 0.6, 1.3);
      crown2.castShadow = true;
      group.add(crown2);

    } else if (type === 'banyan') {
      // Grand sprawling Banyan tree with aerial prop root pillars
      const trunkH = 5.8;
      const mainTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.1, trunkH, 8), trunkMat);
      mainTrunk.position.y = trunkH * 0.5;
      mainTrunk.castShadow = true;
      group.add(mainTrunk);

      // Aerial prop roots descending from branches
      const rootPositions = [
        [-2.0, 1.5], [2.2, -1.2], [-1.4, -2.2], [1.8, 1.9]
      ];
      for (const [rx, rz] of rootPositions) {
        const root = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, trunkH, 5), trunkMat);
        root.position.set(rx, trunkH * 0.5, rz);
        root.castShadow = true;
        group.add(root);
      }

      const foliageMat = new THREE.MeshStandardMaterial({
        color: 0x1d4d22, // Deep ancient lush green
        roughness: 0.75,
        flatShading: true
      });

      const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(4.6, 1), foliageMat);
      canopy.position.set(0, trunkH + 1.8, 0);
      canopy.scale.set(2.1, 0.75, 2.1);
      canopy.castShadow = true;
      group.add(canopy);

    } else {
      // Tiered Neem tree
      const trunkH = 4.8;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.55, trunkH, 7), trunkMat);
      trunk.position.y = trunkH * 0.5;
      trunk.castShadow = true;
      group.add(trunk);

      const neemMat = new THREE.MeshStandardMaterial({
        color: 0x367a30,
        roughness: 0.75,
        flatShading: true
      });

      const tier1 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.6, 1), neemMat);
      tier1.position.y = trunkH + 1.2;
      tier1.castShadow = true;
      group.add(tier1);

      const tier2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.9, 1), neemMat);
      tier2.position.y = trunkH + 2.6;
      tier2.castShadow = true;
      group.add(tier2);
    }

    return group;
  }

  private createFloweringBush(seed: number): THREE.Group {
    const group = new THREE.Group();
    const colors = [0xd62828, 0xf77f00, 0xfcbf49, 0x4f772d];
    const bushColor = colors[seed % colors.length];

    const mat = new THREE.MeshStandardMaterial({
      color: bushColor,
      roughness: 0.8,
      flatShading: true
    });

    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75 + (seed % 3) * 0.25, 1), mat);
    bush.position.y = 0.5;
    bush.scale.set(1.4, 0.8, 1.2);
    bush.castShadow = true;
    group.add(bush);

    return group;
  }

  private createGraniteBoulder(seed: number): THREE.Mesh {
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x5c5750,
      roughness: 0.9,
      flatShading: true
    });

    const scale = 0.6 + (seed % 4) * 0.35;
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(scale, 0), rockMat);
    boulder.position.y = scale * 0.55;
    boulder.scale.set(1.3, 0.75, 1.1);
    boulder.castShadow = true;
    return boulder;
  }

  public dispose(): void {
    const disposedMaterials = new Set<THREE.Material>();
    const disposedTextures = new Set<THREE.Texture>();

    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });

    // Road, shoulder, and terrain materials are shared by RoadManager. Prop
    // materials are chunk-owned and must be released when scenery is recycled.
    this.propsGroup.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const material of materials) {
        if (disposedMaterials.has(material)) continue;
        disposedMaterials.add(material);

        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture && !disposedTextures.has(value)) {
            disposedTextures.add(value);
            value.dispose();
          }
        }
        material.dispose();
      }
    });
  }
}

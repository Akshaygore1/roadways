import * as THREE from 'three';
import { CONFIG } from '../config';
import { TextureGenerator } from './Textures';

export interface RoadSample {
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  binormal: THREE.Vector3;
  elevation: number;
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

  private roadMesh!: THREE.Mesh;
  private leftShoulderMesh!: THREE.Mesh;
  private rightShoulderMesh!: THREE.Mesh;
  private terrainMesh!: THREE.Mesh;
  private propsGroup: THREE.Group = new THREE.Group();

  constructor(
    chunkIndex: number,
    startPoint: THREE.Vector3,
    startTangent: THREE.Vector3,
    noise2D: (x: number, y: number) => number,
    roadMaterial: THREE.Material,
    shoulderMaterial: THREE.Material,
    terrainMaterial: THREE.Material
  ) {
    this.chunkIndex = chunkIndex;
    this.startPoint = startPoint.clone();
    this.startTangent = startTangent.clone().normalize();
    this.group = new THREE.Group();
    this.length = CONFIG.road.chunkLength;

    // 1. Generate spline control points
    const controlPoints = this.generateControlPoints(noise2D);
    this.curve = new THREE.CatmullRomCurve3(controlPoints, false, 'centripetal', 0.5);

    this.endPoint = controlPoints[controlPoints.length - 1].clone();
    this.endTangent = this.curve.getTangent(1.0).normalize();

    // 2. Pre-sample spline
    this.sampleSpline();

    // 3. Build geometries
    this.buildRoadMesh(roadMaterial, shoulderMaterial);
    this.buildTerrainMesh(noise2D, terrainMaterial);
    this.buildProps();

    this.group.add(this.propsGroup);
  }

  private generateControlPoints(noise2D: (x: number, y: number) => number): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const numPoints = 6;
    const segLength = this.length / (numPoints - 1);

    let currentPos = this.startPoint.clone();
    let currentDir = this.startTangent.clone();
    points.push(currentPos.clone());

    for (let i = 1; i < numPoints; i++) {
      const globalProgress = (this.chunkIndex * (numPoints - 1) + i) * 0.08;
      
      // Horizontal curvature from noise
      const curveNoise = noise2D(globalProgress * 0.6, 10.5);
      const angle = curveNoise * CONFIG.road.maxCurveAngle;
      
      // Rotate direction slightly
      const rot = new THREE.Matrix4().makeRotationY(angle * 0.4);
      currentDir.applyMatrix4(rot).normalize();

      // Elevation variation from secondary noise
      const elevNoise = noise2D(globalProgress * 0.4, 42.0);
      const targetY = (elevNoise * CONFIG.road.maxElevationChange) + Math.sin(globalProgress * 0.3) * 2.5;

      const nextPos = currentPos.clone().add(currentDir.clone().multiplyScalar(segLength));
      nextPos.y = targetY;

      points.push(nextPos);
      currentPos = nextPos;
    }

    return points;
  }

  private sampleSpline(): void {
    const steps = CONFIG.road.segmentCount;
    this.samples = [];
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = this.curve.getPoint(t);
      const tangent = this.curve.getTangent(t).normalize();
      
      // Binormal is perpendicular to tangent and world up
      const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      this.samples.push({
        point,
        tangent,
        binormal,
        elevation: point.y
      });
    }
  }

  private buildRoadMesh(roadMat: THREE.Material, shoulderMat: THREE.Material): void {
    const steps = this.samples.length;
    const halfWidth = CONFIG.road.width / 2;
    const shoulderW = CONFIG.road.shoulderWidth;

    // --- Main Asphalt Road ---
    const roadGeo = new THREE.BufferGeometry();
    const roadPositions: number[] = [];
    const roadNormals: number[] = [];
    const roadUvs: number[] = [];
    const roadIndices: number[] = [];

    // --- Left & Right Shoulders ---
    const leftShoulderGeo = new THREE.BufferGeometry();
    const leftPositions: number[] = [];
    const leftNormals: number[] = [];
    const leftUvs: number[] = [];
    const leftIndices: number[] = [];

    const rightShoulderGeo = new THREE.BufferGeometry();
    const rightPositions: number[] = [];
    const rightNormals: number[] = [];
    const rightUvs: number[] = [];
    const rightIndices: number[] = [];

    for (let i = 0; i < steps; i++) {
      const s = this.samples[i];
      const p = s.point;
      const b = s.binormal;
      const vProgress = (this.chunkIndex * CONFIG.road.chunkLength + (i / steps) * CONFIG.road.chunkLength) / 12.0;

      // Road edge vertices
      const leftRoad = p.clone().addScaledVector(b, -halfWidth);
      const rightRoad = p.clone().addScaledVector(b, halfWidth);

      // Shoulder outer vertices (slight slope down by 0.15m)
      const leftShoulderOuter = p.clone().addScaledVector(b, -(halfWidth + shoulderW)).add(new THREE.Vector3(0, -0.15, 0));
      const rightShoulderOuter = p.clone().addScaledVector(b, halfWidth + shoulderW).add(new THREE.Vector3(0, -0.15, 0));

      // Road vertices
      roadPositions.push(leftRoad.x, leftRoad.y, leftRoad.z);
      roadPositions.push(rightRoad.x, rightRoad.y, rightRoad.z);
      roadNormals.push(0, 1, 0, 0, 1, 0);
      roadUvs.push(0, vProgress, 1, vProgress);

      // Left shoulder vertices
      leftPositions.push(leftShoulderOuter.x, leftShoulderOuter.y, leftShoulderOuter.z);
      leftPositions.push(leftRoad.x, leftRoad.y, leftRoad.z);
      leftNormals.push(0, 1, 0, 0, 1, 0);
      leftUvs.push(0, vProgress, 1, vProgress);

      // Right shoulder vertices
      rightPositions.push(rightRoad.x, rightRoad.y, rightRoad.z);
      rightPositions.push(rightShoulderOuter.x, rightShoulderOuter.y, rightShoulderOuter.z);
      rightNormals.push(0, 1, 0, 0, 1, 0);
      rightUvs.push(0, vProgress, 1, vProgress);

      if (i < steps - 1) {
        const row = i * 2;
        // Road indices
        roadIndices.push(row, row + 1, row + 2);
        roadIndices.push(row + 1, row + 3, row + 2);

        // Left shoulder indices
        leftIndices.push(row, row + 1, row + 2);
        leftIndices.push(row + 1, row + 3, row + 2);

        // Right shoulder indices
        rightIndices.push(row, row + 1, row + 2);
        rightIndices.push(row + 1, row + 3, row + 2);
      }
    }

    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
    roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
    roadGeo.setIndex(roadIndices);
    roadGeo.computeVertexNormals();

    this.roadMesh = new THREE.Mesh(roadGeo, roadMat);
    this.roadMesh.receiveShadow = true;
    this.group.add(this.roadMesh);

    leftShoulderGeo.setAttribute('position', new THREE.Float32BufferAttribute(leftPositions, 3));
    leftShoulderGeo.setAttribute('normal', new THREE.Float32BufferAttribute(leftNormals, 3));
    leftShoulderGeo.setAttribute('uv', new THREE.Float32BufferAttribute(leftUvs, 2));
    leftShoulderGeo.setIndex(leftIndices);
    leftShoulderGeo.computeVertexNormals();

    this.leftShoulderMesh = new THREE.Mesh(leftShoulderGeo, shoulderMat);
    this.leftShoulderMesh.receiveShadow = true;
    this.group.add(this.leftShoulderMesh);

    rightShoulderGeo.setAttribute('position', new THREE.Float32BufferAttribute(rightPositions, 3));
    rightShoulderGeo.setAttribute('normal', new THREE.Float32BufferAttribute(rightNormals, 3));
    rightShoulderGeo.setAttribute('uv', new THREE.Float32BufferAttribute(rightUvs, 2));
    rightShoulderGeo.setIndex(rightIndices);
    rightShoulderGeo.computeVertexNormals();

    this.rightShoulderMesh = new THREE.Mesh(rightShoulderGeo, shoulderMat);
    this.rightShoulderMesh.receiveShadow = true;
    this.group.add(this.rightShoulderMesh);
  }

  private buildTerrainMesh(noise2D: (x: number, y: number) => number, terrainMat: THREE.Material): void {
    const steps = this.samples.length;
    const terrainWidth = 140; // Terrain width on either side
    const terrainCols = 8;     // Cross-section segments

    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const halfRoad = CONFIG.road.width / 2 + CONFIG.road.shoulderWidth;

    for (let i = 0; i < steps; i++) {
      const s = this.samples[i];
      const p = s.point;
      const b = s.binormal;

      // Left terrain (from -terrainWidth to -halfRoad)
      for (let c = 0; c <= terrainCols; c++) {
        const u = c / terrainCols;
        const dist = -terrainWidth + u * (terrainWidth - halfRoad);
        const pt = p.clone().addScaledVector(b, dist);
        
        // Blend noise height with road edge height
        const blend = Math.min(1, Math.max(0, (Math.abs(dist) - halfRoad) / 30));
        const rawNoise = noise2D(pt.x * 0.008, pt.z * 0.008) * 18 + noise2D(pt.x * 0.02, pt.z * 0.02) * 5;
        pt.y = p.y * (1 - blend) + (p.y - 0.2 + rawNoise) * blend;

        positions.push(pt.x, pt.y, pt.z);
        normals.push(0, 1, 0);
        uvs.push(pt.x * 0.05, pt.z * 0.05);
      }

      // Right terrain (from +halfRoad to +terrainWidth)
      for (let c = 0; c <= terrainCols; c++) {
        const u = c / terrainCols;
        const dist = halfRoad + u * (terrainWidth - halfRoad);
        const pt = p.clone().addScaledVector(b, dist);

        const blend = Math.min(1, Math.max(0, (Math.abs(dist) - halfRoad) / 30));
        const rawNoise = noise2D(pt.x * 0.008, pt.z * 0.008) * 18 + noise2D(pt.x * 0.02, pt.z * 0.02) * 5;
        pt.y = p.y * (1 - blend) + (p.y - 0.2 + rawNoise) * blend;

        positions.push(pt.x, pt.y, pt.z);
        normals.push(0, 1, 0);
        uvs.push(pt.x * 0.05, pt.z * 0.05);
      }

      if (i < steps - 1) {
        const totalCols = (terrainCols + 1) * 2;
        const row = i * totalCols;
        const nextRow = (i + 1) * totalCols;

        // Left side quads
        for (let c = 0; c < terrainCols; c++) {
          const a = row + c;
          const d = row + c + 1;
          const c_idx = nextRow + c + 1;
          const b_idx = nextRow + c;
          indices.push(a, b_idx, d);
          indices.push(b_idx, c_idx, d);
        }

        // Right side quads
        const offset = terrainCols + 1;
        for (let c = 0; c < terrainCols; c++) {
          const a = row + offset + c;
          const d = row + offset + c + 1;
          const c_idx = nextRow + offset + c + 1;
          const b_idx = nextRow + offset + c;
          indices.push(a, b_idx, d);
          indices.push(b_idx, c_idx, d);
        }
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    this.terrainMesh = new THREE.Mesh(geo, terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.group.add(this.terrainMesh);
  }

  private buildProps(): void {
    const halfRoad = CONFIG.road.width / 2 + CONFIG.road.shoulderWidth + 1.2;
    const kmNumber = (this.chunkIndex * 2) + 12;

    // Place an Indian NH milestone on the left or right shoulder every chunk
    const milestoneSampleIdx = Math.floor(this.samples.length * 0.4);
    const s = this.samples[milestoneSampleIdx];
    const msPos = s.point.clone().addScaledVector(s.binormal, halfRoad);

    const milestoneMesh = this.createMilestoneMesh(kmNumber);
    milestoneMesh.position.copy(msPos);
    
    // Align milestone rotation facing the oncoming road
    const rotMat = new THREE.Matrix4().lookAt(s.tangent, new THREE.Vector3(0,0,0), new THREE.Vector3(0,1,0));
    milestoneMesh.quaternion.setFromRotationMatrix(rotMat);
    this.propsGroup.add(milestoneMesh);

    // Place roadside stylized trees along this chunk
    for (let i = 4; i < this.samples.length - 2; i += 6) {
      const sample = this.samples[i];
      const side = (i % 12 === 0) ? -1 : 1;
      const offsetDist = halfRoad + 3.0 + (i % 5) * 4.0;
      const treePos = sample.point.clone().addScaledVector(sample.binormal, side * offsetDist);
      
      const treeType = (i % 3 === 0) ? 'gulmohar' : (i % 3 === 1 ? 'banyan' : 'neem');
      const treeMesh = this.createStylizedTree(treeType);
      treeMesh.position.copy(treePos);
      treeMesh.rotation.y = (i * 1.7);
      const scale = 0.8 + (i % 4) * 0.2;
      treeMesh.scale.set(scale, scale, scale);
      this.propsGroup.add(treeMesh);
    }
  }

  private createMilestoneMesh(km: number): THREE.Group {
    const group = new THREE.Group();

    const stoneMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createMilestoneTexture(km, 'NH 44'),
      roughness: 0.85
    });

    // Milestone body (curved cylinder top + rectangular base)
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

  private createStylizedTree(type: 'gulmohar' | 'banyan' | 'neem'): THREE.Group {
    const group = new THREE.Group();

    // Trunk
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.9 });
    const trunkHeight = type === 'banyan' ? 5.5 : 4.5;
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.6, trunkHeight, 7);
    const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
    trunkMesh.position.y = trunkHeight / 2;
    trunkMesh.castShadow = true;
    group.add(trunkMesh);

    // Foliage
    let foliageColor = 0x2e6b2c; // Default Neem green
    if (type === 'gulmohar') foliageColor = 0xd9381e; // Iconic vibrant Orange-Red
    if (type === 'banyan') foliageColor = 0x1f5424;   // Deep lush Green

    const foliageMat = new THREE.MeshStandardMaterial({
      color: foliageColor,
      roughness: 0.7,
      flatShading: true
    });

    if (type === 'gulmohar') {
      // Umbrella canopy shape
      const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.6, 1), foliageMat);
      crown1.position.y = trunkHeight + 1.2;
      crown1.scale.set(1.4, 0.7, 1.4);
      crown1.castShadow = true;
      group.add(crown1);
    } else if (type === 'banyan') {
      // Wide sprawling canopy
      const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(3.5, 1), foliageMat);
      crown1.position.y = trunkHeight + 1.5;
      crown1.scale.set(1.8, 0.8, 1.8);
      crown1.castShadow = true;
      group.add(crown1);
    } else {
      // Conical / tiered neem foliage
      const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4, 1), foliageMat);
      crown1.position.y = trunkHeight + 1.2;
      crown1.castShadow = true;
      group.add(crown1);

      const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), foliageMat);
      crown2.position.y = trunkHeight + 2.6;
      crown2.castShadow = true;
      group.add(crown2);
    }

    return group;
  }

  public dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
  }
}

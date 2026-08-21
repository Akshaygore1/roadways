import * as THREE from 'three';
import { CONFIG } from '../config';
import { TextureGenerator } from './Textures';
import { RoadsideBusinessType } from './RoadsidePlot';

interface RoofBillboardLayout {
  width: number;
  height: number;
  centerY: number;
  centerZ: number;
  postOffset: number;
  roofY: number;
}

/**
 * Builds low-poly roadside businesses from reusable Three.js primitives.
 * Each returned group uses local +Z as its road-facing direction.
 */
export class RoadsideBusiness {
  public static create(type: RoadsideBusinessType, seed: number): THREE.Group {
    return type === 'dhaba' ? this.createDhaba(seed) : this.createChaiStall(seed);
  }

  private static createDhaba(seed: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'roadside-dhaba';

    const plasterMat = new THREE.MeshStandardMaterial({ color: 0xd9953f, roughness: 0.94 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x24563d, roughness: 0.82 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x3f6667, roughness: 0.72, metalness: 0.18 });
    const darkInteriorMat = new THREE.MeshStandardMaterial({ color: 0x1c1611, roughness: 1 });
    const earthMat = new THREE.MeshStandardMaterial({ color: 0x914628, roughness: 1 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x9a8874, roughness: 1 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5e321d, roughness: 0.9 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xe0a43b, roughness: 0.92 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x9ca2a0, roughness: 0.35, metalness: 0.75 });
    const clayMat = new THREE.MeshStandardMaterial({ color: 0x9b4428, roughness: 1 });
    const signTexture = TextureGenerator.createRoadsideBusinessSignTexture('dhaba');
    const signMat = new THREE.MeshStandardMaterial({
      map: signTexture,
      emissive: 0xffffff,
      emissiveMap: signTexture,
      emissiveIntensity: 0.16,
      roughness: 0.6
    });

    this.addPreparedPlot(
      group,
      CONFIG.roadside.dhaba.plotWidth,
      CONFIG.roadside.dhaba.plotDepth,
      earthMat,
      concreteMat
    );
    this.addBox(group, [10.8, 0.12, 6.8], [0, 0.07, -1.45], concreteMat, false);

    // Enclosed kitchen with a wide, dark service opening toward the road.
    this.addBox(group, [9.6, 3.9, 0.3], [0, 2.05, -4.0], plasterMat, true);
    this.addBox(group, [1.55, 3.9, 4.9], [-4.03, 2.05, -1.7], plasterMat, true);
    this.addBox(group, [1.55, 3.9, 4.9], [4.03, 2.05, -1.7], plasterMat, true);
    this.addBox(group, [6.6, 0.85, 4.9], [0, 3.58, -1.7], plasterMat, true);
    this.addBox(group, [6.55, 2.75, 0.12], [0, 1.88, 0.8], darkInteriorMat, false);
    this.addBox(group, [7.3, 1.05, 1.05], [0, 0.655, 1.32], trimMat);
    this.addBox(group, [10.4, 0.24, 5.7], [0, 4.12, -1.65], roofMat, true);
    this.addRoofBillboard(group, {
      width: 8.4,
      height: 1.35,
      centerY: 6.15,
      centerZ: 0.1,
      postOffset: 3.15,
      roofY: 4.24
    }, signMat, metalMat);

    // Striped veranda roof, posts, and a line of warm bulbs.
    const awningColors = [0xb92e24, 0xf1b63b];
    for (let stripe = 0; stripe < 10; stripe++) {
      const stripeMat = new THREE.MeshStandardMaterial({
        color: awningColors[(stripe + seed) % awningColors.length],
        roughness: 0.88
      });
      const awningStripe = this.addBox(
        group,
        [1.05, 0.14, 3.8],
        [-4.73 + stripe * 1.05, 3.85, 2.72],
        stripeMat
      );
      awningStripe.rotation.x = 0.08;
    }

    this.addBox(group, [0.13, 3.7, 0.13], [-4.65, 1.86, 4.48], metalMat);
    this.addBox(group, [0.13, 3.7, 0.13], [4.65, 1.86, 4.48], metalMat);

    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xffc46b,
      emissive: 0xff8a24,
      emissiveIntensity: 3.4,
      roughness: 0.25
    });
    for (let bulbIndex = 0; bulbIndex < 7; bulbIndex++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), bulbMat);
      bulb.position.set(-3.9 + bulbIndex * 1.3, 3.68, 4.5);
      group.add(bulb);
    }

    // Outdoor charpoys make the dhaba readable before its sign is legible.
    const leftCharpoy = this.createCharpoy(woodMat, ropeMat);
    leftCharpoy.position.set(-2.8, 0.02, 3.45);
    group.add(leftCharpoy);

    const rightCharpoy = this.createCharpoy(woodMat, ropeMat);
    rightCharpoy.position.set(2.75, 0.02, 3.45);
    group.add(rightCharpoy);

    // Tandoor and steel serving pots at the open counter.
    const tandoor = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.52, 1.05, 12), clayMat);
    tandoor.position.set(3.65, 0.535, 1.95);
    tandoor.castShadow = false;
    group.add(tandoor);

    const tandoorMouth = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.08, 6, 16), darkInteriorMat);
    tandoorMouth.position.set(3.65, 1.2, 1.95);
    tandoorMouth.rotation.x = Math.PI * 0.5;
    group.add(tandoorMouth);

    for (let potIndex = 0; potIndex < 3; potIndex++) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.28, 12), metalMat);
      pot.position.set(-2.2 + potIndex * 0.8, 1.39, 1.5);
      pot.castShadow = false;
      group.add(pot);
    }

    const waterTankMat = new THREE.MeshStandardMaterial({ color: 0x242b29, roughness: 0.78 });
    const waterTank = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 1.25, 16), waterTankMat);
    waterTank.position.set(3.25, 4.82, -2.35);
    waterTank.castShadow = true;
    group.add(waterTank);

    const interiorGlow = new THREE.PointLight(0xff9a45, 70, 11, 2);
    interiorGlow.position.set(0, 2.25, 0.55);
    group.add(interiorGlow);

    return group;
  }

  private static createChaiStall(seed: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'roadside-chai-stall';

    const kioskColors = [0x367a78, 0x3b657d, 0x586f42];
    const kioskMat = new THREE.MeshStandardMaterial({
      color: kioskColors[seed % kioskColors.length],
      roughness: 0.82,
      metalness: 0.08
    });
    const darkInteriorMat = new THREE.MeshStandardMaterial({ color: 0x181511, roughness: 1 });
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x6f3e23, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xa9aeaa, roughness: 0.3, metalness: 0.8 });
    const earthMat = new THREE.MeshStandardMaterial({ color: 0x914628, roughness: 1 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x9a8874, roughness: 1 });
    const tarpMat = new THREE.MeshStandardMaterial({
      color: 0xf0b42e,
      roughness: 0.82,
      side: THREE.DoubleSide
    });
    const signTexture = TextureGenerator.createRoadsideBusinessSignTexture('chai');
    const signMat = new THREE.MeshStandardMaterial({
      map: signTexture,
      emissive: 0xffffff,
      emissiveMap: signTexture,
      emissiveIntensity: 0.18,
      roughness: 0.58
    });

    this.addPreparedPlot(
      group,
      CONFIG.roadside.chai.plotWidth,
      CONFIG.roadside.chai.plotDepth,
      earthMat,
      concreteMat
    );
    this.addBox(group, [6.3, 0.12, 5.0], [0, 0.07, -0.58], concreteMat, false);
    this.addBox(group, [5.8, 3.75, 3.8], [0, 1.98, -0.9], kioskMat, true);
    this.addBox(group, [4.35, 2.35, 0.12], [0, 2.0, 1.04], darkInteriorMat, false);
    this.addBox(group, [5.0, 0.92, 0.82], [0, 0.59, 1.48], counterMat);
    this.addBox(group, [6.45, 0.2, 4.45], [0, 3.98, -0.82], metalMat, true);
    this.addRoofBillboard(group, {
      width: 5.6,
      height: 1.25,
      centerY: 5.4,
      centerZ: 0,
      postOffset: 2.05,
      roofY: 4.08
    }, signMat, metalMat);

    const awning = this.addBox(group, [6.5, 0.12, 2.9], [0, 3.55, 2.4], tarpMat, true);
    awning.rotation.x = 0.1;
    this.addBox(group, [0.1, 3.3, 0.1], [-2.85, 1.66, 3.72], metalMat);
    this.addBox(group, [0.1, 3.3, 0.1], [2.85, 1.66, 3.72], metalMat);

    // Familiar roadside bench, kettle, glasses, and biscuit jars.
    this.addBox(group, [4.7, 0.22, 0.65], [0, 0.82, 3.46], counterMat);
    this.addBox(group, [0.18, 0.82, 0.18], [-1.8, 0.42, 3.46], counterMat);
    this.addBox(group, [0.18, 0.82, 0.18], [1.8, 0.42, 3.46], counterMat);
    group.add(this.createKettle(metalMat));

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xe7b56d,
      transparent: true,
      opacity: 0.76,
      roughness: 0.3
    });
    for (let cupIndex = 0; cupIndex < 4; cupIndex++) {
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.24, 8), glassMat);
      glass.position.set(-1.45 + cupIndex * 0.32, 1.31, 1.62);
      group.add(glass);
    }

    const jarMat = new THREE.MeshStandardMaterial({
      color: 0xd7c49d,
      transparent: true,
      opacity: 0.68,
      roughness: 0.3
    });
    for (let jarIndex = 0; jarIndex < 2; jarIndex++) {
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.62, 12), jarMat);
      jar.position.set(1.75 + jarIndex * 0.58, 1.5, 1.58);
      group.add(jar);
    }

    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xffd27d,
      emissive: 0xff932e,
      emissiveIntensity: 3.8
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), bulbMat);
    bulb.position.set(0, 3.2, 2.4);
    group.add(bulb);

    const stallGlow = new THREE.PointLight(0xff9d4d, 55, 9, 2);
    stallGlow.position.set(0, 2.55, 1.55);
    group.add(stallGlow);

    return group;
  }

  private static createCharpoy(
    woodMat: THREE.Material,
    ropeMat: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();
    this.addBox(group, [2.9, 0.13, 1.35], [0, 0.62, 0], woodMat);
    this.addBox(group, [2.58, 0.08, 1.08], [0, 0.7, 0], ropeMat, false);

    for (const x of [-1.27, 1.27]) {
      for (const z of [-0.52, 0.52]) {
        this.addBox(group, [0.13, 0.64, 0.13], [x, 0.31, z], woodMat);
      }
    }

    return group;
  }

  private static createKettle(metalMat: THREE.Material): THREE.Group {
    const group = new THREE.Group();
    group.position.set(0.85, 1.13, 1.58);

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 8), metalMat);
    body.scale.y = 0.82;
    body.castShadow = false;
    group.add(body);

    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.1, 12), metalMat);
    lid.position.y = 0.34;
    group.add(lid);

    const spout = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.55, 8), metalMat);
    spout.position.set(0.42, 0.08, 0);
    spout.rotation.z = -Math.PI * 0.5;
    group.add(spout);

    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.055, 6, 16, Math.PI), metalMat);
    handle.position.set(-0.04, 0.12, 0);
    handle.rotation.z = Math.PI;
    group.add(handle);

    return group;
  }

  private static addPreparedPlot(
    group: THREE.Group,
    width: number,
    depth: number,
    earthMat: THREE.Material,
    concreteMat: THREE.Material
  ): void {
    const apronHeight = 0.05;
    const surfaceY = 0.01;
    const curbWidth = 0.22;
    const curbHeight = 0.22;
    this.addBox(
      group,
      [width, apronHeight, depth],
      [0, surfaceY - apronHeight * 0.5, 0],
      earthMat,
      false
    );

    const curbY = surfaceY + curbHeight * 0.5;
    const sideX = width * 0.5 - curbWidth * 0.5;
    this.addBox(group, [curbWidth, curbHeight, depth], [-sideX, curbY, 0], concreteMat, false);
    this.addBox(group, [curbWidth, curbHeight, depth], [sideX, curbY, 0], concreteMat, false);
    this.addBox(
      group,
      [width - curbWidth * 2, curbHeight, curbWidth],
      [0, curbY, -depth * 0.5 + curbWidth * 0.5],
      concreteMat,
      false
    );
  }

  private static addRoofBillboard(
    group: THREE.Group,
    layout: RoofBillboardLayout,
    signMat: THREE.Material,
    metalMat: THREE.Material
  ): void {
    const { width, height, centerY, centerZ, postOffset, roofY } = layout;
    const frameDepth = 0.09;
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x333b3d,
      roughness: 0.42,
      metalness: 0.78
    });
    this.addBox(
      group,
      [width + 0.22, height + 0.22, frameDepth],
      [0, centerY, centerZ],
      frameMat,
      false
    );
    this.addBox(group, [width, height, 0.055], [0, centerY, centerZ + 0.07], signMat, false);

    const boardBottom = centerY - height * 0.5;
    const postHeight = boardBottom - roofY;
    const postY = roofY + postHeight * 0.5;
    for (const x of [-postOffset, postOffset]) {
      this.addBox(group, [0.1, postHeight, 0.1], [x, postY, centerZ], metalMat, false);
    }
  }

  private static addBox(
    parent: THREE.Object3D,
    size: [number, number, number],
    position: [number, number, number],
    material: THREE.Material,
    castShadow: boolean = false
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
}

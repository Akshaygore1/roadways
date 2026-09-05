import * as THREE from 'three';
import { createIndianTruck } from './IndianTruck';
import { CONFIG } from '../config';

export interface CarWheelMeshes {
  frontLeft: THREE.Group;
  frontRight: THREE.Group;
  rearLeft: THREE.Group;
  rearRight: THREE.Group;
}

export class CarModel {
  public group: THREE.Group;
  public wheels: CarWheelMeshes;
  public brakeLights: THREE.Mesh[] = [];
  public headlights: THREE.SpotLight[] = [];
  private rollingWheels: THREE.Group[] = [];
  private brakeLightMaterial = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0x440000, emissiveIntensity: .6 });
  private headlightLensMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff5dd, emissiveIntensity: 2.5 });

  constructor() {
    this.group = createIndianTruck();
    const { halfTrack, wheelCenterHeight, frontAxleZ, rearAxleZ, middleAxleZ } = CONFIG.vehicle;
    const wheelParts = new Set(['Heavy tire', 'Painted wheel rim', 'Red wheel hub', 'Wheel lug', 'Tire tread block', 'Inner dual rear tire']);
    const parts = this.group.children.filter(part => wheelParts.has(part.name)).map(part => ({
      part,
      side: Math.sign(part.position.x),
      axle: [frontAxleZ, middleAxleZ, rearAxleZ].reduce((nearest, candidate) =>
        this.axleDistance(part, candidate) < this.axleDistance(part, nearest) ? candidate : nearest)
    }));
    const makeWheel = (side: number, z: number): THREE.Group => {
      const steering = new THREE.Group();
      steering.position.set(side * halfTrack, wheelCenterHeight, z);
      const rolling = new THREE.Group();
      steering.add(rolling);
      this.group.add(steering);
      // Preserve each mesh's local orientation; roll the assembly about its axle.
      for (const entry of parts) {
        const { part } = entry;
        if (entry.side === side && entry.axle === z) {
          part.position.sub(steering.position);
          rolling.add(part);
        }
      }
      this.rollingWheels.push(rolling);
      return steering;
    };
    this.wheels = {
      frontLeft: makeWheel(-1, frontAxleZ),
      frontRight: makeWheel(1, frontAxleZ),
      rearLeft: makeWheel(-1, rearAxleZ),
      rearRight: makeWheel(1, rearAxleZ)
    };
    makeWheel(-1, middleAxleZ);
    makeWheel(1, middleAxleZ);
    this.group.traverse(part => {
      if (!(part instanceof THREE.Mesh)) return;
      if (part.name === 'Tail lamp') {
        part.material = this.brakeLightMaterial;
        this.brakeLights.push(part);
      }
      if (part.name === 'Rectangular headlamp lens') part.material = this.headlightLensMaterial;
    });
    for (const x of [-.99, .99]) {
      const spot = new THREE.SpotLight(0xfffae6, 220, 130, .52, .6, 1.2);
      spot.position.set(x, 1.92, 3.82);
      spot.target.position.set(x, .1, 45);
      this.group.add(spot, spot.target);
      this.headlights.push(spot);
    }
    const flood = new THREE.SpotLight(0xfff0cc, 130, 60, .85, .7, 1.2);
    flood.position.set(0, 1.55, 3.82);
    flood.target.position.set(0, 0, 22);
    this.group.add(flood, flood.target);
    this.headlights.push(flood);
  }

  private axleDistance(part: THREE.Object3D, axleZ: number): number {
    if (part.name === 'Tire tread block') {
      // Adjacent rear tires nearly touch; tread position alone can cross the axle midpoint.
      return Math.abs(Math.hypot(part.position.y - CONFIG.vehicle.wheelCenterHeight, part.position.z - axleZ) - .585);
    }
    return Math.abs(part.position.z - axleZ);
  }

  public setBraking(isBraking: boolean): void {
    this.brakeLightMaterial.emissive.setHex(isBraking ? 0xff1100 : 0x440000);
    this.brakeLightMaterial.emissiveIntensity = isBraking ? 3 : .6;
  }

  public setHeadlightsEnabled(enabled: boolean): void {
    this.headlights.forEach(light => { light.visible = enabled; });
    this.headlightLensMaterial.emissiveIntensity = enabled ? 2.5 : 0;
  }

  public updateWheelVisuals(steerAngle: number, spinDelta: number): void {
    this.wheels.frontLeft.rotation.y = -steerAngle;
    this.wheels.frontRight.rotation.y = -steerAngle;
    for (const wheel of this.rollingWheels) wheel.rotation.x += spinDelta;
  }
}

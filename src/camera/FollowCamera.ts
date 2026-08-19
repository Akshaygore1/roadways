import * as THREE from 'three';
import { CONFIG } from '../config';
import { CarController } from '../vehicle/CarController';

export type CameraMode = 'chase' | 'hood' | 'drone';

export class FollowCamera {
  public camera: THREE.PerspectiveCamera;
  public mode: CameraMode = 'chase';

  private car: CarController;
  private currentPosition: THREE.Vector3 = new THREE.Vector3();
  private currentLookTarget: THREE.Vector3 = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, car: CarController) {
    this.camera = camera;
    this.car = car;

    this.currentPosition.copy(car.position).add(new THREE.Vector3(0, CONFIG.camera.chaseHeight, -CONFIG.camera.chaseDistance));
    this.currentLookTarget.copy(car.position).add(new THREE.Vector3(0, 1.8, 0));
  }

  public toggleMode(): CameraMode {
    if (this.mode === 'chase') {
      this.mode = 'hood';
    } else if (this.mode === 'hood') {
      this.mode = 'drone';
    } else {
      this.mode = 'chase';
    }
    return this.mode;
  }

  public update(delta: number): void {
    const dt = Math.min(delta, 0.1);
    const carPos = this.car.position;
    const carFwd = this.car.forward;

    if (this.mode === 'chase') {
      // Third-person dynamic spring camera
      const speedRatio = Math.min(1, Math.max(0, Math.abs(this.car.speedKmh) / CONFIG.physics.maxSpeed));
      
      // Dynamic camera distance & height based on speed
      const targetDist = CONFIG.camera.chaseDistance + speedRatio * 1.6;
      const targetHeight = CONFIG.camera.chaseHeight + speedRatio * 0.4;

      // Ideal camera position behind the car
      const desiredPos = carPos.clone()
        .addScaledVector(carFwd, -targetDist)
        .add(new THREE.Vector3(0, targetHeight, 0));

      // Smooth position interpolation
      this.currentPosition.lerp(desiredPos, Math.min(1, dt * CONFIG.camera.chaseDamping));

      // Dynamic look target ahead of truck
      const lookAhead = CONFIG.camera.lookAheadDist + speedRatio * 10.0;
      const desiredLook = carPos.clone()
        .addScaledVector(carFwd, lookAhead)
        .add(new THREE.Vector3(0, 1.85, 0));

      this.currentLookTarget.lerp(desiredLook, Math.min(1, dt * 6.0));

      // Dynamic FOV speed sensation
      const targetFov = CONFIG.camera.fovBase + speedRatio * (CONFIG.camera.fovMax - CONFIG.camera.fovBase);
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 4.0);
      this.camera.updateProjectionMatrix();

      this.camera.position.copy(this.currentPosition);
      this.camera.lookAt(this.currentLookTarget);

    } else if (this.mode === 'hood') {
      // First-person elevated truck bonnet view
      const hoodPos = carPos.clone()
        .addScaledVector(carFwd, 2.7)
        .add(new THREE.Vector3(0, 2.35, 0));

      const lookTarget = carPos.clone()
        .addScaledVector(carFwd, 35.0)
        .add(new THREE.Vector3(0, 2.2, 0));

      this.camera.fov = 75;
      this.camera.updateProjectionMatrix();
      this.camera.position.copy(hoodPos);
      this.camera.lookAt(lookTarget);

    } else if (this.mode === 'drone') {
      // Scenic elevated drone view
      const dronePos = carPos.clone()
        .add(new THREE.Vector3(12, 14, -12));

      this.currentPosition.lerp(dronePos, Math.min(1, dt * 2.5));
      this.camera.fov = 60;
      this.camera.updateProjectionMatrix();
      this.camera.position.copy(this.currentPosition);
      this.camera.lookAt(carPos.clone().add(new THREE.Vector3(0, 1.2, 0)));
    }
  }
}

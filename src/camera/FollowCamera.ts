import * as THREE from 'three';
import { CONFIG } from '../config';
import { CarController } from '../vehicle/CarController';

export type CameraMode = 'chase' | 'hood' | 'drone';

export class FollowCamera {
  public camera: THREE.PerspectiveCamera;
  public mode: CameraMode = 'chase';

  private car: CarController;
  private canvas: HTMLCanvasElement;
  private currentPosition: THREE.Vector3 = new THREE.Vector3();
  private currentLookTarget: THREE.Vector3 = new THREE.Vector3();
  private manualOrbitActive: boolean = false;
  private orbitAzimuth: number = 0;
  private orbitVerticalAngle: number = CONFIG.camera.orbitMinVerticalAngle;
  private orbitDistance: number = CONFIG.camera.chaseDistance;
  private dragPointerId: number | null = null;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;
  private dragThresholdPassed: boolean = false;

  constructor(camera: THREE.PerspectiveCamera, car: CarController, canvas: HTMLCanvasElement) {
    this.camera = camera;
    this.car = car;
    this.canvas = canvas;

    this.currentPosition.copy(car.position).add(new THREE.Vector3(0, CONFIG.camera.chaseHeight, -CONFIG.camera.chaseDistance));
    this.currentLookTarget.copy(car.position).add(new THREE.Vector3(0, CONFIG.camera.orbitTargetHeight, 0));
    this.setupMouseControls();
  }

  public toggleMode(): CameraMode {
    this.manualOrbitActive = false;
    this.endDrag();

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

    if (this.manualOrbitActive) {
      this.updateManualOrbit();
      return;
    }

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

  private setupMouseControls(): void {
    this.canvas.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) {
        return;
      }

      event.preventDefault();
      this.dragPointerId = event.pointerId;
      this.dragStartX = event.clientX;
      this.dragStartY = event.clientY;
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;
      this.dragThresholdPassed = false;
      this.canvas.setPointerCapture(event.pointerId);
      this.canvas.style.cursor = 'grabbing';
    });

    this.canvas.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.dragPointerId) {
        return;
      }

      const totalDrag = Math.hypot(
        event.clientX - this.dragStartX,
        event.clientY - this.dragStartY
      );
      if (!this.dragThresholdPassed && totalDrag >= CONFIG.camera.orbitDragThreshold) {
        this.dragThresholdPassed = true;
        if (!this.manualOrbitActive) {
          this.activateManualOrbit();
        }
      }

      if (this.dragThresholdPassed) {
        const deltaX = event.clientX - this.lastPointerX;
        const deltaY = event.clientY - this.lastPointerY;
        this.orbitAzimuth -= deltaX * CONFIG.camera.orbitDragSensitivity;
        this.orbitVerticalAngle = THREE.MathUtils.clamp(
          this.orbitVerticalAngle - deltaY * CONFIG.camera.orbitDragSensitivity,
          CONFIG.camera.orbitMinVerticalAngle,
          CONFIG.camera.orbitMaxVerticalAngle
        );
      }

      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;
    });

    const finishDrag = (event: PointerEvent): void => {
      if (event.pointerId === this.dragPointerId) {
        this.endDrag();
      }
    };
    this.canvas.addEventListener('pointerup', finishDrag);
    this.canvas.addEventListener('pointercancel', finishDrag);

    this.canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      if (!this.manualOrbitActive) {
        this.activateManualOrbit();
      }
      this.orbitDistance = THREE.MathUtils.clamp(
        this.orbitDistance * Math.exp(event.deltaY * CONFIG.camera.orbitWheelSensitivity),
        CONFIG.camera.orbitMinDistance,
        CONFIG.camera.orbitMaxDistance
      );
    }, { passive: false });
  }

  private activateManualOrbit(): void {
    const target = this.car.position.clone().add(
      new THREE.Vector3(0, CONFIG.camera.orbitTargetHeight, 0)
    );
    const offset = this.camera.position.clone().sub(target);
    const rawDistance = Math.max(offset.length(), Number.EPSILON);

    this.orbitDistance = THREE.MathUtils.clamp(
      rawDistance,
      CONFIG.camera.orbitMinDistance,
      CONFIG.camera.orbitMaxDistance
    );
    this.orbitVerticalAngle = THREE.MathUtils.clamp(
      Math.asin(THREE.MathUtils.clamp(offset.y / rawDistance, -1, 1)),
      CONFIG.camera.orbitMinVerticalAngle,
      CONFIG.camera.orbitMaxVerticalAngle
    );
    this.orbitAzimuth = Math.atan2(-offset.x, -offset.z) - this.car.yaw;
    this.manualOrbitActive = true;
  }

  private updateManualOrbit(): void {
    const target = this.car.position.clone().add(
      new THREE.Vector3(0, CONFIG.camera.orbitTargetHeight, 0)
    );
    const horizontalDistance = Math.cos(this.orbitVerticalAngle) * this.orbitDistance;
    const worldAzimuth = this.car.yaw + this.orbitAzimuth;

    this.camera.position.set(
      target.x - Math.sin(worldAzimuth) * horizontalDistance,
      target.y + Math.sin(this.orbitVerticalAngle) * this.orbitDistance,
      target.z - Math.cos(worldAzimuth) * horizontalDistance
    );
    this.camera.lookAt(target);
  }

  private endDrag(): void {
    if (this.dragPointerId !== null && this.canvas.hasPointerCapture(this.dragPointerId)) {
      this.canvas.releasePointerCapture(this.dragPointerId);
    }
    this.dragPointerId = null;
    this.dragThresholdPassed = false;
    this.canvas.style.cursor = 'grab';
  }
}

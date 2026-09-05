import * as THREE from 'three';
import { CONFIG } from '../config';
import { CarModel } from './CarModel';
import { RoadManager } from '../world/RoadManager';
import { InputManager } from '../core/Input';
import { Autopilot } from './Autopilot';

export class CarController {
  public model: CarModel;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public forward: THREE.Vector3 = new THREE.Vector3(0, 0, 1);
  public speedKmh: number = 0;
  public yaw: number = 0;
  public pitch: number = 0;
  public roll: number = 0;
  public distanceTraveledKm: number = 0;
  public headlightsEnabled: boolean = true;
  public effectiveThrottle: number = 0;
  public isBraking: boolean = false;

  private steerAngle: number = 0;
  private roadManager: RoadManager;
  private input: InputManager;
  private isOffRoad: boolean = false;
  private verticalVelocity: number = 0;
  public autopilotEnabled: boolean = false;
  private autopilot: Autopilot = new Autopilot();

  constructor(scene: THREE.Scene, roadManager: RoadManager, input: InputManager) {
    this.roadManager = roadManager;
    this.input = input;
    this.model = new CarModel();
    scene.add(this.model.group);

    this.position = new THREE.Vector3(0, 0, 0);
    this.reset();
  }

  public reset(): void {
    // Recover onto the nearest active road instead of returning to an artificial start.
    const roadInfo = this.roadManager.getClosestRoadSample(this.position);
    this.position.copy(roadInfo.point);
    this.forward.copy(roadInfo.tangent).normalize();
    this.yaw = Math.atan2(this.forward.x, this.forward.z);

    this.velocity.set(0, 0, 0);
    this.speedKmh = 0;
    this.steerAngle = 0;
    this.pitch = 0;
    this.roll = 0;
    this.verticalVelocity = 0;
    this.autopilotEnabled = false;
    this.distanceTraveledKm = 0;
    this.effectiveThrottle = 0;
    this.isBraking = false;
    this.updateTransform();
  }

  public toggleAutopilot(): boolean {
    this.autopilotEnabled = !this.autopilotEnabled;
    return this.autopilotEnabled;
  }

  public toggleHeadlights(): boolean {
    this.headlightsEnabled = !this.headlightsEnabled;
    this.model.setHeadlightsEnabled(this.headlightsEnabled);
    return this.headlightsEnabled;
  }

  public update(delta: number): void {
    // Limit delta time for physics stability
    const dt = Math.min(delta, 0.1);

    // Autopilot override: compute synthetic input when enabled
    let effectiveThrottle = this.input.throttle;
    let effectiveSteering = this.input.steering;
    let effectiveHandbrake = this.input.handbrake;

    if (this.autopilotEnabled) {
      const autoInput = this.autopilot.compute(
        this.position, this.forward, this.speedKmh, this.yaw, this.roadManager
      );
      effectiveThrottle = autoInput.throttle;
      effectiveSteering = autoInput.steering;
      effectiveHandbrake = false;
    }

    this.effectiveThrottle = effectiveThrottle;

    // 1. Steering computation
    const targetSteer = effectiveSteering * CONFIG.physics.maxSteerAngle;
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1, dt * CONFIG.physics.steerSpeed);

    // 2. Acceleration / Braking
    const maxSpeedMs = CONFIG.physics.maxSpeed / 3.6;
    const reverseMaxMs = CONFIG.physics.reverseMaxSpeed / 3.6;

    // Current forward speed (m/s)
    let forwardSpeed = this.velocity.dot(this.forward);

    const isBraking = (forwardSpeed > 0.5 && effectiveThrottle < -0.1) || effectiveHandbrake;
    this.isBraking = isBraking;
    this.model.setBraking(isBraking);

    if (effectiveThrottle > 0.05) {
      // Accelerate forward
      const accel = CONFIG.physics.acceleration * effectiveThrottle;
      forwardSpeed += accel * dt;
      if (forwardSpeed > maxSpeedMs) forwardSpeed = maxSpeedMs;
    } else if (effectiveThrottle < -0.05) {
      if (forwardSpeed > 0.5) {
        // Foot brake
        const brakeDecel = CONFIG.physics.braking * Math.abs(effectiveThrottle);
        forwardSpeed = Math.max(0, forwardSpeed - brakeDecel * dt);
      } else {
        // Reverse
        const reverseAccel = CONFIG.physics.acceleration * 0.5 * Math.abs(effectiveThrottle);
        forwardSpeed -= reverseAccel * dt;
        if (forwardSpeed < -reverseMaxMs) forwardSpeed = -reverseMaxMs;
      }
    } else {
      // Natural rolling friction
      forwardSpeed *= Math.pow(CONFIG.physics.friction, dt * 60);
      if (Math.abs(forwardSpeed) < 0.1) forwardSpeed = 0;
    }

    if (effectiveHandbrake) {
      forwardSpeed *= Math.pow(0.85, dt * 60);
    }

    // 3. Angular turning based on speed & steering angle
    const speedRatio = Math.min(1, Math.abs(forwardSpeed) / (CONFIG.physics.maxSpeed / 3.6));
    const turnSensitivity = (1.0 - speedRatio * 0.45); // high speed stability
    // With camera facing +Z along the road, turning right requires negative yaw rate (decreasing yaw)
    const turnRate = (forwardSpeed >= 0 ? -1 : 1) * (this.steerAngle * turnSensitivity * (Math.abs(forwardSpeed) * 0.14));
    this.yaw += turnRate * dt;

    // Recalculate forward vector from yaw
    this.forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).normalize();

    // 4. Update velocity with lateral friction/drift
    const lateralDir = new THREE.Vector3(this.forward.z, 0, -this.forward.x);
    let lateralSpeed = this.velocity.dot(lateralDir);

    const gripFactor = effectiveHandbrake ? 0.3 : (this.isOffRoad ? 0.6 : 0.92);
    lateralSpeed *= Math.pow(gripFactor, dt * 60);

    this.velocity.copy(this.forward).multiplyScalar(forwardSpeed)
      .addScaledVector(lateralDir, lateralSpeed);

    // 5. Apply movement
    const displacement = this.velocity.clone().multiplyScalar(dt);
    this.position.add(displacement);

    // Distance tracking
    const movedMeters = displacement.length();
    this.distanceTraveledKm += (movedMeters / 1000.0);
    this.speedKmh = forwardSpeed * 3.6;

    // 6. Ground & Road Contact / Smooth Heavy Suspension
    const roadInfo = this.roadManager.getClosestRoadSample(this.position);
    this.isOffRoad = Math.abs(roadInfo.distanceToCenter) > (CONFIG.road.width / 2);

    const groundY = this.roadManager.getGroundHeight(this.position.x, this.position.z);
    const targetY = groundY; // Tires bottom contact patch is at local y = 0.0

    // Smooth critical-damped suspension tracking
    const heightDiff = targetY - this.position.y;
    this.verticalVelocity += (heightDiff * CONFIG.physics.suspensionStiffness - this.verticalVelocity * CONFIG.physics.suspensionDamping) * dt;
    this.position.y += this.verticalVelocity * dt;

    // Soft ground adherence: smoothly converge to ground if lagging
    if (this.position.y < targetY) {
      this.position.y = THREE.MathUtils.lerp(this.position.y, targetY, Math.min(1, dt * 25.0));
      if (this.verticalVelocity < 0) {
        this.verticalVelocity *= 0.5;
      }
    }

    // Calculate pitch from continuous front/rear axle slope (wheelbase is 3.8m: front at +1.9m, rear at -1.9m)
    const frontProbe = this.position.clone().addScaledVector(this.forward, 1.9);
    const rearProbe = this.position.clone().addScaledVector(this.forward, -1.9);
    const frontGroundY = this.roadManager.getGroundHeight(frontProbe.x, frontProbe.z);
    const rearGroundY = this.roadManager.getGroundHeight(rearProbe.x, rearProbe.z);
    const roadPitch = -Math.atan2(frontGroundY - rearGroundY, 3.8);

    // Dynamic weight transfer pitch during acceleration & braking
    const weightTransferPitch = (effectiveThrottle > 0.05 ? -0.012 * effectiveThrottle : 0) + (isBraking ? 0.025 : 0);
    const targetPitch = THREE.MathUtils.clamp(roadPitch + weightTransferPitch, -0.35, 0.35);
    this.pitch += (targetPitch - this.pitch) * Math.min(1, dt * 10.0);

    // Body roll from cornering + lateral road camber/banking slope (track width 2.4m)
    // In coordinate frame facing +Z, Screen Right is world -X and Screen Left is world +X
    const rightDir = new THREE.Vector3(-this.forward.z, 0, this.forward.x);
    const leftProbe = this.position.clone().addScaledVector(rightDir, -1.2);
    const rightProbe = this.position.clone().addScaledVector(rightDir, 1.2);
    const leftGroundY = this.roadManager.getGroundHeight(leftProbe.x, leftProbe.z);
    const rightGroundY = this.roadManager.getGroundHeight(rightProbe.x, rightProbe.z);
    const roadRoll = Math.atan2(leftGroundY - rightGroundY, 2.4);

    // Centrifugal roll: steering right (steerAngle > 0) causes truck body to lean left (targetRoll < 0)
    const targetRoll = THREE.MathUtils.clamp(-this.steerAngle * (speedRatio * 0.14) + roadRoll, -0.22, 0.22);
    this.roll += (targetRoll - this.roll) * Math.min(1, dt * 10.0);

    // 7. Update 3D visual transforms
    this.updateTransform();

    // 8. Update wheels animation
    const wheelRadius = CONFIG.vehicle.wheelRadius;
    const spinDelta = (forwardSpeed * dt) / wheelRadius;
    this.model.updateWheelVisuals(this.steerAngle, spinDelta);
  }

  private updateTransform(): void {
    this.model.group.position.copy(this.position);

    // Build Euler rotation (Yaw -> Pitch -> Roll)
    const euler = new THREE.Euler(this.pitch, this.yaw, this.roll, 'YXZ');
    this.model.group.quaternion.setFromEuler(euler);
  }
}

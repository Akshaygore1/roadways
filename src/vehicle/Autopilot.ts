import * as THREE from 'three';
import { CONFIG } from '../config';
import { RoadManager } from '../world/RoadManager';

export interface AutopilotInput {
  throttle: number;   // 0 to 1
  steering: number;   // -1 to 1
}

export class Autopilot {
  /**
   * Compute autonomous throttle + steering based on
   * the car's position, forward vector, speed, and road data.
   */
  public compute(
    carPosition: THREE.Vector3,
    _carForward: THREE.Vector3,
    carSpeedKmh: number,
    carYaw: number,
    roadManager: RoadManager
  ): AutopilotInput {
    // 1. Get nearest road sample + a look-ahead sample
    const roadInfo = roadManager.getClosestRoadSample(carPosition);

    // 2. Look-ahead point: project 15m ahead on road tangent for smoother steering
    const lookAheadDist = 15.0;
    const lookAheadPos = carPosition.clone()
      .addScaledVector(roadInfo.tangent, lookAheadDist);
    const aheadInfo = roadManager.getClosestRoadSample(lookAheadPos);

    // 3. Steering: steer toward road center at the look-ahead point
    //    Compute desired yaw from road tangent at look-ahead
    const desiredDir = aheadInfo.tangent.clone().normalize();
    const desiredYaw = Math.atan2(desiredDir.x, desiredDir.z);

    // Yaw error (wrapped to [-PI, PI])
    let yawError = desiredYaw - carYaw;
    while (yawError > Math.PI) yawError -= 2 * Math.PI;
    while (yawError < -Math.PI) yawError += 2 * Math.PI;

    // Add lateral offset correction: steer toward center
    // distanceToCenter > 0 means car is to Screen Left (+X) of centerline, so steer right (+steering)
    const lateralCorrection = aheadInfo.distanceToCenter * 0.06;

    // Map yaw error + lateral correction to [-1, 1] steering
    // When desiredYaw < carYaw (road curves right), we output positive steering (+steering)
    const rawSteer = -(yawError * 2.0) + lateralCorrection;
    const steering = Math.max(-1, Math.min(1, rawSteer));

    // 4. Throttle: simple P-controller toward cruise speed
    const speedError = CONFIG.autopilot.cruiseSpeedKmh - carSpeedKmh;
    let throttle: number;
    if (speedError > 5) {
      throttle = Math.min(1.0, speedError * 0.05);
    } else if (speedError > 0) {
      throttle = speedError * 0.04;  // gentle near target
    } else {
      throttle = 0; // coast / let friction slow down
    }

    return { throttle, steering };
  }
}

export interface GameConfig {
  road: {
    width: number;
    shoulderWidth: number;
    chunkLength: number;
    segmentCount: number;
    activeChunksAhead: number;
    activeChunksBehind: number;
    maxCurveAngle: number;
    maxElevationChange: number;
  };
  physics: {
    maxSpeed: number;        // in km/h
    acceleration: number;
    braking: number;
    reverseMaxSpeed: number;
    steerSpeed: number;
    maxSteerAngle: number;
    friction: number;
    driftFriction: number;
    suspensionStiffness: number;
    suspensionDamping: number;
    gravity: number;
  };
  camera: {
    chaseDistance: number;
    chaseHeight: number;
    chaseDamping: number;
    lookAheadDist: number;
    fovBase: number;
    fovMax: number;
  };
}

export const CONFIG: GameConfig = {
  road: {
    width: 9.0,              // 2-lane Indian highway width
    shoulderWidth: 3.5,      // Red clay / gravel road verge
    chunkLength: 220,        // Length of each procedural road segment
    segmentCount: 80,        // Resolution along spline per chunk (doubled for smoother elevation)
    activeChunksAhead: 5,    // How far ahead road is generated (~1.1 km)
    activeChunksBehind: 2,   // Chunks retained behind before recycling
    maxCurveAngle: 0.35,     // Curvature intensity
    maxElevationChange: 8.0  // Gentler rolling hills to prevent floating on crests
  },
  physics: {
    maxSpeed: 115,           // km/h (heavy diesel engine)
    acceleration: 22.0,
    braking: 42.0,
    reverseMaxSpeed: 30,
    steerSpeed: 3.0,
    maxSteerAngle: 0.52,     // radians
    friction: 0.985,
    driftFriction: 0.94,
    suspensionStiffness: 75.0,   // Spring constant for spring-damper model
    suspensionDamping: 20.0,     // Damping coefficient (heavy loaded feel)
    gravity: 28.0
  },
  camera: {
    chaseDistance: 6.9,      // Closer to the truck tailgate
    chaseHeight: 3.9,        // Elevated above the cab roof to view both truck and road
    chaseDamping: 6.5,
    lookAheadDist: 14.0,     // Look ahead along the road
    fovBase: 64,
    fovMax: 76
  }
};

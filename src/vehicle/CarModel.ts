import * as THREE from 'three';
import { TextureGenerator } from '../world/Textures';

export interface CarWheelMeshes {
  frontLeft: THREE.Group;
  frontRight: THREE.Group;
  rearLeft: THREE.Group;
  rearRight: THREE.Group;
}

export class CarModel {
  public group: THREE.Group;
  public wheels!: CarWheelMeshes;
  public brakeLights: THREE.Mesh[] = [];
  public headlights: THREE.SpotLight[] = [];

  // Authentic Indian Truck Color Palette
  private cabColor: number = 0xf39c12;       // Vibrant Indian Marigold Saffron / Ochre
  private chassisColor: number = 0x22262a;   // Heavy dark steel chassis
  private chromeMaterial: THREE.MeshStandardMaterial;
  private cabMaterial: THREE.MeshStandardMaterial;
  private glassMaterial: THREE.MeshStandardMaterial;
  private brakeLightMaterial!: THREE.MeshStandardMaterial;
  private headlightLensMaterial!: THREE.MeshStandardMaterial;
  private blackRubberMaterial: THREE.MeshStandardMaterial;
  private woodMaterial: THREE.MeshStandardMaterial;

  constructor() {
    this.group = new THREE.Group();

    this.chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      metalness: 0.9,
      roughness: 0.15
    });

    this.cabMaterial = new THREE.MeshStandardMaterial({
      color: this.cabColor,
      metalness: 0.15,
      roughness: 0.35
    });

    this.glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x182430,
      metalness: 0.5,
      roughness: 0.1,
      transparent: true,
      opacity: 0.75
    });

    this.blackRubberMaterial = new THREE.MeshStandardMaterial({
      color: 0x1b1d20,
      roughness: 0.85
    });

    this.woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.7
    });

    this.buildIndianTruck();
  }

  private buildIndianTruck(): void {
    // ==========================================
    // 1. STEEL CHASSIS & UNDERCARRIAGE FRAME
    // ==========================================
    const chassisMat = new THREE.MeshStandardMaterial({
      color: this.chassisColor,
      metalness: 0.7,
      roughness: 0.5
    });

    // Longitudinal Frame Rails (Left and Right)
    const railGeo = new THREE.BoxGeometry(0.16, 0.22, 6.8);
    const leftRail = new THREE.Mesh(railGeo, chassisMat);
    leftRail.position.set(-0.55, 0.55, -0.6);
    leftRail.castShadow = true;
    this.group.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, chassisMat);
    rightRail.position.set(0.55, 0.55, -0.6);
    rightRail.castShadow = true;
    this.group.add(rightRail);

    // Crossmembers
    for (let z = -3.2; z <= 2.2; z += 1.3) {
      const crossGeo = new THREE.BoxGeometry(1.2, 0.14, 0.14);
      const crossMesh = new THREE.Mesh(crossGeo, chassisMat);
      crossMesh.position.set(0, 0.55, z);
      this.group.add(crossMesh);
    }

    // Front & Rear Heavy Axles
    const axleGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.1, 12);
    axleGeo.rotateZ(Math.PI / 2);
    const frontAxle = new THREE.Mesh(axleGeo, chassisMat);
    frontAxle.position.set(0, 0.5, 1.9);
    this.group.add(frontAxle);

    const rearAxle = new THREE.Mesh(axleGeo, chassisMat);
    rearAxle.position.set(0, 0.5, -1.9);
    this.group.add(rearAxle);

    // ==========================================
    // 2. DIESEL TANK, AIR TANKS & SPARE WHEEL
    // ==========================================
    // Cylindrical Diesel Fuel Tank (Left side)
    const fuelTankGeo = new THREE.CylinderGeometry(0.32, 0.32, 1.4, 16);
    fuelTankGeo.rotateX(Math.PI / 2);
    const fuelTankMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.3 });
    const fuelTank = new THREE.Mesh(fuelTankGeo, fuelTankMat);
    fuelTank.position.set(-0.95, 0.55, -0.2);
    fuelTank.castShadow = true;
    this.group.add(fuelTank);

    // Fuel Tank Straps
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    const strapGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.06, 16);
    strapGeo.rotateX(Math.PI / 2);
    const strap1 = new THREE.Mesh(strapGeo, strapMat);
    strap1.position.set(-0.95, 0.55, 0.35);
    const strap2 = new THREE.Mesh(strapGeo, strapMat);
    strap2.position.set(-0.95, 0.55, -0.75);
    this.group.add(strap1, strap2);

    // Compressed Air Tanks (Right side)
    const airTankGeo = new THREE.CylinderGeometry(0.16, 0.16, 1.1, 12);
    airTankGeo.rotateX(Math.PI / 2);
    const airTankMat = new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.6, roughness: 0.4 });
    const airTank1 = new THREE.Mesh(airTankGeo, airTankMat);
    airTank1.position.set(0.92, 0.62, 0.1);
    const airTank2 = new THREE.Mesh(airTankGeo, airTankMat);
    airTank2.position.set(0.92, 0.38, 0.1);
    this.group.add(airTank1, airTank2);

    // Battery Box
    const batteryBoxGeo = new THREE.BoxGeometry(0.45, 0.35, 0.5);
    const batteryBox = new THREE.Mesh(batteryBoxGeo, chassisMat);
    batteryBox.position.set(0.92, 0.52, -0.85);
    this.group.add(batteryBox);

    // Side Underrun Crash Guards (Hazard striped rails)
    const guardMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createHazardStripeTexture('#ffd000', '#111111'),
      roughness: 0.4
    });
    const guardGeo = new THREE.BoxGeometry(0.06, 0.12, 2.5);
    const leftGuard = new THREE.Mesh(guardGeo, guardMat);
    leftGuard.position.set(-1.16, 0.42, -0.3);
    const rightGuard = new THREE.Mesh(guardGeo, guardMat);
    rightGuard.position.set(1.16, 0.42, -0.3);
    this.group.add(leftGuard, rightGuard);

    // ==========================================
    // 3. VERTICAL CHROME EXHAUST STACK (CHIMNEY)
    // ==========================================
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.95, roughness: 0.1 });
    const exhaustPipeGeo = new THREE.CylinderGeometry(0.07, 0.07, 2.6, 16);
    const exhaustPipe = new THREE.Mesh(exhaustPipeGeo, exhaustMat);
    exhaustPipe.position.set(1.05, 2.1, 0.35);
    exhaustPipe.castShadow = true;
    this.group.add(exhaustPipe);

    // Exhaust Perforated Heat Shield
    const shieldGeo = new THREE.CylinderGeometry(0.11, 0.11, 1.4, 16, 1, true);
    const shieldMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.9, roughness: 0.2 });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.position.set(1.05, 1.8, 0.35);
    this.group.add(shield);

    // Curved Top Exhaust Spout
    const spoutGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.35, 16);
    spoutGeo.rotateZ(-Math.PI / 4);
    const spout = new THREE.Mesh(spoutGeo, exhaustMat);
    spout.position.set(1.15, 3.45, 0.35);
    this.group.add(spout);

    // ==========================================
    // 4. FRONT CABIN (TATA/LEYLAND ICONIC CAB)
    // ==========================================
    // Main Cab Shell
    const cabShellGeo = new THREE.BoxGeometry(2.25, 1.6, 1.7);
    const cabShell = new THREE.Mesh(cabShellGeo, this.cabMaterial);
    cabShell.position.set(0, 1.65, 1.25);
    cabShell.castShadow = true;
    this.group.add(cabShell);

    // Rounded Bonnet / Hood (Extends forward)
    const hoodGeo = new THREE.BoxGeometry(2.18, 0.85, 1.15);
    const hood = new THREE.Mesh(hoodGeo, this.cabMaterial);
    hood.position.set(0, 1.15, 2.45);
    hood.castShadow = true;
    this.group.add(hood);

    // Front Chrome Radiator Grille
    const grilleGeo = new THREE.BoxGeometry(1.6, 0.65, 0.12);
    const grilleMesh = new THREE.Mesh(grilleGeo, this.chromeMaterial);
    grilleMesh.position.set(0, 1.15, 3.03);
    this.group.add(grilleMesh);

    // Tata / Ashok Leyland Style Front Emblem
    const emblemGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16);
    emblemGeo.rotateX(Math.PI / 2);
    const emblemMat = new THREE.MeshStandardMaterial({ color: 0x0055aa, metalness: 0.8, roughness: 0.2 });
    const emblem = new THREE.Mesh(emblemGeo, emblemMat);
    emblem.position.set(0, 1.25, 3.1);
    this.group.add(emblem);

    // Front Heavy Bumper with Yellow/Black Hazard Stripes
    const frontBumperMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createHazardStripeTexture('#ffd000', '#111111'),
      roughness: 0.4
    });
    const frontBumperGeo = new THREE.BoxGeometry(2.4, 0.32, 0.28);
    const frontBumper = new THREE.Mesh(frontBumperGeo, frontBumperMat);
    frontBumper.position.set(0, 0.58, 3.05);
    frontBumper.castShadow = true;
    this.group.add(frontBumper);

    // Tow Shackles on Front Bumper
    const shackleGeo = new THREE.TorusGeometry(0.08, 0.025, 8, 16);
    const shackleMat = new THREE.MeshStandardMaterial({ color: 0x990000, metalness: 0.6, roughness: 0.4 });
    const shackleL = new THREE.Mesh(shackleGeo, shackleMat);
    shackleL.position.set(-0.8, 0.58, 3.2);
    const shackleR = new THREE.Mesh(shackleGeo, shackleMat);
    shackleR.position.set(0.8, 0.58, 3.2);
    this.group.add(shackleL, shackleR);

    // Front Split Windshield
    const windshieldGeo = new THREE.PlaneGeometry(1.95, 0.75);
    const windshield = new THREE.Mesh(windshieldGeo, this.glassMaterial);
    windshield.position.set(0, 1.95, 2.11);
    this.group.add(windshield);

    // Center Windshield Divider Pillar (Classic Split Screen)
    const dividerGeo = new THREE.BoxGeometry(0.06, 0.78, 0.04);
    const divider = new THREE.Mesh(dividerGeo, this.cabMaterial);
    divider.position.set(0, 1.95, 2.12);
    this.group.add(divider);

    // Wiper Blades
    const wiperGeo = new THREE.BoxGeometry(0.03, 0.45, 0.02);
    const wiperMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const wiperL = new THREE.Mesh(wiperGeo, wiperMat);
    wiperL.position.set(-0.45, 1.82, 2.13);
    wiperL.rotation.z = -0.3;
    const wiperR = new THREE.Mesh(wiperGeo, wiperMat);
    wiperR.position.set(0.45, 1.82, 2.13);
    wiperR.rotation.z = -0.3;
    this.group.add(wiperL, wiperR);

    // Side Windows (Left and Right)
    const sideWinGeo = new THREE.PlaneGeometry(0.95, 0.6);
    const leftWin = new THREE.Mesh(sideWinGeo, this.glassMaterial);
    leftWin.position.set(-1.13, 1.95, 1.35);
    leftWin.rotation.y = -Math.PI / 2;
    this.group.add(leftWin);

    const rightWin = new THREE.Mesh(sideWinGeo, this.glassMaterial);
    rightWin.position.set(1.13, 1.95, 1.35);
    rightWin.rotation.y = Math.PI / 2;
    this.group.add(rightWin);

    // Heavy-Duty Wing Mirrors on Tubular Steel Arms
    const mirrorArmGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.65, 8);
    const mirrorMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 });
    const mirrorGlassMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.95, roughness: 0.05 });
    const mirrorHousingGeo = new THREE.BoxGeometry(0.12, 0.38, 0.18);

    // Left Wing Mirror
    const armL = new THREE.Mesh(mirrorArmGeo, mirrorMat);
    armL.position.set(-1.3, 1.9, 1.95);
    armL.rotation.z = 0.5;
    const houseL = new THREE.Mesh(mirrorHousingGeo, mirrorMat);
    houseL.position.set(-1.42, 2.05, 1.95);
    const glassL = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.34), mirrorGlassMat);
    glassL.position.set(-1.47, 2.05, 1.95);
    glassL.rotation.y = -Math.PI / 2;
    this.group.add(armL, houseL, glassL);

    // Right Wing Mirror
    const armR = new THREE.Mesh(mirrorArmGeo, mirrorMat);
    armR.position.set(1.3, 1.9, 1.95);
    armR.rotation.z = -0.5;
    const houseR = new THREE.Mesh(mirrorHousingGeo, mirrorMat);
    houseR.position.set(1.42, 2.05, 1.95);
    const glassR = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.34), mirrorGlassMat);
    glassR.position.set(1.47, 2.05, 1.95);
    glassR.rotation.y = Math.PI / 2;
    this.group.add(armR, houseR, glassR);

    // ==========================================
    // 5. ORNATE CABIN ROOF CROWN ("TAJ")
    // ==========================================
    // Arched Wooden Sunshade / Crown structure over cab
    const crownMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createTruckTajTexture(),
      roughness: 0.35
    });
    const crownGeo = new THREE.BoxGeometry(2.35, 0.65, 0.1);
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.set(0, 2.75, 1.95);
    crown.castShadow = true;
    this.group.add(crown);

    // Brass Finials on top of Crown
    const finialGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });
    [-1.0, -0.5, 0, 0.5, 1.0].forEach((x) => {
      const finial = new THREE.Mesh(finialGeo, brassMat);
      finial.position.set(x, 3.15 + (1 - Math.abs(x)) * 0.2, 1.95);
      this.group.add(finial);
    });

    // Roof Clearance Marker Lights (Amber on edges, Green in center)
    const markerGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const amberMarkerMat = new THREE.MeshStandardMaterial({
      color: 0xff9900,
      emissive: 0xff7700,
      emissiveIntensity: 1.2,
      roughness: 0.2
    });
    const greenMarkerMat = new THREE.MeshStandardMaterial({
      color: 0x00ff66,
      emissive: 0x00cc44,
      emissiveIntensity: 1.2,
      roughness: 0.2
    });

    const markL1 = new THREE.Mesh(markerGeo, amberMarkerMat);
    markL1.position.set(-1.1, 2.5, 2.02);
    const markL2 = new THREE.Mesh(markerGeo, amberMarkerMat);
    markL2.position.set(-0.6, 2.5, 2.02);
    const markC = new THREE.Mesh(markerGeo, greenMarkerMat);
    markC.position.set(0, 2.5, 2.02);
    const markR2 = new THREE.Mesh(markerGeo, amberMarkerMat);
    markR2.position.set(0.6, 2.5, 2.02);
    const markR1 = new THREE.Mesh(markerGeo, amberMarkerMat);
    markR1.position.set(1.1, 2.5, 2.02);
    this.group.add(markL1, markL2, markC, markR2, markR1);

    // ==========================================
    // 6. HEADLIGHTS & FRONT ILLUMINATION
    // ==========================================
    // Powerful Forward Road Spotlights
    this.headlightLensMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff5dd,
      emissiveIntensity: 2.5,
      roughness: 0.05
    });
    const bezelMat = this.chromeMaterial;

    const headlightGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16);
    headlightGeo.rotateX(Math.PI / 2);
    const bezelGeo = new THREE.TorusGeometry(0.2, 0.035, 8, 16);

    // Left Headlight
    const headL = new THREE.Mesh(headlightGeo, this.headlightLensMaterial);
    headL.position.set(-0.85, 1.15, 3.03);
    const bezL = new THREE.Mesh(bezelGeo, bezelMat);
    bezL.position.set(-0.85, 1.15, 3.07);
    this.group.add(headL, bezL);

    // Right Headlight
    const headR = new THREE.Mesh(headlightGeo, this.headlightLensMaterial);
    headR.position.set(0.85, 1.15, 3.03);
    const bezR = new THREE.Mesh(bezelGeo, bezelMat);
    bezR.position.set(0.85, 1.15, 3.07);
    this.group.add(headR, bezR);

    // Amber Turn Indicator Pods on Cab Corners
    const indicGeo = new THREE.BoxGeometry(0.18, 0.14, 0.08);
    const indicMat = new THREE.MeshStandardMaterial({
      color: 0xff8800,
      emissive: 0xcc6600,
      emissiveIntensity: 1.2,
      roughness: 0.2
    });
    const indicL = new THREE.Mesh(indicGeo, indicMat);
    indicL.position.set(-1.08, 1.15, 2.98);
    const indicR = new THREE.Mesh(indicGeo, indicMat);
    indicR.position.set(1.08, 1.15, 2.98);
    this.group.add(indicL, indicR);

    // High-Intensity Forward Spotlights (Long Range Main Beams)
    const leftSpot = new THREE.SpotLight(0xfffae6, 220.0, 130, 0.52, 0.6, 1.2);
    leftSpot.position.set(-0.85, 1.15, 3.1);
    leftSpot.target.position.set(-0.85, 0.1, 45);
    this.group.add(leftSpot);
    this.group.add(leftSpot.target);
    this.headlights.push(leftSpot);

    const rightSpot = new THREE.SpotLight(0xfffae6, 220.0, 130, 0.52, 0.6, 1.2);
    rightSpot.position.set(0.85, 1.15, 3.1);
    rightSpot.target.position.set(0.85, 0.1, 45);
    this.group.add(rightSpot);
    this.group.add(rightSpot.target);
    this.headlights.push(rightSpot);

    // Wide Forward Ground Floodlight (Illuminates road directly ahead)
    const floodSpot = new THREE.SpotLight(0xfff0cc, 130.0, 60, 0.85, 0.7, 1.2);
    floodSpot.position.set(0, 1.25, 3.1);
    floodSpot.target.position.set(0, 0.0, 22);
    this.group.add(floodSpot);
    this.group.add(floodSpot.target);
    this.headlights.push(floodSpot);

    // ==========================================
    // 7. CARGO BED ("DALA") WITH INDIAN TRUCK ART
    // ==========================================
    const dalaWidth = 2.4;
    const dalaHeight = 1.45;
    const dalaLength = 4.4;
    const dalaCenterZ = -1.8;

    // Dala Wooden Base Floor
    const floorGeo = new THREE.BoxGeometry(dalaWidth, 0.12, dalaLength);
    const floor = new THREE.Mesh(floorGeo, this.woodMaterial);
    floor.position.set(0, 0.72, dalaCenterZ);
    floor.castShadow = true;
    this.group.add(floor);

    // Dala Side Panels with Authentic Handcrafted Truck Art
    const dalaArtTexture = TextureGenerator.createTruckDalaSideTexture();
    const sidePanelMat = new THREE.MeshStandardMaterial({
      map: dalaArtTexture,
      roughness: 0.4
    });

    // Left Wooden Side Wall
    const leftWallGeo = new THREE.BoxGeometry(0.08, dalaHeight, dalaLength);
    const leftWall = new THREE.Mesh(leftWallGeo, sidePanelMat);
    leftWall.position.set(-dalaWidth / 2, 0.72 + dalaHeight / 2, dalaCenterZ);
    leftWall.castShadow = true;
    this.group.add(leftWall);

    // Right Wooden Side Wall
    const rightWallGeo = new THREE.BoxGeometry(0.08, dalaHeight, dalaLength);
    const rightWall = new THREE.Mesh(rightWallGeo, sidePanelMat);
    rightWall.position.set(dalaWidth / 2, 0.72 + dalaHeight / 2, dalaCenterZ);
    rightWall.castShadow = true;
    this.group.add(rightWall);

    // Front Wall of Cargo Bed (behind cab)
    const frontWallGeo = new THREE.BoxGeometry(dalaWidth, dalaHeight, 0.08);
    const frontWall = new THREE.Mesh(frontWallGeo, this.woodMaterial);
    frontWall.position.set(0, 0.72 + dalaHeight / 2, dalaCenterZ + dalaLength / 2);
    this.group.add(frontWall);

    // Vertical Steel Reinforcement Stakes along the Dala
    const stakeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
    const stakeGeo = new THREE.BoxGeometry(0.1, dalaHeight + 0.2, 0.08);
    for (let z = -3.8; z <= 0.2; z += 1.0) {
      const stakeL = new THREE.Mesh(stakeGeo, stakeMat);
      stakeL.position.set(-dalaWidth / 2 - 0.05, 0.72 + (dalaHeight + 0.2) / 2, z);
      const stakeR = new THREE.Mesh(stakeGeo, stakeMat);
      stakeR.position.set(dalaWidth / 2 + 0.05, 0.72 + (dalaHeight + 0.2) / 2, z);
      this.group.add(stakeL, stakeR);
    }

    // Cargo Tarp / Canvas Load inside Dala (Rich Cargo Pack)
    const cargoGeo = new THREE.BoxGeometry(dalaWidth - 0.25, 1.2, dalaLength - 0.4);
    const cargoMat = new THREE.MeshStandardMaterial({
      color: 0x2e4a38, // Forest green tarpaulin sheet
      roughness: 0.8
    });
    const cargoMesh = new THREE.Mesh(cargoGeo, cargoMat);
    cargoMesh.position.set(0, 1.35, dalaCenterZ);
    cargoMesh.castShadow = true;
    this.group.add(cargoMesh);

    // Cargo Ropes / Tiedowns across tarp
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.9 });
    for (let z = -3.5; z <= -0.1; z += 0.85) {
      const ropeGeo = new THREE.CylinderGeometry(0.015, 0.015, dalaWidth + 0.1, 6);
      ropeGeo.rotateZ(Math.PI / 2);
      const rope = new THREE.Mesh(ropeGeo, ropeMat);
      rope.position.set(0, 1.96, z);
      this.group.add(rope);
    }

    // ==========================================
    // 8. REAR TAILGATE ("HORN OK PLEASE") & BUMPER
    // ==========================================
    const rearZ = dalaCenterZ - dalaLength / 2; // -4.0m

    // Rear Tailgate with Iconic "HORN OK PLEASE"
    const tailgateMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createTruckTailgateTexture(),
      roughness: 0.35
    });
    const tailgateGeo = new THREE.BoxGeometry(dalaWidth, dalaHeight, 0.08);
    const tailgate = new THREE.Mesh(tailgateGeo, tailgateMat);
    tailgate.position.set(0, 0.72 + dalaHeight / 2, rearZ);
    tailgate.castShadow = true;
    this.group.add(tailgate);

    // Rear Lower Bumper (Red & White Hazard Stripes)
    const rearBumperMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createHazardStripeTexture('#d90429', '#ffffff'),
      roughness: 0.4
    });
    const rearBumperGeo = new THREE.BoxGeometry(2.4, 0.28, 0.2);
    const rearBumper = new THREE.Mesh(rearBumperGeo, rearBumperMat);
    rearBumper.position.set(0, 0.48, rearZ - 0.05);
    rearBumper.castShadow = true;
    this.group.add(rearBumper);

    // Reactive Brake Lights
    // Reactive Brake / Running Lights
    this.brakeLightMaterial = new THREE.MeshStandardMaterial({
      color: 0xee1100,
      emissive: 0xaa1100,
      emissiveIntensity: 1.2,
      roughness: 0.2
    });
    const brakeLightGeo = new THREE.BoxGeometry(0.28, 0.16, 0.06);

    const brakeL = new THREE.Mesh(brakeLightGeo, this.brakeLightMaterial);
    brakeL.position.set(-0.85, 0.48, rearZ - 0.16);
    this.group.add(brakeL);
    this.brakeLights.push(brakeL);

    const brakeR = new THREE.Mesh(brakeLightGeo, this.brakeLightMaterial);
    brakeR.position.set(0.85, 0.48, rearZ - 0.16);
    this.group.add(brakeR);
    this.brakeLights.push(brakeR);

    // Upper Rear Corner Clearance Marker Lights (Red & Amber)
    const upperMarkerGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const upperRedMat = new THREE.MeshStandardMaterial({
      color: 0xff2200,
      emissive: 0xff2200,
      emissiveIntensity: 2.0
    });
    const upperMarkL = new THREE.Mesh(upperMarkerGeo, upperRedMat);
    upperMarkL.position.set(-dalaWidth / 2 + 0.08, 0.72 + dalaHeight, rearZ - 0.05);
    const upperMarkR = new THREE.Mesh(upperMarkerGeo, upperRedMat);
    upperMarkR.position.set(dalaWidth / 2 - 0.08, 0.72 + dalaHeight, rearZ - 0.05);
    this.group.add(upperMarkL, upperMarkR);

    // Rubber Mudflaps with "STOP" / "TATA"
    const mudflapMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createMudflapTexture('STOP'),
      roughness: 0.75
    });
    const mudflapGeo = new THREE.BoxGeometry(0.48, 0.5, 0.02);

    const flapL = new THREE.Mesh(mudflapGeo, mudflapMat);
    flapL.position.set(-0.85, 0.22, rearZ - 0.08);
    const flapR = new THREE.Mesh(mudflapGeo, mudflapMat);
    flapR.position.set(0.85, 0.22, rearZ - 0.08);
    this.group.add(flapL, flapR);

    // Hanging Nimbu-Mirchi / Evil Eye Protection Charm under Rear Bumper
    const charmRopeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const charmRopeGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.3, 4);
    const charmRope = new THREE.Mesh(charmRopeGeo, charmRopeMat);
    charmRope.position.set(0, 0.3, rearZ - 0.08);

    const lemonMat = new THREE.MeshStandardMaterial({ color: 0xffea00, roughness: 0.3 });
    const lemon = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), lemonMat);
    lemon.position.set(0, 0.16, rearZ - 0.08);

    const chilliMat = new THREE.MeshStandardMaterial({ color: 0x138808, roughness: 0.4 });
    const chilli = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6), chilliMat);
    chilli.position.set(0, 0.09, rearZ - 0.08);
    chilli.rotation.x = Math.PI;
    this.group.add(charmRope, lemon, chilli);

    // ==========================================
    // 9. 6-WHEEL SYSTEM (FRONT SINGLES + REAR DUALS)
    // ==========================================
    const wheelY = 0.5;
    const wheelZFront = 1.9;
    const wheelZRear = -1.9;
    const frontTrack = 1.05;
    const rearTrack = 1.05;

    this.wheels = {
      frontLeft: this.createSingleWheelMesh(),
      frontRight: this.createSingleWheelMesh(),
      rearLeft: this.createDualWheelMesh(),
      rearRight: this.createDualWheelMesh()
    };

    this.wheels.frontLeft.position.set(-frontTrack, wheelY, wheelZFront);
    this.wheels.frontRight.position.set(frontTrack, wheelY, wheelZFront);
    this.wheels.rearLeft.position.set(-rearTrack, wheelY, wheelZRear);
    this.wheels.rearRight.position.set(rearTrack, wheelY, wheelZRear);

    // Invert right wheels facing
    this.wheels.frontRight.rotation.y = Math.PI;
    this.wheels.rearRight.rotation.y = Math.PI;

    this.group.add(this.wheels.frontLeft);
    this.group.add(this.wheels.frontRight);
    this.group.add(this.wheels.rearLeft);
    this.group.add(this.wheels.rearRight);
  }

  /**
   * Creates a single heavy truck wheel with tread and steel rim.
   */
  private createSingleWheelMesh(): THREE.Group {
    const group = new THREE.Group();

    // Tire geometry
    const tireGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.32, 24);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeo, this.blackRubberMaterial);
    tireMesh.castShadow = true;
    group.add(tireMesh);

    // Painted Steel Rim
    const rimGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.33, 16);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xffcc00, // Vibrant Indian yellow rim
      metalness: 0.7,
      roughness: 0.3
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    group.add(rimMesh);

    // Chrome Center Axle Hubcap
    const hubGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.36, 12);
    hubGeo.rotateZ(Math.PI / 2);
    const hubMesh = new THREE.Mesh(hubGeo, this.chromeMaterial);
    group.add(hubMesh);

    return group;
  }

  /**
   * Creates dual rear wheel pair (2 tires side-by-side per side).
   */
  private createDualWheelMesh(): THREE.Group {
    const group = new THREE.Group();

    const outerTire = this.createSingleWheelMesh();
    outerTire.position.x = -0.15;
    group.add(outerTire);

    const innerTire = this.createSingleWheelMesh();
    innerTire.position.x = 0.15;
    group.add(innerTire);

    return group;
  }

  public setBraking(isBraking: boolean): void {
    if (isBraking) {
      this.brakeLightMaterial.emissive.setHex(0xff1100);
      this.brakeLightMaterial.emissiveIntensity = 3.0;
    } else {
      this.brakeLightMaterial.emissive.setHex(0x440000);
      this.brakeLightMaterial.emissiveIntensity = 0.6;
    }
  }

  public setHeadlightsEnabled(enabled: boolean): void {
    this.headlights.forEach((headlight) => {
      headlight.visible = enabled;
    });
    this.headlightLensMaterial.emissiveIntensity = enabled ? 2.5 : 0;
  }

  public updateWheelVisuals(steerAngle: number, spinDelta: number): void {
    // Steer front wheels (negative steerAngle to turn mesh towards screen right when steerAngle > 0)
    this.wheels.frontLeft.rotation.y = -steerAngle;
    this.wheels.frontRight.rotation.y = Math.PI - steerAngle;

    // Spin all wheels around local X axis
    const spinGroup = (grp: THREE.Group, delta: number) => {
      grp.children.forEach((child) => {
        if (child instanceof THREE.Group) {
          // Dual wheel group
          child.children.forEach((subChild) => {
            subChild.rotation.x += delta;
          });
        } else {
          child.rotation.x += delta;
        }
      });
    };

    spinGroup(this.wheels.frontLeft, spinDelta);
    spinGroup(this.wheels.frontRight, -spinDelta);
    spinGroup(this.wheels.rearLeft, spinDelta);
    spinGroup(this.wheels.rearRight, -spinDelta);
  }
}

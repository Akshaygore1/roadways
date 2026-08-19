import * as THREE from 'three';

export type LightingTheme = 'golden' | 'monsoon' | 'night';

export class Environment {
  public scene: THREE.Scene;
  public dirLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public currentTheme: LightingTheme = 'golden';

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Atmospheric Fog
    this.scene.fog = new THREE.FogExp2(0xf0cf9e, 0.0035);

    // Directional Sunlight (with smooth shadows)
    this.dirLight = new THREE.DirectionalLight(0xfffae6, 2.2);
    this.dirLight.position.set(60, 90, 40);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 300;
    this.dirLight.shadow.bias = -0.0005;

    const shadowD = 60;
    this.dirLight.shadow.camera.left = -shadowD;
    this.dirLight.shadow.camera.right = shadowD;
    this.dirLight.shadow.camera.top = shadowD;
    this.dirLight.shadow.camera.bottom = -shadowD;
    this.scene.add(this.dirLight);

    // Hemisphere Ambient Light
    this.hemiLight = new THREE.HemisphereLight(0xffeedd, 0x5a6650, 1.2);
    this.scene.add(this.hemiLight);

    this.applyTheme('golden');
  }

  public toggleTheme(): LightingTheme {
    if (this.currentTheme === 'golden') {
      this.applyTheme('monsoon');
    } else if (this.currentTheme === 'monsoon') {
      this.applyTheme('night');
    } else {
      this.applyTheme('golden');
    }
    return this.currentTheme;
  }

  public applyTheme(theme: LightingTheme): void {
    this.currentTheme = theme;

    if (theme === 'golden') {
      this.scene.background = new THREE.Color(0xf6d7aa);
      (this.scene.fog as THREE.FogExp2).color.setHex(0xf4d3a4);
      (this.scene.fog as THREE.FogExp2).density = 0.003;

      this.dirLight.color.setHex(0xffecc2);
      this.dirLight.intensity = 2.8;
      this.dirLight.position.set(70, 60, 40);

      this.hemiLight.color.setHex(0xffebd2);
      this.hemiLight.groundColor.setHex(0x6b7754);
      this.hemiLight.intensity = 1.4;
    } else if (theme === 'monsoon') {
      this.scene.background = new THREE.Color(0xb2c8c4);
      (this.scene.fog as THREE.FogExp2).color.setHex(0xb0c5c1);
      (this.scene.fog as THREE.FogExp2).density = 0.004;

      this.dirLight.color.setHex(0xdcebe8);
      this.dirLight.intensity = 2.2;
      this.dirLight.position.set(30, 80, 50);

      this.hemiLight.color.setHex(0xc2ded8);
      this.hemiLight.groundColor.setHex(0x4a6549);
      this.hemiLight.intensity = 1.6;
    } else if (theme === 'night') {
      this.scene.background = new THREE.Color(0x111a2e);
      (this.scene.fog as THREE.FogExp2).color.setHex(0x111a2e);
      (this.scene.fog as THREE.FogExp2).density = 0.002;

      this.dirLight.color.setHex(0x6d8fc7);
      this.dirLight.intensity = 1.1;
      this.dirLight.position.set(40, 70, 30);

      this.hemiLight.color.setHex(0x3d547a);
      this.hemiLight.groundColor.setHex(0x1d2738);
      this.hemiLight.intensity = 1.2;
    }
  }

  public update(targetPosition: THREE.Vector3): void {
    // Keep directional sunlight centered around the player car
    this.dirLight.position.x = targetPosition.x + 60;
    this.dirLight.position.z = targetPosition.z + 40;
    this.dirLight.target.position.copy(targetPosition);
    this.dirLight.target.updateMatrixWorld();
  }
}

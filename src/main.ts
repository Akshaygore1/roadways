import * as THREE from 'three';
import { InputManager } from './core/Input';
import { AudioManager } from './core/Audio';
import { RoadManager } from './world/RoadManager';
import { Environment } from './world/Environment';
import { CarController } from './vehicle/CarController';
import { FollowCamera } from './camera/FollowCamera';
import { HUD } from './ui/HUD';

class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  
  private input: InputManager;
  private audio: AudioManager;
  private roadManager: RoadManager;
  private environment: Environment;
  private car: CarController;
  private followCamera: FollowCamera;
  private hud: HUD;
  
  private lastTime: number = performance.now();

  constructor() {
    // 1. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    const container = document.getElementById('canvas-container')!;
    container.appendChild(this.renderer.domElement);

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // 3. Core Systems
    this.input = new InputManager();
    this.audio = new AudioManager();
    this.environment = new Environment(this.scene);
    this.roadManager = new RoadManager(this.scene);
    this.car = new CarController(this.scene, this.roadManager, this.input);
    this.followCamera = new FollowCamera(this.camera, this.car, this.renderer.domElement);
    (window as any).game = this;

    // 4. UI / HUD
    this.hud = new HUD(
      this.followCamera,
      this.environment,
      () => {
        this.car.reset();
        this.hud.updateAutopilotText(false);
      },
      () => {
        const enabled = this.car.toggleAutopilot();
        this.hud.updateAutopilotText(enabled);
      },
      () => this.car.toggleHeadlights(),
      () => {
        this.audio.playIndianAirHorn();
      }
    );

    // 5. Input key callbacks
    this.input.onHorn = () => {
      this.audio.playIndianAirHorn();
    };

    this.input.onCameraToggle = () => {
      const mode = this.followCamera.toggleMode();
      this.hud.updateCameraText(mode);
    };

    this.input.onReset = () => {
      this.car.reset();
      this.hud.updateAutopilotText(false);
    };

    this.input.onThemeToggle = () => {
      const theme = this.environment.toggleTheme();
      this.hud.updateThemeText(theme);
    };

    this.input.onHeadlightsToggle = () => {
      const enabled = this.car.toggleHeadlights();
      this.hud.updateHeadlightState(enabled);
    };

    this.input.onAutopilotToggle = () => {
      const enabled = this.car.toggleAutopilot();
      this.hud.updateAutopilotText(enabled);
    };

    // 6. Window Resize
    window.addEventListener('resize', this.onResize.bind(this));

    // 7. Start Loop
    this.animate();
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000.0, 0.1);
    this.lastTime = now;

    // Update Systems
    this.input.update(delta);
    this.car.update(delta);
    this.roadManager.update(this.car.position);
    this.environment.update(this.car.position);
    this.followCamera.update(delta);
    this.hud.update(this.car);

    // Render Frame
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});

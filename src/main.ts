import * as THREE from 'three';
import { InputManager } from './core/Input';
import { AudioManager } from './core/Audio';
import { RoadManager } from './world/RoadManager';
import { Environment, LightingTheme } from './world/Environment';
import { CarController } from './vehicle/CarController';
import { FollowCamera } from './camera/FollowCamera';
import { HUD } from './ui/HUD';
import { MusicPlayer } from './ui/MusicPlayer';
import type { MusicMoodId } from './config';

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
  private musicPlayer: MusicPlayer;
  
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
    this.musicPlayer = new MusicPlayer();
    (window as any).game = this;

    // 4. UI / HUD
    this.hud = new HUD(
      this.followCamera,
      this.environment,
      () => {
        this.car.reset();
        this.audio.resetEngine();
        this.hud.updateAutopilotText(false);
      },
      () => {
        this.audio.startEngine();
        const enabled = this.car.toggleAutopilot();
        this.hud.updateAutopilotText(enabled);
      },
      () => this.car.toggleHeadlights(),
      () => {
        this.audio.playIndianAirHorn();
      },
      () => this.audio.toggleTruckSound(),
      () => ({
        theme: this.environment.currentTheme,
        radio: this.musicPlayer.getSelectedMood(),
        autopilot: this.car.autopilotEnabled,
        camera: this.followCamera.mode === 'chase' ? 0 : (this.followCamera.mode === 'hood' ? 1 : 2)
      })
    );

    // 5. Input key callbacks
    this.input.onHorn = () => {
      this.audio.playIndianAirHorn();
    };

    this.input.onTruckSoundToggle = () => {
      this.hud.updateTruckSoundState(this.audio.toggleTruckSound());
    };

    this.input.onCameraToggle = () => {
      const mode = this.followCamera.toggleMode();
      this.hud.updateCameraText(mode);
    };

    this.input.onReset = () => {
      this.car.reset();
      this.audio.resetEngine();
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
      this.audio.startEngine();
      const enabled = this.car.toggleAutopilot();
      this.hud.updateAutopilotText(enabled);
    };

    this.input.onGuideToggle = () => {
      this.hud.toggleGuide();
    };

    this.input.onShareTrip = () => {
      this.hud.shareTrip(() => ({
        theme: this.environment.currentTheme,
        radio: this.musicPlayer.getSelectedMood(),
        autopilot: this.car.autopilotEnabled,
        camera: this.followCamera.mode === 'chase' ? 0 : (this.followCamera.mode === 'hood' ? 1 : 2)
      }));
    };

    // Apply URL search parameters (deep linking)
    this.applyUrlParams();

    // 6. User interaction audio starter (Web Audio autoplay policy)
    const startAudioOnInteraction = () => {
      this.audio.startEngine();
      window.removeEventListener('keydown', startAudioOnInteraction);
      window.removeEventListener('pointerdown', startAudioOnInteraction);
      window.removeEventListener('touchstart', startAudioOnInteraction);
    };
    window.addEventListener('keydown', startAudioOnInteraction, { passive: true });
    window.addEventListener('pointerdown', startAudioOnInteraction, { passive: true });
    window.addEventListener('touchstart', startAudioOnInteraction, { passive: true });

    // 7. Window Resize
    window.addEventListener('resize', this.onResize.bind(this));

    // 8. Start Loop
    this.animate();
  }

  private applyUrlParams(): void {
    try {
      const params = new URLSearchParams(window.location.search);

      // Theme
      const themeParam = params.get('theme') as LightingTheme | null;
      if (themeParam && ['golden', 'monsoon', 'night'].includes(themeParam)) {
        this.environment.applyTheme(themeParam);
        this.hud.updateThemeText(themeParam);
      }

      // Radio Mood
      const radioParam = params.get('radio') as MusicMoodId | null;
      if (radioParam && ['highway', '80s-bollywood', 'punjabi', '90s-bollywood'].includes(radioParam)) {
        this.musicPlayer.selectMood(radioParam);
      }

      // Autopilot
      const autopilotParam = params.get('autopilot');
      if (autopilotParam === '1' || autopilotParam === 'true') {
        const enabled = this.car.toggleAutopilot();
        this.hud.updateAutopilotText(enabled);
      }

      // Camera
      const camParam = params.get('cam');
      if (camParam === '0' || camParam === 'chase') {
        this.followCamera.setMode('chase');
        this.hud.updateCameraText('chase');
      } else if (camParam === '1' || camParam === 'hood') {
        this.followCamera.setMode('hood');
        this.hud.updateCameraText('hood');
      } else if (camParam === '2' || camParam === 'drone') {
        this.followCamera.setMode('drone');
        this.hud.updateCameraText('drone');
      }
    } catch {
      // Graceful fallback
    }
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
    this.audio.update(this.car.speedKmh, this.car.effectiveThrottle, this.car.isBraking, delta);
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

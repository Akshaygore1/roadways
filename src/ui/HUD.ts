import { CarController } from '../vehicle/CarController';
import { FollowCamera, CameraMode } from '../camera/FollowCamera';
import { Environment, LightingTheme } from '../world/Environment';
import {
  createIcons,
  Volume2,
  Sun,
  CloudRain,
  Moon,
  Camera,
  Eye,
  Video,
  RotateCcw,
  Navigation,
  Milestone,
  Route,
  Activity,
  Gauge,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp
} from 'lucide';

export class HUD {
  private speedEl: HTMLElement | null;
  private distanceEl: HTMLElement | null;
  private fpsEl: HTMLElement | null;
  private camTextEl: HTMLElement | null;
  private themeTextEl: HTMLElement | null;
  private autopilotEl: HTMLElement | null;

  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  private currentFps: number = 60;

  constructor(
    camera: FollowCamera,
    env: Environment,
    onReset: () => void,
    onAutopilotToggle: () => void,
    onHorn?: () => void
  ) {
    this.speedEl = document.getElementById('hud-speed');
    this.distanceEl = document.getElementById('hud-distance');
    this.fpsEl = document.getElementById('hud-fps');
    this.camTextEl = document.getElementById('cam-text');
    this.themeTextEl = document.getElementById('theme-text');
    this.autopilotEl = document.getElementById('autopilot-indicator');

    // Initialize all Lucide SVG icons
    this.refreshIcons();

    // Button event listeners with focus blurring to prevent spacebar activations
    const btnCamera = document.getElementById('btn-camera');
    if (btnCamera) {
      btnCamera.addEventListener('click', (e) => {
        (e.currentTarget as HTMLElement)?.blur();
        const mode = camera.toggleMode();
        this.updateCameraText(mode);
      });
    }

    const btnTheme = document.getElementById('btn-theme');
    if (btnTheme) {
      btnTheme.addEventListener('click', (e) => {
        (e.currentTarget as HTMLElement)?.blur();
        const theme = env.toggleTheme();
        this.updateThemeText(theme);
      });
    }

    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
      btnReset.addEventListener('click', (e) => {
        (e.currentTarget as HTMLElement)?.blur();
        onReset();
      });
    }

    const btnAutopilot = document.getElementById('btn-autopilot');
    if (btnAutopilot) {
      btnAutopilot.addEventListener('click', (e) => {
        (e.currentTarget as HTMLElement)?.blur();
        onAutopilotToggle();
      });
    }

    const btnHorn = document.getElementById('btn-horn');
    if (btnHorn) {
      btnHorn.addEventListener('click', (e) => {
        (e.currentTarget as HTMLElement)?.blur();
        onHorn?.();
      });
    }
  }

  public refreshIcons(): void {
    createIcons({
      icons: {
        Volume2,
        Sun,
        CloudRain,
        Moon,
        Camera,
        Eye,
        Video,
        RotateCcw,
        Navigation,
        Milestone,
        Route,
        Activity,
        Gauge,
        ChevronLeft,
        ChevronRight,
        ChevronDown,
        ChevronUp
      }
    });
  }

  public updateCameraText(mode: CameraMode): void {
    if (this.camTextEl) {
      if (mode === 'chase') this.camTextEl.textContent = 'Chase Cam';
      else if (mode === 'hood') this.camTextEl.textContent = 'Hood Cam';
      else if (mode === 'drone') this.camTextEl.textContent = 'Drone Cam';
    }
    const camIcon = document.getElementById('cam-icon');
    if (camIcon) {
      const iconName = mode === 'chase' ? 'camera' : (mode === 'hood' ? 'eye' : 'video');
      camIcon.innerHTML = `<i data-lucide="${iconName}"></i>`;
      this.refreshIcons();
    }
  }

  public updateThemeText(theme: LightingTheme): void {
    if (this.themeTextEl) {
      if (theme === 'golden') this.themeTextEl.textContent = 'Golden Hour';
      else if (theme === 'monsoon') this.themeTextEl.textContent = 'Monsoon Green';
      else if (theme === 'night') this.themeTextEl.textContent = 'Night Cruise';
    }
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      const iconName = theme === 'golden' ? 'sun' : (theme === 'monsoon' ? 'cloud-rain' : 'moon');
      themeIcon.innerHTML = `<i data-lucide="${iconName}"></i>`;
      this.refreshIcons();
    }
  }

  public updateAutopilotText(enabled: boolean): void {
    if (this.autopilotEl) {
      this.autopilotEl.style.display = enabled ? 'flex' : 'none';
    }
    const btnAutopilot = document.getElementById('btn-autopilot');
    if (btnAutopilot) {
      btnAutopilot.classList.toggle('autopilot-active', enabled);
    }
  }

  public update(car: CarController): void {
    // Speedometer
    if (this.speedEl) {
      const speed = Math.max(0, Math.round(Math.abs(car.speedKmh)));
      this.speedEl.textContent = speed.toString();
    }

    // Distance
    if (this.distanceEl) {
      this.distanceEl.textContent = `${car.distanceTraveledKm.toFixed(1)} KM`;
    }

    // FPS computation
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;
      if (this.fpsEl) {
        this.fpsEl.textContent = this.currentFps.toString();
      }
    }
  }
}

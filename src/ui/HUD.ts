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
  ChevronUp,
  Lightbulb,
  LightbulbOff
} from 'lucide';

export class HUD {
  private speedEl: HTMLElement | null;
  private distanceEl: HTMLElement | null;
  private fpsEl: HTMLElement | null;
  private autopilotEl: HTMLElement | null;

  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  private currentFps: number = 60;

  constructor(
    camera: FollowCamera,
    env: Environment,
    onReset: () => void,
    onAutopilotToggle: () => void,
    onHeadlightsToggle: () => boolean,
    onHorn?: () => void
  ) {
    this.speedEl = document.getElementById('hud-speed');
    this.distanceEl = document.getElementById('hud-distance');
    this.fpsEl = document.getElementById('hud-fps');
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

    const btnHeadlights = document.getElementById('btn-headlights');
    if (btnHeadlights) {
      btnHeadlights.addEventListener('click', (e) => {
        (e.currentTarget as HTMLElement)?.blur();
        this.updateHeadlightState(onHeadlightsToggle());
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
        ChevronUp,
        Lightbulb,
        LightbulbOff
      }
    });
  }

  public updateCameraText(mode: CameraMode): void {
    const btnCamera = document.getElementById('btn-camera');
    const modeName = mode === 'chase' ? 'Chase Cam' : (mode === 'hood' ? 'Hood Cam' : 'Drone Cam');
    if (btnCamera) {
      btnCamera.title = `Switch Camera (C) [${modeName}]`;
      btnCamera.setAttribute('aria-label', `Switch Camera, currently ${modeName}`);
    }
    const camIcon = document.getElementById('cam-icon');
    if (camIcon) {
      const iconName = mode === 'chase' ? 'camera' : (mode === 'hood' ? 'eye' : 'video');
      camIcon.innerHTML = `<i data-lucide="${iconName}"></i>`;
      this.refreshIcons();
    }
  }

  public updateThemeText(theme: LightingTheme): void {
    const btnTheme = document.getElementById('btn-theme');
    const themeName = theme === 'golden' ? 'Golden Hour' : (theme === 'monsoon' ? 'Monsoon Green' : 'Night Cruise');
    if (btnTheme) {
      btnTheme.title = `Toggle Lighting Preset (T) [${themeName}]`;
      btnTheme.setAttribute('aria-label', `Toggle Lighting Preset, currently ${themeName}`);
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
      btnAutopilot.setAttribute('aria-pressed', enabled.toString());
      btnAutopilot.setAttribute('aria-label', enabled ? 'Disengage Autopilot' : 'Engage Autopilot');
      btnAutopilot.title = `${enabled ? 'Disengage' : 'Toggle'} Autopilot (P)`;
    }
  }

  public updateHeadlightState(enabled: boolean): void {
    const button = document.getElementById('btn-headlights');
    const icon = document.getElementById('headlights-icon');

    if (button) {
      button.classList.toggle('headlights-active', enabled);
      button.setAttribute('aria-pressed', enabled.toString());
      button.setAttribute('aria-label', enabled ? 'Turn headlights off' : 'Turn headlights on');
      button.title = `${enabled ? 'Turn Off' : 'Turn On'} Headlights (L)`;
    }
    if (icon) {
      icon.innerHTML = `<i data-lucide="${enabled ? 'lightbulb' : 'lightbulb-off'}"></i>`;
      this.refreshIcons();
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

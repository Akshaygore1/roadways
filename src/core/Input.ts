export class InputManager {
  public throttle: number = 0;   // -1 (reverse/brake) to +1 (accelerate)
  public steering: number = 0;   // -1 (left) to +1 (right)
  public handbrake: boolean = false;
  public onCameraToggle?: () => void;
  public onReset?: () => void;
  public onThemeToggle?: () => void;
  public onHeadlightsToggle?: () => void;
  public onAutopilotToggle?: () => void;
  public onHorn?: () => void;

  private keys: Record<string, boolean> = {};

  constructor() {
    this.setupKeyboard();
    this.setupTouch();
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      // Prevent space and arrow keys from scrolling page or triggering focused buttons
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      // Blur active element so space doesn't activate buttons
      if (document.activeElement && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      this.keys[e.code] = true;

      if (e.code === 'KeyC') {
        this.onCameraToggle?.();
      } else if (e.code === 'KeyR') {
        this.onReset?.();
      } else if (e.code === 'KeyT') {
        this.onThemeToggle?.();
      } else if (e.code === 'KeyL' && !e.repeat) {
        this.onHeadlightsToggle?.();
      } else if (e.code === 'KeyP') {
        this.onAutopilotToggle?.();
      } else if (e.code === 'KeyH') {
        this.onHorn?.();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      this.keys[e.code] = false;
    });

    window.addEventListener('blur', () => this.releaseInputs());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.releaseInputs();
      }
    });
  }

  private releaseInputs(): void {
    this.keys = {};
    this.throttle = 0;
    this.steering = 0;
    this.handbrake = false;
  }

  private setupTouch(): void {
    const btnGas = document.getElementById('btn-gas');
    const btnBrake = document.getElementById('btn-brake');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');

    const bindTouch = (el: HTMLElement | null, key: string) => {
      if (!el) return;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.keys[key] = true;
      });
      const release = (e: Event) => {
        e.preventDefault();
        this.keys[key] = false;
      };
      el.addEventListener('pointerup', release);
      el.addEventListener('pointerleave', release);
      el.addEventListener('pointercancel', release);
    };

    bindTouch(btnGas, 'KeyW');
    bindTouch(btnBrake, 'KeyS');
    bindTouch(btnLeft, 'KeyA');
    bindTouch(btnRight, 'KeyD');
  }

  public update(delta: number): void {
    let targetThrottle = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) targetThrottle += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) targetThrottle -= 1;

    let targetSteer = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) targetSteer -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) targetSteer += 1;

    this.handbrake = !!this.keys['Space'];

    // Smooth input interpolation
    const steerSpeed = 8.0;
    this.steering += (targetSteer - this.steering) * Math.min(1, delta * steerSpeed);
    this.throttle += (targetThrottle - this.throttle) * Math.min(1, delta * 10.0);
  }
}

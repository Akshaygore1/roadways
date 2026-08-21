import { expect, test } from '@playwright/test';

const readNumber = async (text: Promise<string | null>): Promise<number> => {
  return Number.parseFloat((await text) ?? '0');
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('loads the simulator canvas and initial HUD', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));
  await page.reload();

  const canvas = page.locator('#canvas-container canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(async () => canvas.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0;
  })).toBe(true);

  await expect(page.locator('#hud-speed')).toHaveText('0');
  await expect(page.locator('#hud-distance')).toHaveText('0.0 KM');
  await expect(page.locator('#hud-nh')).toHaveText('NH 44');
  expect(pageErrors).toEqual([]);
});

test('cycles camera and lighting presets with buttons and keyboard', async ({ page }, testInfo) => {
  const cameraBtn = page.locator('#btn-camera');
  const themeBtn = page.locator('#btn-theme');

  if (testInfo.project.name === 'chromium-desktop') {
    const canvas = page.locator('#canvas-container canvas');
    const bounds = await canvas.boundingBox();
    expect(bounds).not.toBeNull();
    const viewClip = {
      x: bounds!.x + bounds!.width * 0.5 - 100,
      y: bounds!.y + bounds!.height * 0.5 - 100,
      width: 200,
      height: 200
    };
    const captureView = () => page.screenshot({ clip: viewClip });
    const waitForFrames = () => page.evaluate(() => new Promise<void>((resolve) => {
      let framesRemaining = 5;
      const nextFrame = () => {
        framesRemaining--;
        if (framesRemaining === 0) {
          resolve();
        } else {
          requestAnimationFrame(nextFrame);
        }
      };
      requestAnimationFrame(nextFrame);
    }));

    await expect(canvas).toHaveCSS('cursor', 'grab');
    const automaticView = await captureView();

    const startX = bounds!.x + bounds!.width * 0.5;
    const startY = bounds!.y + bounds!.height * 0.5;
    await page.mouse.move(startX, startY);
    await page.mouse.down({ button: 'left' });
    await expect(canvas).toHaveCSS('cursor', 'grabbing');
    await page.mouse.move(startX + 120, startY - 50, { steps: 6 });
    await page.mouse.up({ button: 'left' });
    await expect(canvas).toHaveCSS('cursor', 'grab');

    const orbitView = await captureView();
    expect(orbitView.equals(automaticView)).toBe(false);

    await waitForFrames();
    const persistedView = await captureView();
    expect(persistedView.equals(orbitView)).toBe(true);

    await page.mouse.move(startX, startY);
    await page.mouse.wheel(0, 500);
    const zoomedView = await captureView();
    expect(zoomedView.equals(persistedView)).toBe(false);

    await cameraBtn.click();
    await expect(cameraBtn.locator('[data-lucide="eye"]')).toBeVisible();
    const presetView = await captureView();
    expect(presetView.equals(zoomedView)).toBe(false);
  } else {
    await expect(cameraBtn.locator('[data-lucide="camera"]')).toBeVisible();
    await cameraBtn.click();
    await expect(cameraBtn.locator('[data-lucide="eye"]')).toBeVisible();
  }

  await page.keyboard.press('c');
  await expect(cameraBtn.locator('[data-lucide="video"]')).toBeVisible();

  await expect(themeBtn.locator('[data-lucide="sun"]')).toBeVisible();
  await themeBtn.click();
  await expect(themeBtn.locator('[data-lucide="cloud-rain"]')).toBeVisible();
  await page.keyboard.press('t');
  await expect(themeBtn.locator('[data-lucide="moon"]')).toBeVisible();
});

test('toggles headlights independently with the button and keyboard', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Keyboard state coverage runs once');

  const button = page.locator('#btn-headlights');

  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(button).toHaveAttribute('aria-label', 'Turn headlights off');
  await expect(button).toHaveClass(/headlights-active/);
  await expect(button.locator('[data-lucide="lightbulb"]')).toBeVisible();

  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await expect(button).toHaveAttribute('aria-label', 'Turn headlights on');
  await expect(button).not.toHaveClass(/headlights-active/);
  await expect(button.locator('[data-lucide="lightbulb-off"]')).toBeVisible();

  await page.keyboard.press('l');
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(button.locator('[data-lucide="lightbulb"]')).toBeVisible();

  await page.keyboard.press('t');
  await expect(page.locator('#btn-theme [data-lucide="cloud-rain"]')).toBeVisible();
  await expect(button).toHaveAttribute('aria-pressed', 'true');

  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyL', repeat: true }));
  });
  await expect(button).toHaveAttribute('aria-pressed', 'true');
});

test('toggles autopilot with the button and keyboard', async ({ page }) => {
  const button = page.locator('#btn-autopilot');
  const indicator = page.locator('#autopilot-indicator');

  await expect(indicator).toBeHidden();
  await expect(button).not.toHaveClass(/autopilot-active/);

  await button.click();
  await expect(indicator).toBeVisible();
  await expect(button).toHaveClass(/autopilot-active/);

  await page.keyboard.press('p');
  await expect(indicator).toBeHidden();
  await expect(button).not.toHaveClass(/autopilot-active/);
});

test('drives with the keyboard and resets the HUD metrics', async ({ page }) => {
  const speed = page.locator('#hud-speed');
  const distance = page.locator('#hud-distance');

  await page.keyboard.down('w');
  try {
    await expect.poll(() => readNumber(speed.textContent()), { timeout: 5_000 })
      .toBeGreaterThan(0);
    await expect.poll(() => readNumber(distance.textContent()), { timeout: 10_000 })
      .toBeGreaterThan(0);
  } finally {
    await page.keyboard.up('w');
  }

  await page.locator('#btn-reset').click();
  await expect(speed).toHaveText('0');
  await expect(distance).toHaveText('0.0 KM');
});

test('mobile touch controls accelerate the truck', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'Mobile Chromium coverage only');

  const touchControls = page.locator('.touch-controls');
  const gas = page.locator('#btn-gas');
  const speed = page.locator('#hud-speed');

  await expect(touchControls).toBeVisible();
  await expect(gas).toBeVisible();

  await gas.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true });
  try {
    await expect.poll(() => readNumber(speed.textContent()), { timeout: 5_000 })
      .toBeGreaterThan(0);
  } finally {
    await gas.dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true });
  }
});

test('shows the aligned keyboard guide on desktop and hides it on mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Custom viewport coverage runs once');

  const guide = page.locator('.controls-hint');
  await expect(guide).toBeVisible();
  await expect(guide.locator('.control-row')).toHaveCount(9);
  await expect(guide).toContainText('Headlights');
  await expect(guide.locator('.control-row', { hasText: 'Headlights' }).locator('.key-badge')).toHaveText('L');

  await page.setViewportSize({ width: 412, height: 915 });
  await expect(guide).toBeHidden();
});

test('keeps HUD controls within representative viewports', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Custom viewport coverage runs once');

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 800, height: 800 },
    { width: 412, height: 915 }
  ]) {
    await page.setViewportSize(viewport);

    const bounds = await page.evaluate(() => {
      const rect = (selector: string) => {
        const bounds = document.querySelector(selector)?.getBoundingClientRect();
        return bounds && {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        };
      };
      return {
        toolbar: rect('.top-controls'),
        bottom: rect('.bottom-bar'),
        touch: rect('.touch-controls')
      };
    });
    expect(bounds.toolbar).not.toBeNull();
    expect(bounds.toolbar!.x).toBeGreaterThanOrEqual(0);
    expect(bounds.toolbar!.x + bounds.toolbar!.width).toBeLessThanOrEqual(viewport.width + 1);

    if (viewport.width <= 768) {
      expect(bounds.bottom).not.toBeNull();
      expect(bounds.touch).not.toBeNull();
      expect(bounds.bottom!.y + bounds.bottom!.height).toBeLessThanOrEqual(bounds.touch!.y);
    }
  }
});

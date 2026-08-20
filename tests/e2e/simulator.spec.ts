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

test('cycles camera and lighting labels with buttons and keyboard', async ({ page }) => {
  const cameraLabel = page.locator('#cam-text');
  const themeLabel = page.locator('#theme-text');

  await expect(cameraLabel).toHaveText('Chase Cam');
  await page.locator('#btn-camera').click();
  await expect(cameraLabel).toHaveText('Hood Cam');
  await page.keyboard.press('c');
  await expect(cameraLabel).toHaveText('Drone Cam');

  await expect(themeLabel).toHaveText('Golden Hour');
  await page.locator('#btn-theme').click();
  await expect(themeLabel).toHaveText('Monsoon Green');
  await page.keyboard.press('t');
  await expect(themeLabel).toHaveText('Night Cruise');
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

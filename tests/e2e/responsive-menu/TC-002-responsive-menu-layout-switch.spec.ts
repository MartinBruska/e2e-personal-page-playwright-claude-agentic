import { test, expect } from '../../fixtures';
import { MENU_ITEM_ORDER } from '../../components/menu.component';
import { trackConsoleErrors } from '../../helpers/console-errors';

// TC-002: Responsive Menu Layout Switch
// Source: tests/test_cases/responsive-menu/TC-002-responsive-menu-layout-switch.md

/**
 * Reads each menu item's inline `style.transform`, which directly encodes the
 * `startAngle`/`rotationAngle` React computed once at render time (e.g.
 * `translateY(-50%) rotate(-90deg) translate(6rem) rotate(90deg)`). This is a synchronous
 * DOM read of a value React sets once (not CSS-transitioned), so it needs no
 * animation/visibility settling -- unlike a `boundingBox()` read, it is also reliable for
 * items that end up positioned outside the current viewport (see Step 4).
 */
async function menuItemTransforms(homePage: import('../../pages/home.page').HomePage) {
  const transforms: string[] = [];
  for (const name of MENU_ITEM_ORDER) {
    transforms.push(await homePage.menu.item(name).evaluate((el) => (el as HTMLElement).style.transform));
  }
  return transforms;
}

/** Mobile arc (startAngle=0, rotationAngle=90): translateY(0px), rotate() sweeps 0 -> 90deg. */
function isMobileArc(transforms: string[]): boolean {
  return transforms.every((t) => t.startsWith('translateY(0px)')) && transforms[0].includes('rotate(0deg)');
}

/** Desktop arc (startAngle=-90, rotationAngle=180): translateY(-50%), rotate() sweeps -90 -> 90deg. */
function isDesktopArc(transforms: string[]): boolean {
  return transforms.every((t) => t.startsWith('translateY(-50%)')) && transforms[0].includes('rotate(-90deg)');
}

test.describe('TC-002: Responsive Menu Layout Switch @cross-browser', () => {
  // Steps 1-4 use page.setViewportSize() and must run only on the desktop-engine projects
  // (chromium/firefox/webkit), never on the device-emulation projects (Mobile Chrome/Mobile
  // Safari), which already ship a fixed device viewport/UA/touch context of their own.
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      ['Mobile Chrome', 'Mobile Safari'].includes(testInfo.project.name),
      'Steps 1-4 use page.setViewportSize() and must not run under device-emulation projects; see Step 5 below.'
    );
  });

  test('Step 1: mobile viewport (375x812) renders the mobile arc with no horizontal overflow', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await homePage.goto();
    await homePage.menu.open();

    await test.step('menu container is active', async () => {
      await expect(homePage.menu.container).toHaveClass(/menu-active/);
    });

    await test.step('items are laid out along the mobile arc (startAngle=0, translateY(0px), rotate 0->90deg)', async () => {
      const transforms = await menuItemTransforms(homePage);
      expect(isMobileArc(transforms)).toBe(true);
      expect(isDesktopArc(transforms)).toBe(false);
    });

    await test.step('no horizontal overflow and all items stay within the viewport', async () => {
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(375);
      for (const name of MENU_ITEM_ORDER) {
        const box = await homePage.menu.item(name).boundingBox();
        expect(box?.x).toBeGreaterThanOrEqual(0);
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375);
      }
    });
  });

  test('Step 2: desktop viewport (1440x900) renders the desktop arc, distinct from mobile', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await homePage.goto();
    await homePage.menu.open();

    await test.step('menu container is active', async () => {
      await expect(homePage.menu.container).toHaveClass(/menu-active/);
    });

    await test.step('items are laid out along the desktop arc (startAngle=-90, translateY(-50%), rotate -90->90deg), distinct from mobile', async () => {
      const transforms = await menuItemTransforms(homePage);
      expect(isDesktopArc(transforms)).toBe(true);
      expect(isMobileArc(transforms)).toBe(false);
    });

    await test.step('menu toggle still opens/closes identically at this width', async () => {
      await homePage.menu.closeViaBackdrop();
      await expect(homePage.menu.container).not.toHaveClass(/menu-active/);
      await homePage.menu.open();
      await expect(homePage.menu.container).toHaveClass(/menu-active/);
    });
  });

  test('Step 3: breakpoint boundary at 768px (767 mobile, 768 mobile-inclusive, 769 desktop)', async ({ homePage, page }) => {
    await test.step('767px matches the mobile media query', async () => {
      await page.setViewportSize({ width: 767, height: 900 });
      await homePage.goto();
      expect(await page.evaluate(() => window.matchMedia('(max-width: 768px)').matches)).toBe(true);
    });

    await test.step('768px is the inclusive boundary and still matches the mobile media query', async () => {
      await page.setViewportSize({ width: 768, height: 900 });
      await homePage.goto();
      expect(await page.evaluate(() => window.matchMedia('(max-width: 768px)').matches)).toBe(true);
    });

    await test.step('769px does not match the mobile media query (desktop arc applies)', async () => {
      await page.setViewportSize({ width: 769, height: 900 });
      await homePage.goto();
      expect(await page.evaluate(() => window.matchMedia('(max-width: 768px)').matches)).toBe(false);
    });
  });

  test('Step 4: known gap - in-session resize does not re-trigger the layout (documented limitation)', async ({ homePage, page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await homePage.goto();
    await homePage.menu.open();
    expect(isDesktopArc(await menuItemTransforms(homePage))).toBe(true);

    await test.step('resize to mobile dimensions without reloading', async () => {
      await page.setViewportSize({ width: 375, height: 812 });
    });

    await test.step('menu remains in the desktop arc shape (documented known limitation, TEST_STRATEGY §9.3)', async () => {
      // If this starts failing (the menu DOES re-layout to the mobile arc), that is a
      // positive fix -- update this assertion to expect the mobile arc instead.
      const transformsAfterResize = await menuItemTransforms(homePage);
      expect(isDesktopArc(transformsAfterResize)).toBe(true);
    });
  });

  test.describe('Edge Case: toggle open/close/backdrop-close at both anchor viewports', () => {
    for (const vp of [
      { name: 'mobile', width: 375, height: 812 },
      { name: 'desktop', width: 1440, height: 900 },
    ]) {
      test(`${vp.name} (${vp.width}x${vp.height}): toggle opens on first click, closes on second click, and closes via backdrop`, async ({
        homePage,
        page,
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await homePage.goto();

        await homePage.menu.open();
        await expect(homePage.menu.container).toHaveClass(/menu-active/);

        await homePage.menu.open();
        await expect(homePage.menu.container).not.toHaveClass(/menu-active/);

        await homePage.menu.open();
        await homePage.menu.closeViaBackdrop();
        await expect(homePage.menu.container).not.toHaveClass(/menu-active/);
      });
    }
  });

  test('zero uncaught JavaScript errors across all viewport transitions', async ({ homePage, page }) => {
    const errors = trackConsoleErrors(page);

    for (const width of [375, 767, 768, 769, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await homePage.goto();
      await homePage.menu.open();
      await homePage.menu.closeViaBackdrop();
    }

    expect(errors).toEqual([]);
  });
});

test.describe('TC-002 Step 5: Mobile device-emulation projects (Mobile Chrome / Mobile Safari)', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      !['Mobile Chrome', 'Mobile Safari'].includes(testInfo.project.name),
      'Runs exclusively under the Mobile Chrome (Pixel 5) / Mobile Safari (iPhone 12) projects.'
    );
  });

  test('mobile arc renders under real device emulation and tap activates a menu item', async ({ homePage, page }) => {
    await homePage.goto();

    await test.step('matchMedia mobile query matches under the device viewport', async () => {
      expect(await page.evaluate(() => window.matchMedia('(max-width: 768px)').matches)).toBe(true);
    });

    await test.step('tap opens the menu (mobile arc)', async () => {
      await homePage.menu.toggle.tap();
      await expect(homePage.menu.container).toHaveClass(/menu-active/);
    });

    await test.step('tap on a menu item triggers the same scroll-to-section behavior as a click', async () => {
      await homePage.menu.item('about').tap();
      await expect(homePage.aboutHeading).toBeInViewport();
    });

    await test.step('no horizontal overflow within the emulated viewport', async () => {
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const viewportWidth = page.viewportSize()?.width ?? 0;
      expect(scrollWidth).toBeLessThanOrEqual(viewportWidth);
    });
  });
});

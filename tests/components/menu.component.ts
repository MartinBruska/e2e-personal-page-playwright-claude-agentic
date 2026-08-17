import { type Page, type Locator } from '@playwright/test';

/** Visual/logical tab order of the radial menu items (per docs/TEST_CASE_TEMPLATE.md-driven TC-001/TC-004). */
export const MENU_ITEM_ORDER = ['go to top', 'about', 'work experience', 'education'] as const;
export type MenuItemName = (typeof MENU_ITEM_ORDER)[number];

/**
 * Radial menu (`button.menu-toggle` + 4x `button.menu-item` + `div.menu-backdrop`).
 * Reused across TC-001 (navigation), TC-002 (responsive geometry) and TC-004 (keyboard).
 */
export class MenuComponent {
  /** Menu toggle button. Accessible name collapses to "ME NU" (not "MENU") because the
   *  label markup is `ME<br>NU` -- match with a whitespace-tolerant regex rather than the
   *  literal string written in the TC docs. */
  readonly toggle: Locator;
  readonly backdrop: Locator;
  readonly container: Locator;

  constructor(private readonly page: Page) {
    this.toggle = page.getByRole('button', { name: /me\s*nu/i });
    this.backdrop = page.locator('div.menu-backdrop');
    this.container = page.locator('div.menu');
  }

  item(name: MenuItemName): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  async open() {
    await this.toggle.click();
  }

  async openWithKeyboard() {
    await this.toggle.focus();
    await this.page.keyboard.press('Enter');
  }

  async clickItem(name: MenuItemName) {
    await this.item(name).click();
  }

  /** Clicks the full-viewport backdrop at a corner point that never overlaps the
   *  radial arc of menu items or the toggle button itself. */
  async closeViaBackdrop() {
    const box = await this.backdrop.boundingBox();
    if (!box) {
      throw new Error('menu-backdrop is not visible; open the menu before calling closeViaBackdrop()');
    }
    await this.page.mouse.click(box.x + box.width - 10, box.y + box.height - 10);
  }
}

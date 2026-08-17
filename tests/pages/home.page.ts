import { type Page, type Locator } from '@playwright/test';
import { MenuComponent } from '../components/menu.component';
import { SocialLinksComponent } from '../components/social-links.component';

/** The single-page personal site (hero + about + work experience + education + footer). */
export class HomePage {
  readonly menu: MenuComponent;
  /** Social/CV links rendered inside the hero `TopSection` (`div.top-section`). */
  readonly heroSocialLinks: SocialLinksComponent;
  /** Duplicate social/CV links rendered inside the page footer (`div.footer`). */
  readonly footerSocialLinks: SocialLinksComponent;

  readonly heroHeading: Locator;
  readonly heroTagline: Locator;
  readonly heroPortrait: Locator;
  readonly aboutHeading: Locator;
  readonly workExperienceHeading: Locator;
  readonly educationHeading: Locator;
  readonly footerCopyright: Locator;

  constructor(private readonly page: Page) {
    this.menu = new MenuComponent(page);
    this.heroSocialLinks = new SocialLinksComponent(page.locator('div.top-section'));
    this.footerSocialLinks = new SocialLinksComponent(page.locator('div.footer'));

    this.heroHeading = page.getByRole('heading', { level: 1, name: 'martin bruska' });
    this.heroTagline = page.getByText('test automation engineer', { exact: true });
    this.heroPortrait = page.getByRole('img', { name: 'martin bruska portrait' });
    this.aboutHeading = page.getByRole('heading', { level: 2, name: 'about' });
    this.workExperienceHeading = page.getByRole('heading', { level: 2, name: 'work experience' });
    this.educationHeading = page.getByRole('heading', { level: 2, name: 'education' });
    this.footerCopyright = page.getByText('Copyright © 2026 All rights reserved');
  }

  /** Navigates home and waits for the React app to hydrate (menu toggle interactive)
   *  before returning, so callers can safely start sending keyboard/mouse input. */
  async goto() {
    await this.page.goto('/');
    await this.menu.toggle.waitFor({ state: 'visible' });
  }

  aboutSubHeading(name: string): Locator {
    return this.page.getByRole('heading', { level: 4, name });
  }

  workExperienceEntry(name: string | RegExp): Locator {
    return this.page.getByRole('heading', { level: 3, name });
  }

  educationSubHeading(name: string): Locator {
    return this.page.getByRole('heading', { level: 4, name });
  }
}

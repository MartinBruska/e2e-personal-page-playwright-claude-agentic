import { type Locator } from '@playwright/test';

export type SocialLinkName = 'GitHub' | 'LinkedIn' | 'Email' | 'CV';

/**
 * The 4 `a.circle-button` external links (GitHub, LinkedIn, Email, CV) rendered by the
 * shared `CircleButton` component. The site renders this same set twice -- once in the
 * hero `TopSection` and once in the page footer -- so this component is instantiated
 * against each region's root locator (see `HomePage.heroSocialLinks` / `footerSocialLinks`)
 * to disambiguate the two identical accessible names.
 */
export class SocialLinksComponent {
  constructor(private readonly root: Locator) {}

  link(name: SocialLinkName): Locator {
    return this.root.getByRole('link', { name, exact: true });
  }
}

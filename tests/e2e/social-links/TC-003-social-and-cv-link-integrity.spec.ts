import { test, expect } from '../../fixtures';
import type { SocialLinkName } from '../../components/social-links.component';

// TC-003: Social & CV Link Integrity
// Source: tests/test_cases/social-links/TC-003-social-and-cv-link-integrity.md
//
// Known security finding (docs/TEST_STRATEGY.md §4.7/§9.2, live-verified during generation):
// CircleButton.js renders `href`/`target`/`onClick`/`className` but never a `rel` attribute,
// so every `target="_blank"` link ships with rel="" instead of "noopener noreferrer". Per the
// doc's explicit instruction, the `rel` assertions below are kept in place (not softened) as
// a regression guard for the fix, and are EXPECTED TO FAIL today.

const EXPECTED_LINKS: Record<SocialLinkName, { href: string; opensNewTab: boolean }> = {
  GitHub: { href: 'https://github.com/MartinBruska', opensNewTab: true },
  LinkedIn: { href: 'https://www.linkedin.com/in/martin-bruska/', opensNewTab: true },
  Email: { href: 'mailto:martin.bruska@gmail.com', opensNewTab: false },
  CV: { href: './Martin_Bruska_CV.pdf', opensNewTab: true },
};

test.describe('TC-003: Social & CV Link Integrity @cross-browser', () => {
  test('Step 1: CV button opens a new tab and the PDF is reachable @smoke', async ({ homePage, page, context }) => {
    await homePage.goto();

    // NOTE (generation-time finding): headless Chromium has no PDF-viewer plugin, so
    // target="_blank" + an `application/pdf` response is intercepted as a browser
    // DOWNLOAD rather than a real page navigation -- the new tab is created (confirming
    // "opens a new tab, does not navigate the existing one") but its `url()` never
    // populates and no 'load' event fires. Playwright surfaces the resolved download URL
    // via the `download` event on the triggering page instead of via `popup.url()`.
    const popupPromise = context.waitForEvent('page');
    const downloadPromise = page.waitForEvent('download');
    await test.step('click the "CV" button in the hero TopSection', async () => {
      await homePage.heroSocialLinks.link('CV').click();
    });

    const [popup, download] = await Promise.all([popupPromise, downloadPromise]);
    await test.step('a new tab opens (does not navigate the existing tab) and resolves to the CV PDF', async () => {
      expect(download.url()).toBe('https://martinbruska.github.io/Martin_Bruska_CV.pdf');
      await expect(page).toHaveURL(/\/$/);
    });

    await test.step('the PDF resolves with 200 OK, application/pdf, and a non-zero body', async () => {
      const response = await page.request.get('https://martinbruska.github.io/Martin_Bruska_CV.pdf');
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/pdf');
      const body = await response.body();
      expect(body.byteLength).toBeGreaterThan(0);
    });

    await popup.close();
  });

  for (const name of ['GitHub', 'LinkedIn', 'Email'] as const) {
    const stepNumber = name === 'GitHub' ? 2 : name === 'LinkedIn' ? 3 : 4;

    test(`Step ${stepNumber}: "${name}" button href and target attributes`, async ({ homePage }) => {
      const link = homePage.heroSocialLinks.link(name);
      await homePage.goto();

      await test.step(`href equals ${EXPECTED_LINKS[name].href}`, async () => {
        await expect(link).toHaveAttribute('href', EXPECTED_LINKS[name].href);
      });

      await test.step('target equals _blank', async () => {
        await expect(link).toHaveAttribute('target', '_blank');
      });
    });

    // Regression guard for the known finding (docs/TEST_STRATEGY.md §4.7/§9.2): CircleButton.js
    // never renders a `rel` attribute, so this assertion fails today. `test.fail()` inverts the
    // outcome so the suite stays green until the day this starts passing -- at which point this
    // test will fail, signalling the fix landed and the `test.fail()` annotation should be removed.
    test(`Step ${stepNumber}: "${name}" button rel="noopener noreferrer" security attribute (known finding, expected to fail today)`, async ({ homePage }) => {
      test.fail();
      const link = homePage.heroSocialLinks.link(name);
      await homePage.goto();

      await expect(link).toHaveAttribute('rel', /noopener/);
      await expect(link).toHaveAttribute('rel', /noreferrer/);
    });
  }

  test('Step 2/3: GitHub and LinkedIn clicks open a new tab rather than navigating the current one', async ({ homePage, page, context }) => {
    await homePage.goto();

    for (const name of ['GitHub', 'LinkedIn'] as const) {
      await test.step(`clicking "${name}" opens a popup, current tab stays on /`, async () => {
        const popupPromise = context.waitForEvent('page');
        await homePage.heroSocialLinks.link(name).click();
        const popup = await popupPromise;
        await popup.waitForLoadState();
        // Some targets (e.g. LinkedIn) redirect and drop a trailing slash; compare with it
        // normalized away rather than asserting byte-for-byte URL equality.
        expect(popup.url().replace(/\/$/, '')).toBe(EXPECTED_LINKS[name].href.replace(/\/$/, ''));
        await expect(page).toHaveURL(/\/$/);
        await popup.close();
      });
    }
  });

  test('Step 5: footer links are consistent with hero links (same href/target/rel, systemic defect)', async ({ homePage }) => {
    await homePage.goto();
    await homePage.footerCopyright.scrollIntoViewIfNeeded();

    for (const name of ['GitHub', 'LinkedIn', 'Email', 'CV'] as const) {
      const heroLink = homePage.heroSocialLinks.link(name);
      const footerLink = homePage.footerSocialLinks.link(name);

      await test.step(`footer "${name}" href matches hero "${name}" href`, async () => {
        const heroHref = await heroLink.getAttribute('href');
        await expect(footerLink).toHaveAttribute('href', heroHref!);
      });

      await test.step(`footer "${name}" carries the same target="_blank" and missing-rel status as hero`, async () => {
        await expect(footerLink).toHaveAttribute('target', '_blank');
        const heroRel = await heroLink.getAttribute('rel');
        const footerRel = await footerLink.getAttribute('rel');
        expect(footerRel).toBe(heroRel);
      });
    }
  });

  test.describe('Edge Case: Mobile Viewport (375x812)', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('all 4 circle buttons remain visible, tappable, and resolve to the same href/target/rel as desktop', async ({ homePage }) => {
      await homePage.goto();

      for (const name of ['GitHub', 'LinkedIn', 'Email', 'CV'] as const) {
        const link = homePage.heroSocialLinks.link(name);
        await test.step(`"${name}" link is visible and matches its desktop href/target`, async () => {
          await expect(link).toBeVisible();
          await expect(link).toHaveAttribute('href', EXPECTED_LINKS[name].href);
          await expect(link).toHaveAttribute('target', '_blank');
        });
      }
    });
  });
});

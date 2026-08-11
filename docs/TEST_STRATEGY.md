# QA Test Strategy — Personal Website (`krit`-based portfolio)

**Author:** QA Test Specialist
**Date:** 2026-08-10
**Application:** Martin Bruska personal portfolio site (React SPA, built on the [krit](https://github.com/9inpachi/krit) template)
**Repository:** `personalPage`

---

## 1. Application Overview

A single-page, config-driven React application (CRA / `react-scripts`) that renders a personal portfolio:

- **Menu** — radial/circular navigation with a toggle button, mobile vs. desktop layouts, smooth-scroll to sections.
- **TopSection** — name, tagline, portrait image, social links (GitHub, LinkedIn, Email, CV download) rendered as `CircleButton`s.
- **CustomSections** — About, Work Experience, Education (data-driven from `src/config/index.js`), rendered via a shared `Section` component.
- **Footer** — copyright/rights text.

Key characteristics that shape the strategy:

- **No backend, no API, no auth, no forms, no state persistence.** Risk surface is entirely front-end: rendering, layout, navigation, responsiveness, accessibility, and static asset delivery.
- **Content is config-driven** (`src/config/index.js`, `src/config/icons.js`) — most "content bugs" are data-entry bugs, not logic bugs, so config-consistency checks matter as much as component logic.
- **Deployment is static**: GitHub Actions (`.github/workflows/deploy.yml`) builds and publishes to GitHub Pages on every push to `master`, gated by `npm test`.
- **Existing coverage**: Jest + React Testing Library unit tests already exist per component (`*.test.js` colocated with each component/section) and one `App.test.js` smoke test. This strategy builds on top of that baseline rather than replacing it.

---

## 2. Objectives

1. Prevent visual/functional regressions from reaching production (GitHub Pages) given the CI pipeline auto-deploys on merge to `master` with no manual gate.
2. Ensure the site is usable and correct across the primary consumption context: recruiters/visitors on desktop and mobile browsers.
3. Guard the two interactive features that carry real logic risk: the **radial menu** (angle math, mobile/desktop breakpoint switching, open/close state) and **smooth-scroll-to-section**.
4. Keep the site accessible (WCAG 2.1 AA-oriented) and performant, since it's a public-facing CV — first impressions matter and it's evaluated by non-technical visitors too.
5. Make config changes (new job, new certification, new icon) low-risk to ship by having tests that validate config-driven rendering generically, not just against today's data.

---

## 3. Risk Assessment (drives prioritization)

| Area | Likelihood of defect | Impact | Priority |
|---|---|---|---|
| Radial menu angle/geometry math (`Menu.js`, `MenuItem`) | Medium — hand-rolled trig/index math, mobile vs desktop branching | Medium (cosmetic but visible) | **High** |
| Mobile vs desktop breakpoint detection (`window.matchMedia`) | Medium — evaluated once per render, no resize listener | Medium (menu breaks mid-session on resize/rotate) | **High** |
| Smooth-scroll-to-section (`ReactDOM.findDOMNode`, `offsetTop`) | Medium — `findDOMNode` is legacy API, deprecated under StrictMode | Medium | **High** |
| External links (GitHub, LinkedIn, mailto, CV PDF) | Low logic risk, high "silent breakage" risk (config typo, moved file) | High (broken CV link = failed first impression) | **High** |
| Config-driven section rendering (experiences/education/certs/courses) | Medium — conditional rendering (`entry.issuer &&`, empty arrays) | Medium | Medium |
| Icon mapping (`Icons[technology]` lookups by string key) | Medium — silent `undefined` render if key typo'd in config | Low/Medium | Medium |
| Responsive/CSS layout (SCSS) | Medium — no automated visual regression today | Medium | Medium |
| Accessibility (tooltips, alt text, keyboard nav of circular menu) | Medium | Medium (public site, reputational) | Medium |
| Build/deploy pipeline | Low (already has CI) | High if broken (site goes dark) | Medium |
| Performance (image size, bundle size) | Low | Low/Medium | Low |
| Cross-browser CSS quirks (Safari, older browsers) | Medium | Low/Medium | Low |

---

## 4. Test Levels & Approach

### 4.1 Unit / Component Tests (Jest + React Testing Library) — *existing, to be extended*

Already in place per component. Strategy: keep these as the fast-feedback foundation; extend coverage for the gaps below rather than duplicating what exists.

**Gaps to close:**

- `Menu.js`:
  - Verify menu opens/closes on toggle click and closes via backdrop click (`closeMenu`).
  - Verify `menuActive` class toggling drives `menu-active` state correctly.
  - Mock `window.matchMedia` to assert **both** mobile (`startAngle=0`) and desktop (`startAngle=-90`) angle branches compute the expected `rotationAngle` per item, including the `menuItems.length === 1` edge case (division by zero guard).
  - Assert `window.scrollTo` is called with `behavior: 'smooth'` and correct `top` when a menu item's `action` fires (mock `ReactDOM.findDOMNode` / use `offsetTop` via jsdom).
  - Regression check: remove the stray `console.log(isMobile)` (dead debug statement) — flag as a defect (see §9).
- `MenuItem` / `MenuToggle`: keyboard accessibility (Tab reaches toggle and items; Enter/Space activates).
- `CircleButton.js`:
  - Renders as `<a>` when `link` prop present, `<button>` otherwise.
  - `target` only applied when `link` present; `size` prop drives inline style width/height in rem.
  - Tooltip title defaults to `''` when `tooltip` prop omitted (no crash).
- `Section.js`: renders `extraClass` conditionally (`section` vs `section <extraClass>`); `headerIcon` clone doesn't throw when icon has existing props.
- `CustomSections.js` / `TopSection.js`: with a **synthetic minimal config** (not the real data) to prove the component is generically correct — e.g. section with `notInMenu: true` excluded from menu, empty `responsibilities`/`certifications`/`courses` arrays don't render their group `<div>` at all (currently guarded by `.length > 0`).
- `App.js`: confirm `document.title` updates when `CommonConfig` changes (currently only tested against real config — add a test with a mocked config module to decouple the test from content edits).

**Config-consistency tests (new, lightweight, high value-per-effort):**
Add a `config/index.test.js` that iterates `WorkExperienceConfig.experiences[].technologies` and `CustomSectionsConfig` icon usages and asserts every referenced key exists in `Icons` from `icons.js`. This turns "someone typos an icon key" from a silent rendering bug into a CI failure.

### 4.2 Integration / DOM-level Tests (RTL, still Jest)

- Full `App` render: menu, top section, sections, and footer all present; clicking a menu item scrolls to the corresponding section ref (assert via mocked `scrollTo`/`offsetTop`, since jsdom has no real layout).
- Social links in `TopSection` resolve to the right `href`/`target` per `CommonConfig.social` entry, including the CV link using `process.env.PUBLIC_URL`.

### 4.3 End-to-End Tests (recommended addition — not yet present)

Unit/RTL tests run in jsdom and cannot verify real layout, CSS media queries, actual smooth scrolling, or real click positions on the radial menu. Recommend introducing **Playwright** (already a technology the site owner uses professionally per the config content, and integrates cleanly with CRA + GitHub Actions):

- Load the deployed/built site, verify page title, hero name/tagline visible.
- Click each menu item, assert the corresponding section scrolls into view (`elementHandle.boundingBox()` or `scrollY` assertions).
- Resize viewport to mobile width (e.g. 375×812) and desktop width (1440×900); assert menu layout switches (angle/position of items differs, toggle button behaves) — this is the one area unit tests structurally cannot cover well since `matchMedia` is mocked, not real.
- Click "CV" social button → new tab opens and PDF is reachable (HTTP 200, correct content-type) rather than a broken link.
- Click GitHub/LinkedIn/Email buttons → correct `href`, opens in new tab (`target=_blank` + `rel=noopener` check — see security note §9).
- Keyboard-only navigation: Tab through menu toggle → menu items → sections; Enter/Space triggers actions.
- Run against Chromium, Firefox, WebKit (Playwright's built-in cross-browser matrix) at minimum for the golden-path flows above.

Run E2E as a separate CI job (or nightly/on-PR against a preview build) so it doesn't slow down the fast unit-test gate already in `deploy.yml`.

### 4.4 Visual Regression Testing (recommended addition)

The radial menu's geometry (`startAngle`, `rotationAngle`, per-item `angle`) is exactly the kind of logic that "looks right" in code review but silently drifts visually. Recommend:

- Playwright's built-in screenshot comparison (`toHaveScreenshot`), or a lightweight tool like `pixelmatch`, capturing: menu closed, menu open (desktop), menu open (mobile), each section, at 2–3 breakpoints.
- Run on PRs touching `*.scss`, `Menu.js`, `MenuItem.js`, `Section.js` to catch unintended layout shifts.

### 4.5 Accessibility Testing (recommended addition)

- Integrate `jest-axe` into existing RTL tests for automated a11y assertions per component (contrast is hard to check in jsdom, but landmark roles, alt text, aria-labels, button semantics are checkable).
- Manual pass with a screen reader (NVDA/VoiceOver) on the menu (radial menus are notoriously hard to make screen-reader-friendly — verify tab order matches visual/logical order, not DOM angle order).
- Verify `<img>` alt text (`TopSection` portrait already has one — good) and icon-only `CircleButton`s have accessible names via the `Tooltip`'s `title` (MUI `Tooltip` sets `aria-describedby`, but confirm it's not the *only* accessible name mechanism for screen readers that don't announce tooltips).
- Color contrast check (automated via Lighthouse or `axe`, since the project intentionally removed dark mode per recent commit history — confirm the remaining single theme meets AA contrast).

### 4.6 Non-Functional Testing

| Type | Approach |
|---|---|
| **Performance** | Lighthouse CI (or manual Lighthouse run) on the built `./build` output — bundle size, image optimization (`martin_image.jpg`, SVG icons), Core Web Vitals (LCP/CLS/INP). Add as a non-blocking CI report initially. |
| **Responsive design** | Manual + Playwright viewport matrix: 375×812 (mobile), 768×1024 (tablet), 1440×900 (desktop), 1920×1080. Menu breakpoint is hard-coded at `768px` — test exactly at, just above, and just below that boundary. |
| **Cross-browser** | Chrome, Firefox, Safari (WebKit), Edge — via Playwright matrix + `browserslist` config already defining supported targets in `package.json`. |
| **Static asset integrity** | Verify all icons in `src/assets/icons/*.svg` referenced by `icons.js` resolve (no 404s), and the CV PDF in `public/` is present and matches what's linked. |
| **SEO/meta** | `public/index.html`, `manifest.json`, `robots.txt` — verify title, description, favicon render correctly for the deployed URL. |

### 4.7 Security (light-touch, appropriate to a static site)

- External links opening in `target="_blank"` should carry `rel="noopener noreferrer"` — check `CircleButton.js`, which currently sets `target` but not `rel`. **Flag as a finding (§9)** — reverse-tabnabbing risk, low severity but a one-line fix.
- Dependency audit (`npm audit`) as part of CI — MUI/Emotion/React dependency tree should be checked periodically for known CVEs, especially since this is a public-facing site.
- Confirm no secrets/PII beyond intentionally-public info (email is intentionally public per config) are exposed in the built bundle.

---

## 5. Test Environments

| Environment | Purpose |
|---|---|
| **Local dev** (`npm start`) | Developer-driven manual smoke testing during feature work. |
| **CI (GitHub Actions)** | `npm test -- --watchAll=false` gates every push to `master` before build/deploy — this is the *only* current quality gate. |
| **Production (GitHub Pages)** | Post-deploy smoke check recommended (see §7) since there is no staging environment — every merge to `master` ships directly to production. |

**Gap:** there is no staging/preview environment. Recommend either a PR-preview deployment (e.g., Netlify/Vercel preview or a GH Pages preview branch) or, at minimum, a required PR check that runs the full test suite (already true) plus a build-success check before merge, since `master` pushes deploy immediately.

---

## 6. Tooling Summary

| Purpose | Tool | Status |
|---|---|---|
| Unit/component tests | Jest + React Testing Library | ✅ In place |
| Config-consistency checks | Jest (plain) | 🔲 To add |
| E2E / cross-browser | Playwright | 🔲 To add |
| Visual regression | Playwright screenshots | 🔲 To add |
| Accessibility | `jest-axe`, Lighthouse, manual screen reader pass | 🔲 To add |
| Performance | Lighthouse CI | 🔲 To add |
| Dependency security | `npm audit` in CI | 🔲 To add |
| CI orchestration | GitHub Actions (`deploy.yml`) | ✅ In place — extend with new jobs |

---

## 7. CI/CD Integration Plan

Current pipeline (`deploy.yml`): checkout → install → **unit tests** → build → deploy. Proposed extension:

```
on PR to master:
  - unit tests (existing)
  - config-consistency tests (new, same job)
  - build (existing, moved earlier as a PR check)
  - lint (if not already covered by CRA's build-time ESLint)
  - accessibility tests (jest-axe, same job)
  - [optional, slower] E2E + visual regression (separate job, can run against the CRA build output via `serve`)

on push to master (existing):
  - unit tests → build → deploy (as today)
  - post-deploy smoke check (new): curl the live GitHub Pages URL, assert 200 + title present
```

Keep the fast unit-test gate exactly as-is for the deploy job (don't slow down deploys), and add the heavier E2E/visual/perf suites as a **PR-time check** so regressions are caught before merge rather than after deploy, given there's no staging environment to catch them first.

---

## 8. Entry / Exit Criteria

**Entry criteria** (start of a test cycle / PR review):
- Code builds locally (`npm run build`) without errors or new warnings.
- All existing unit tests pass.

**Exit criteria** (ready to merge/deploy):
- All unit, config-consistency, and accessibility tests pass in CI.
- No new `npm audit` high/critical vulnerabilities introduced.
- Visual diff (once introduced) reviewed and approved for any UI-affecting change.
- Manual spot-check on at least one mobile and one desktop viewport for any change touching `Menu`, `Section`, `CircleButton`, or SCSS files.

---

## 9. Findings from This Review (worth ticketing, not blocking this strategy doc)

1. ✅ **`Menu.js:80`** — stray `console.log(isMobile)` left in render path; runs on every render in production. Fixed — removed.
2. **`CircleButton.js`** — `target="_blank"` links (GitHub, LinkedIn, CV) have no `rel="noopener noreferrer"`. Minor security/perf best-practice gap (reverse tabnabbing).
3. **`Menu.js` `render()`** — `isMobile` is computed once via `window.matchMedia(...).matches` at render time with no resize/orientation listener, so the menu layout won't update if a user rotates their device or resizes a desktop browser window without a re-render being triggered by something else. Worth a deliberate decision: acceptable (portfolio site, low traffic on rotation) or fix with a `matchMedia` listener + `setState`.
4. **`Menu.scrollToSection`** uses `ReactDOM.findDOMNode`, a legacy/deprecated API incompatible with React `StrictMode` and slated for removal in future React versions — worth migrating to a plain ref (`sectionRefs[name].current` is likely already a DOM node or component instance; confirm and simplify).

These are implementation-level observations surfaced during strategy design, included here for traceability — not exhaustive, and not a substitute for a full code review.

---

## 10. Out of Scope

- Load/stress testing — static site with no backend, not warranted.
- Penetration testing — no auth, no forms, no data persistence; attack surface is minimal (static asset hosting).
- Localization/i18n testing — site is single-language (English) with no i18n infrastructure.

---

## 11. Summary Roadmap

| Priority | Action |
|---|---|
| P0 | ✅ Add config-consistency test (icon key validation) — `src/config/index.test.js`. |
| P0 | ✅ Extend `Menu.js` unit tests for mobile/desktop angle math, single-item division-by-zero guard, and section-scroll offset — `Menu.test.js`, `Menu.singleItem.test.js`. |
| P0 | ✅ Add keyboard-activation tests for `MenuItem`/`MenuToggle`, target/tooltip default tests for `CircleButton`, headerIcon-clone test for `Section`. |
| P0 | ✅ Add generic/synthetic-config tests for `CustomSections`, `TopSection`, and `App` so they're verified against config shape, not just today's content — `*.genericConfig.test.js`. |
| P0 | ✅ Add App-level integration tests: full render of menu/sections/footer, and real-DOM click-to-scroll wiring through `Menu` → `CustomSections` → `Section` refs — `App.test.js`. |
| P1 | Introduce Playwright for E2E smoke (menu navigation, external links, CV download) across Chromium/Firefox/WebKit. |
| P1 | Add `jest-axe` accessibility checks to existing component tests. |
| P2 | Add visual regression snapshots for menu and section layouts at key breakpoints. |
| P2 | Add Lighthouse CI performance/accessibility budget check. |
| P2 | Fix findings in §9 (dead `console.log`, missing `rel="noopener noreferrer"`, `matchMedia` resize handling, `findDOMNode` deprecation). |
| P3 | Add a PR-preview deployment so changes are visually verified before they hit `master`/production. |

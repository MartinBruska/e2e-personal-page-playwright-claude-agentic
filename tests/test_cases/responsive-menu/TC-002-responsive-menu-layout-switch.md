# [TC-002]: Responsive Menu Layout Switch

---

## 1. Metadata
* **Test Case ID:** `TC-002`
* **Feature / Scope:** `Radial Menu Mobile/Desktop Breakpoint Layout Switching`
* **Target Environment:** `https://martinbruska.github.io/` (BASE_URL from `.env.production`)
* **Target Framework:** `Playwright`
* **Tags:** `[e2e, regression, responsive, cross-browser]`
* **Priority:** `High`

---

## 2. Setup & Pre-Conditions
* **Target Base URL:** `process.env.BASE_URL || 'https://martinbruska.github.io/'`
* **Viewport Dimensions:** Tested across multiple sizes (see Step 1–3 below); primary anchors `375x812` (Mobile) and `1440x900` (Desktop).
* **Initial State:** Clean browser session (no cached localStorage / cookies).
* **Technical Context:** `Menu.js` computes layout via `window.matchMedia("(max-width: 768px)").matches` **once, at render time**, with no resize/orientation-change listener attached (confirmed in production bundle `static/js/main.b0a37290.js`: `t=!!window.matchMedia("(max-width: 768px)").matches,n=t?0:-90,r=t?90:180`). Mobile branch uses `startAngle=0`, `rotationAngle=90`; Desktop branch uses `startAngle=-90`, `rotationAngle=180`. Because this cannot be reliably mocked/verified via jsdom `matchMedia` mocks, this scenario **must** run against a real browser engine (Playwright), not RTL/Jest.
* **Project Scoping (`playwright.config.ts`):** Steps 1–4 use `page.setViewportSize()` inside the desktop-engine projects (`chromium`, `firefox`, `webkit`) and must **not** run under the `Mobile Chrome` (Pixel 5) / `Mobile Safari` (iPhone 12) projects — those projects already ship fixed device viewport + UA + touch emulation via `devices[...]`, and layering an explicit `setViewportSize()` call on top of them is redundant and can produce inconsistent `hasTouch`/`isMobile` context flags. Scope Steps 1–4 to run only under `chromium`/`firefox`/`webkit` (e.g. `test.skip(['Mobile Chrome', 'Mobile Safari'].includes(testInfo.project.name))`, or a separate `testMatch`/`grep` group). Step 5 below covers the `Mobile Chrome`/`Mobile Safari` projects on their own terms instead.
* **Cross-Browser Requirement:** Execute Steps 1–4 against Chromium, Firefox, and WebKit (`@cross-browser`) per §4.3/§4.6 of `docs/TEST_STRATEGY.md`; execute Step 5 against the `Mobile Chrome` and `Mobile Safari` projects specifically.

---

## 3. Test Steps Sequence

### Step 1: Load Site at Mobile Viewport (375x812) → Verify Mobile Menu Geometry
* **User Action:**
  1. Set viewport to `375x812`.
  2. Navigate to `/` (fresh navigation, so `matchMedia` is evaluated at this viewport on initial render).
  3. Click `button.menu-toggle` (accessible name `"MENU"`) to open the menu.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] Menu container carries class `"menu menu-active"`.
  * [ ] The 4 `button.menu-item` elements (`"go to top"`, `"about"`, `"work experience"`, `"education"`) are laid out along a **mobile arc** (`startAngle=0`) — assert via each item's `boundingBox()` center coordinates differing from the desktop-viewport layout captured in Step 2 (items should be arranged starting from the right/0° reference rather than the top/-90° reference).
  * [ ] No horizontal overflow: `document.documentElement.scrollWidth <= 375`.
  * [ ] Menu toggle button and all menu items remain fully within the viewport bounds (no items clipped off-screen).

---

### Step 2: Load Site at Desktop Viewport (1440x900) → Verify Desktop Menu Geometry
* **User Action:**
  1. Set viewport to `1440x900`.
  2. Navigate to `/` (fresh navigation).
  3. Click `button.menu-toggle` to open the menu.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] Menu container carries class `"menu menu-active"`.
  * [ ] The 4 `button.menu-item` elements are laid out along a **desktop arc** (`startAngle=-90`) — items begin from the top (12 o'clock) reference point, visibly different `boundingBox()` positions relative to the mobile layout from Step 1 for the same menu-item labels.
  * [ ] Menu toggle button behaves identically (opens/closes on click) at this width.

---

### Step 3: Breakpoint Boundary Verification (767px vs 769px, hard-coded at 768px)
* **User Action:**
  1. Set viewport to `767x900` (one pixel below the `max-width: 768px` media query threshold — still matches mobile query). Navigate to `/`. Open the menu.
  2. Set viewport to `769x900` (one pixel above threshold — does not match mobile query). Navigate to `/`. Open the menu.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] At `767x900`: menu items use the **mobile** arc (`startAngle=0`, `rotationAngle=90`), matching Step 1's geometry pattern.
  * [ ] At `769x900`: menu items use the **desktop** arc (`startAngle=-90`, `rotationAngle=180`), matching Step 2's geometry pattern.
  * [ ] At exactly `768x900`: `window.matchMedia("(max-width: 768px)").matches` is `true` (inclusive boundary) — mobile arc applies.

---

### Step 4: Known-Gap Check — In-Session Resize Does Not Re-Trigger Layout
* **User Action:**
  1. Navigate to `/` at `1440x900` (desktop layout established on initial render). Open the menu and note item positions.
  2. Without reloading, resize the existing page's viewport to `375x812`.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] **Documented known limitation** (docs/TEST_STRATEGY.md §9.3): because `isMobile` is computed once at render with no `matchMedia` change listener, the menu layout is expected to **remain in the desktop arc** even after resizing to mobile dimensions, unless some other state change forces a re-render. This step exists to confirm/monitor that behavior, not to assert a "correct" mobile switch — if this assertion starts failing (i.e., the menu *does* re-layout on resize), treat it as a positive fix and update this test case to assert the new correct behavior instead of documenting the gap.

---

### Step 5: Real Device-Emulation Projects — `Mobile Chrome` (Pixel 5) and `Mobile Safari` (iPhone 12)
* **User Action:**
  1. Run this step exclusively under the `Mobile Chrome` and `Mobile Safari` Playwright projects (per `playwright.config.ts`, using `devices['Pixel 5']` and `devices['iPhone 12']` respectively) — **no manual `setViewportSize()` call**; rely on each project's built-in viewport (Pixel 5: `393x851`; iPhone 12: `390x844`), UA string, `hasTouch: true`, and `isMobile: true` context.
  2. Navigate to `/`.
  3. Tap (not click) `button.menu-toggle` to open the menu.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] `window.matchMedia("(max-width: 768px)").matches` is `true` under both device projects (their viewport widths of `393px`/`390px` are both `< 768px`), so the menu renders the **mobile arc** (`startAngle=0`, `rotationAngle=90`) — same layout pattern as Step 1, confirming real mobile UA/touch emulation doesn't change the `matchMedia` outcome vs. plain viewport resizing.
  * [ ] Tap (touch) activation of `button.menu-item` triggers the same scroll-to-section behavior verified by click in `TC-001` (no touch-specific regressions, e.g. 300ms tap-delay ghost clicks or double-firing handlers).
  * [ ] No horizontal overflow and all menu items remain within the emulated viewport bounds, consistent with Step 1's mobile-viewport assertions.

---

## 4. Edge Cases & Responsive Testing Criteria
* **Toggle Button Behavior Across Viewports:**
  * At both `375x812` and `1440x900`, verify `button.menu-toggle` opens the menu (`menu-active` class added) on first click and closes it (`menu-active` class removed) on second click, and closes when `div.menu-backdrop` is clicked (see `TC-001` Step 3 for the dedicated backdrop-close assertion sequence).
* **Single-Item Edge Case (regression note):** Not directly reachable from live config (4 menu items are always rendered from `CommonConfig`), but the `menuItems.length === 1` division-by-zero guard in `Menu.js` is covered at the unit level (`Menu.singleItem.test.js`) — no E2E action required here, listed for cross-reference only.
* **Console / Runtime Errors:**
  * Zero uncaught JavaScript errors or unhandled promise rejections across all viewport transitions in Steps 1–5.
* **Cross-Browser / Cross-Project Note:** WebKit and Firefox historically handle `matchMedia` viewport re-evaluation slightly differently on synthetic `page.setViewportSize()` calls versus real device rotation — run Steps 1–3 on all three desktop-engine projects (`chromium`, `firefox`, `webkit`) to catch engine-specific drift, and run Step 5 specifically on `Mobile Chrome`/`Mobile Safari` to catch device-emulation-specific drift (touch handling, UA sniffing) that the desktop-engine + `setViewportSize()` approach in Steps 1–4 cannot exercise.

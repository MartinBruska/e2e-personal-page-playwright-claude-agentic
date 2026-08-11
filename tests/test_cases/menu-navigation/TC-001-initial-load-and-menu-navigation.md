# [TC-001]: Initial Load & Menu Navigation

---

## 1. Metadata
* **Test Case ID:** `TC-001`
* **Feature / Scope:** `Initial Page Load Verification & Radial Menu Section Navigation`
* **Target Environment:** `https://martinbruska.github.io/` (BASE_URL from `.env.production`)
* **Target Framework:** `Playwright`
* **Tags:** `[e2e, smoke, navigation, cross-browser]`
* **Priority:** `High`

---

## 2. Setup & Pre-Conditions
* **Target Base URL:** `process.env.BASE_URL || 'https://martinbruska.github.io/'`
* **Viewport Dimensions:** `1440x900` (Desktop)
* **Initial State:** Clean browser session (no cached localStorage / cookies)
* **Cross-Browser Requirement:** Execute this test against Chromium, Firefox, and WebKit projects (`@cross-browser`) per §4.3/§4.6 of `docs/TEST_STRATEGY.md`.

---

## 3. Test Steps Sequence

### Step 1: Initial Page Load & Hero Section Verification
* **User Action:**
  1. Navigate to `/` (`https://martinbruska.github.io/`).
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] Page title equals `"martin bruska - test automation engineer"` (note: this is set client-side by `App.js` from `CommonConfig`; the raw pre-hydration `<title>` in `index.html` differs — `"martin bruska - software engineer"` — so the assertion must wait for the client-rendered title, not the initial HTML response).
  * [ ] Hero heading `h1` with text `"martin bruska"` is visible.
  * [ ] Hero tagline `p` with text `"test automation engineer"` is visible directly beneath the `h1`.
  * [ ] Hero portrait image `img[alt="martin bruska portrait"]` is visible and has a non-zero natural width/height (image loaded, not broken).
  * [ ] Menu toggle button (`button.menu-toggle`, accessible name `"MENU"`, containing `span.menu-text` and `div.menu-burger`) is visible in the top-left/corner of the viewport.
  * [ ] Zero uncaught JavaScript errors or unhandled promise rejections in the browser console during load.

---

### Step 2: Open Radial Menu
* **User Action:**
  1. Click the menu toggle button `button.menu-toggle` (accessible name `"MENU"`).
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] Menu container class changes from `"menu"` to `"menu menu-active"`.
  * [ ] Four menu items become visible and clickable, each rendered as a `button.menu-item`:
    * [ ] `"go to top"`
    * [ ] `"about"`
    * [ ] `"work experience"`
    * [ ] `"education"`
  * [ ] A `div.menu-backdrop` element is present behind the menu items (used to close the menu on outside click — exercised explicitly in Step 3 below).

---

### Step 3: Close Radial Menu via Backdrop Click
* **User Action:**
  1. With the menu open (from Step 2), click the `div.menu-backdrop` element at a point that does not overlap any `button.menu-item` or `button.menu-toggle` (e.g. a corner of the viewport away from the radial arc).
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] Menu container class reverts from `"menu menu-active"` back to `"menu"` (`Menu.closeMenu` fires, `menuActive` state set to `false`).
  * [ ] All 4 `button.menu-item` elements become hidden/non-interactive again.
  * [ ] The page does **not** scroll or navigate as a side effect of the backdrop click (backdrop-close is a pure UI-state action, distinct from the menu-item scroll actions in Steps 4–7).
  * [ ] Re-opening the menu afterward (click `button.menu-toggle`) restores the same 4 items in the same layout, confirming the backdrop-close did not corrupt component state.

---

### Step 4: Click "about" Menu Item → Verify Scroll to About Section
* **User Action:**
  1. Open the menu (`button.menu-toggle`) and click `button.menu-item` with accessible name `"about"`.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] Page smooth-scrolls (`window.scrollTo({ behavior: 'smooth' })`) so that the `<h2>` heading `"about"` and its `section-wrapper` are within the viewport — assert via `elementHandle.boundingBox()` (top within `[0, viewportHeight]`) or a `scrollY` change from the pre-click value.
  * [ ] The About section's sub-headings are present: `"who is this guy?"`, `"automation tools"`, `"programming"`, `"technologies"` (all `h4`).
  * [ ] Menu closes (`menu-active` class removed) after the click.

---

### Step 5: Click "work experience" Menu Item → Verify Scroll to Work Experience Section
* **User Action:**
  1. Re-open the menu (`button.menu-toggle`) and click `button.menu-item` with accessible name `"work experience"`.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] `scrollY` (or the section's `boundingBox().y`) changes to bring the `<h2>` heading `"work experience"` into the viewport.
  * [ ] At least 3 experience entries render underneath (headings `"Trafsys"`, `"GoHealth | Health and Social Services"`, `"AccessHQ"`).
  * [ ] Menu closes after the click.

---

### Step 6: Click "education" Menu Item → Verify Scroll to Education Section
* **User Action:**
  1. Re-open the menu and click `button.menu-item` with accessible name `"education"`.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] `scrollY` (or `boundingBox().y`) changes to bring the `<h2>` heading `"education"` into the viewport.
  * [ ] `h4` sub-groups `"education"`, `"certifications"`, `"courses"` are visible with at least one entry each.
  * [ ] Menu closes after the click.

---

### Step 7: Click "go to top" Menu Item → Verify Scroll Back to Hero
* **User Action:**
  1. Re-open the menu and click `button.menu-item` with accessible name `"go to top"`.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] `scrollY` returns to `0` (or the hero `h1` `"martin bruska"` boundingBox top is within the visible viewport at `y ≈ 0`).
  * [ ] Menu closes after the click.

---

## 4. Edge Cases & Responsive Testing Criteria
* **Mobile Viewport Test (`375x812`):**
  * Repeat Steps 1–7 at `375x812`; hero heading, tagline, and portrait remain visible without horizontal overflow/scroll (`document.documentElement.scrollWidth <= 375`).
  * Menu toggle button remains reachable and tappable (min touch target ~44x44px recommended — flag as a finding if smaller).
  * Backdrop-close (Step 3) must also work via tap at `375x812`, not just mouse click at desktop width.
* **URL/History Behavior:**
  * Confirm the page URL does **not** change (no `#about`/`#work-experience` hash) after menu-item clicks, since `Menu.scrollToSection` uses `ReactDOM.findDOMNode`/`offsetTop` scrolling rather than anchor navigation — assertions must rely on `scrollY`/`boundingBox()`, not `page.url()`.
* **Console / Runtime Errors:**
  * Zero uncaught JavaScript errors or unhandled promise rejections in the browser console across all 7 steps.
* **Known Risk Area (docs/TEST_STRATEGY.md §9.4):**
  * `Menu.scrollToSection` uses the legacy `ReactDOM.findDOMNode` API; if a future React upgrade removes it, this journey is expected to be the first to fail — treat unexplained scroll-to-section failures as a signal to check for this regression first.

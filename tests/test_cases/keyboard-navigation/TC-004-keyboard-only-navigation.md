# [TC-004]: Keyboard-Only Navigation

---

## 1. Metadata
* **Test Case ID:** `TC-004`
* **Feature / Scope:** `Keyboard Accessibility — Menu Toggle, Menu Items, Social Links, Section Focus Order`
* **Target Environment:** `https://martinbruska.github.io/` (BASE_URL from `.env.production`)
* **Target Framework:** `Playwright`
* **Tags:** `[e2e, regression, accessibility, cross-browser]`
* **Priority:** `Medium`

---

## 2. Setup & Pre-Conditions
* **Target Base URL:** `process.env.BASE_URL || 'https://martinbruska.github.io/'`
* **Viewport Dimensions:** `1440x900` (Desktop)
* **Initial State:** Clean browser session (no cached localStorage / cookies); no mouse/pointer interaction used at any point in this test — all interaction via `page.keyboard.press(...)`.
* **DOM tab order confirmed live (via accessibility snapshot on initial load, closed menu):**
  1. `button.menu-toggle` (accessible name `"MENU"`) — first focusable element in the DOM.
  2. `a.circle-button` `"GitHub"` (`href="https://github.com/MartinBruska"`).
  3. `a.circle-button` `"LinkedIn"` (`href="https://www.linkedin.com/in/martin-bruska/"`).
  4. `a.circle-button` `"Email"` (`href="mailto:martin.bruska@gmail.com"`).
  5. `a.circle-button` `"CV"` (`href="./Martin_Bruska_CV.pdf"`).
  6. Remaining content headings/body text (no further interactive elements until footer's duplicate `"GitHub"`/`"LinkedIn"`/`"Email"`/`"CV"` links).
* **When the menu is opened**, 4 additional `button.menu-item` elements (`"go to top"`, `"about"`, `"work experience"`, `"education"`) become part of the tab order, inserted after `button.menu-toggle` and before the hero social links.
* **Cross-Browser Requirement:** Execute against Chromium, Firefox, and WebKit (`@cross-browser`) per §4.3/§4.6 of `docs/TEST_STRATEGY.md`.

---

## 3. Test Steps Sequence

### Step 1: Tab to Menu Toggle and Activate With Enter
* **User Action:**
  1. Navigate to `/`.
  2. Press `Tab` once.
  3. Press `Enter`.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] After the `Tab` press, `document.activeElement` is `button.menu-toggle` (accessible name `"MENU"`) — assert via a visible focus outline/ring and/or `expect(page.locator('button.menu-toggle')).toBeFocused()`.
  * [ ] After `Enter`, the menu opens: container class becomes `"menu menu-active"` and the 4 `button.menu-item` elements become visible.

---

### Step 2: Tab Through Menu Items and Activate "about" With Space
* **User Action:**
  1. With the menu open (from Step 1), press `Tab` repeatedly and confirm focus lands on each `button.menu-item` in order: `"go to top"` → `"about"` → `"work experience"` → `"education"`.
  2. With focus on `"about"`, press `Space`.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] Each `Tab` press moves `document.activeElement` to the next `button.menu-item` in the visual/logical order listed above (not radial/angle DOM order, which would be a known a11y risk per docs/TEST_STRATEGY.md §4.5).
  * [ ] `Space` on the focused `"about"` button triggers the same scroll behavior as a mouse click: `scrollY` changes (or `boundingBox()`) to bring the `"about"` `h2` heading into view.
  * [ ] Menu closes (`menu-active` class removed) after activation, consistent with mouse-click behavior (Step 3, TC-001).

---

### Step 3: Tab Reaches Social Links and Activates One With Enter
* **User Action:**
  1. Reload `/` (fresh tab order, menu closed).
  2. Press `Tab` 5 times total (1× to reach `button.menu-toggle`, then 4× more to reach `a.circle-button` `"GitHub"`, `"LinkedIn"`, `"Email"`, `"CV"` in order — land on `"GitHub"` after the 2nd `Tab`).
  3. With focus on the `"GitHub"` link, press `Enter`.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] `document.activeElement` after the 2nd `Tab` is `a.circle-button` with accessible name `"GitHub"`.
  * [ ] `Enter` activates the link the same way a click would (new tab/popup opens navigating to `https://github.com/MartinBruska`), confirming `<a>` elements are natively keyboard-activatable without any custom JS handler interference.

---

### Step 4: Shift+Tab Reverses Through the Same Order
* **User Action:**
  1. From the `"GitHub"` link (post Step 3, before pressing Enter — or re-establish focus there), press `Shift+Tab`.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] Focus returns to `button.menu-toggle` (`"MENU"`), confirming reverse tab order matches forward order (no focus traps or skipped elements).

---

## 4. Edge Cases & Responsive Testing Criteria
* **Mobile Viewport Test (`375x812`):**
  * Repeat Steps 1–2 at `375x812` — keyboard tab order and Enter/Space activation must behave identically regardless of the mobile vs. desktop radial angle layout (visual position differs per TC-002, but DOM/tab order and activation semantics must not).
* **No Visible Focus Indicator Regression:**
  * [ ] At every `Tab` stop in Steps 1–4, confirm a visible focus indicator is rendered (outline, box-shadow, or equivalent) on the focused element — flag as a finding if any focusable element (`button.menu-toggle`, `button.menu-item`, `a.circle-button`) suppresses the default focus ring via CSS without providing a custom one.
* **Escape Key Behavior:**
  * [ ] With the menu open, press `Escape`. Document actual behavior observed (menu close vs. no-op) — if `Escape` does not close the menu, flag as an accessibility gap to raise alongside the §4.5 recommendations in `docs/TEST_STRATEGY.md`, since keyboard-only users otherwise depend on tabbing all the way through the backdrop/items to escape the open menu.
* **Console / Runtime Errors:**
  * Zero uncaught JavaScript errors or unhandled promise rejections during any keyboard-only interaction sequence.

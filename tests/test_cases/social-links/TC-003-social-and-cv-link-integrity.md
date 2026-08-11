# [TC-003]: Social & CV Link Integrity

---

## 1. Metadata
* **Test Case ID:** `TC-003`
* **Feature / Scope:** `TopSection/Footer CircleButton External Links (GitHub, LinkedIn, Email, CV)`
* **Target Environment:** `https://martinbruska.github.io/` (BASE_URL from `.env.production`)
* **Target Framework:** `Playwright`
* **Tags:** `[e2e, smoke, security, links, cross-browser]`
* **Priority:** `High`

---

## 2. Setup & Pre-Conditions
* **Target Base URL:** `process.env.BASE_URL || 'https://martinbruska.github.io/'`
* **Viewport Dimensions:** `1440x900` (Desktop)
* **Initial State:** Clean browser session (no cached localStorage / cookies)
* **Real hrefs confirmed live on the site (both hero `TopSection` and page footer render the same 4 `a.circle-button` links):**
  * GitHub: `https://github.com/MartinBruska`
  * LinkedIn: `https://www.linkedin.com/in/martin-bruska/`
  * Email: `mailto:martin.bruska@gmail.com`
  * CV: `./Martin_Bruska_CV.pdf` (resolves to `https://martinbruska.github.io/Martin_Bruska_CV.pdf`)
* **Known Security Finding (docs/TEST_STRATEGY.md §4.7/§9.2):** production bundle inspection (`static/js/main.b0a37290.js`) confirms `CircleButton.js` renders `href`, `target`, `onClick`, `className` on the anchor but **does not render a `rel` attribute at all** — i.e. `target="_blank"` links currently ship with **no `rel="noopener noreferrer"`**. This test is expected to **fail today** on the `rel` assertions in Steps 2–4 until the fix ships; keep the assertions in place (do not soften them) so the fix is verifiably caught by this suite.
* **Cross-Browser Requirement:** Execute against Chromium, Firefox, and WebKit (`@cross-browser`) per §4.3/§4.6 of `docs/TEST_STRATEGY.md`.

---

## 3. Test Steps Sequence

### Step 1: CV Button Opens New Tab and PDF Is Reachable
* **User Action:**
  1. Locate the `"CV"` button (`a.circle-button` with accessible name `"CV"`, `href="./Martin_Bruska_CV.pdf"`, `target="_blank"`) in the hero `TopSection`.
  2. Click it, capturing the newly opened tab/popup.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] A new browser tab/context page opens (`page.waitForEvent('popup')` or equivalent) rather than navigating the existing tab.
  * [ ] The new tab's resolved URL is `https://martinbruska.github.io/Martin_Bruska_CV.pdf`.
  * [ ] A direct HTTP request to that URL returns status `200 OK`.
  * [ ] The response `Content-Type` header is `application/pdf`.
  * [ ] The response `Content-Length` is greater than `0` (verified live: ~1,969,927 bytes at time of authoring — assert non-zero/reasonable size rather than an exact byte count to avoid brittleness across CV updates).

---

### Step 2: GitHub Button — href, New-Tab Behavior, and `rel` Security Attribute
* **User Action:**
  1. Locate the `"GitHub"` button (`a.circle-button`, accessible name `"GitHub"`).
  2. Inspect its attributes; click it.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] `href` equals `https://github.com/MartinBruska`.
  * [ ] `target` equals `_blank`.
  * [ ] Click opens a new tab/popup (does not replace the current tab).
  * [ ] `rel` attribute is present and includes both `noopener` and `noreferrer` — **currently expected to FAIL** (attribute absent) per the known finding above; this is the regression guard for the CircleButton.js fix.

---

### Step 3: LinkedIn Button — href, New-Tab Behavior, and `rel` Security Attribute
* **User Action:**
  1. Locate the `"LinkedIn"` button (`a.circle-button`, accessible name `"LinkedIn"`).
  2. Inspect its attributes; click it.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] `href` equals `https://www.linkedin.com/in/martin-bruska/`.
  * [ ] `target` equals `_blank`.
  * [ ] Click opens a new tab/popup.
  * [ ] `rel` attribute is present and includes both `noopener` and `noreferrer` — **currently expected to FAIL** per the known finding above.

---

### Step 4: Email Button — href and `rel` Security Attribute
* **User Action:**
  1. Locate the `"Email"` button (`a.circle-button`, accessible name `"Email"`).
  2. Inspect its attributes.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] `href` equals `mailto:martin.bruska@gmail.com`.
  * [ ] `target` equals `_blank`.
  * [ ] `rel` attribute is present and includes both `noopener` and `noreferrer` — **currently expected to FAIL** per the known finding above (lower real-world risk for a `mailto:` link since no cross-origin page is opened, but the assertion is kept for consistency with the other `CircleButton` instances since all 4 buttons share the same component/prop wiring).

---

### Step 5: Footer Duplicate Links Are Consistent With Hero Links
* **User Action:**
  1. Scroll to the page footer (`"Copyright © 2026 All rights reserved"`).
  2. Inspect the footer's `"GitHub"`, `"LinkedIn"`, `"Email"`, `"CV"` `a.circle-button` links.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] Footer link `href` values are identical to the corresponding hero `TopSection` link `href` values (no drift between the two config-driven renders).
  * [ ] Footer links carry the same `target="_blank"` (and same missing-`rel` status) as the hero links, confirming the defect is systemic to the shared `CircleButton` component rather than a one-off.

---

## 4. Edge Cases & Responsive Testing Criteria
* **Mobile Viewport Test (`375x812`):**
  * Repeat Steps 1–4 at `375x812` — all 4 circle buttons remain visible, tappable, and resolve to the same `href`/`target`/`rel` values as desktop (link wiring is not viewport-dependent).
* **Broken-Link Regression Guard:**
  * If the CV filename in `src/config/index.js` (or equivalent) is ever changed without updating the file in `public/`, Step 1's `200 OK` + `Content-Type: application/pdf` assertions are the mechanism that catches it — do not weaken this to a HEAD-only or link-existence-only check.
* **Console / Runtime Errors:**
  * Zero uncaught JavaScript errors or unhandled promise rejections when opening each new tab.

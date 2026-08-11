# [TC-001]: E2E Portfolio Navigation & Contact Workflow

---

## 1. Metadata
* **Test Case ID:** `TC-001`
* **Feature / Scope:** `E2E Navigation & Contact Form Submission`
* **Target Environment:** `https://your-portfolio-domain.com`
* **Target Framework:** `Playwright`
* **Tags:** `[e2e, regression, smoke-test, portfolio]`

---

## 2. Setup & Pre-Conditions
* **Target Base URL:** `process.env.BASE_URL || 'http://localhost:3000'`
* **Viewport Dimensions:** `1920x1080` (Desktop)
* **Initial State:** Clean browser session (no cached localStorage / cookies)

---

## 3. Test Steps Sequence

### Step 1: Initial Page Load & Hero Section Verification
* **User Action:**
  1. Navigate to `/` (Homepage).
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] Page title contains `"Jane Doe | Senior AI Engineer"`.
  * [ ] Header navigation bar is visible (`data-testid="navbar"` or `nav`).
  * [ ] Main heading (`h1`) displays the candidate's primary headline.
  * [ ] Hero CTA button `"View Projects"` is visible and clickable.

---

### Step 2: Smooth Scroll / Navigation to Projects Section
* **User Action:**
  1. Click the link/button `[data-testid="nav-projects"]` or `"Projects"`.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] URL hash updates to `/#projects` (or routes to `/projects`).
  * [ ] Project grid container (`[data-testid="projects-grid"]`) is scrolled into view.
  * [ ] At least **2 project cards** are rendered in the DOM.
  * [ ] Each project card contains a visible title, tag list, and dynamic links (e.g., GitHub, Live Demo).

---

### Step 3: Interactive Project Filter
* **User Action:**
  1. Click the filter button `[data-testid="filter-python"]` or `"Python"`.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] Filter button receives active state styling (`aria-pressed="true"` or dynamic CSS class).
  * [ ] Project cards without the `"Python"` tag are hidden from view or unmounted.
  * [ ] Featured project card `"AI Legal Summarizer"` remains visible.

---

### Step 4: Contact Form Submission
* **User Action:**
  1. Navigate/Scroll to the Contact section (`#contact`).
  2. Fill out the input `[data-testid="contact-name"]` with `"Recruiter Alice"`.
  3. Fill out the input `[data-testid="contact-email"]` with `"alice@techcorp.com"`.
  4. Fill out the textarea `[data-testid="contact-message"]` with `"Hi Jane, we would love to chat about an AI role!"`.
  5. Click the submit button `[data-testid="contact-submit"]`.
* **Expected UI Behaviors & DOM Assertions:**
  * [ ] Form input fields enter disabled/loading state during submission.
  * [ ] Network mock/API call returns HTTP `200 OK`.
  * [ ] Success message alert (`[data-testid="contact-success-msg"]`) appears containing `"Thank you for reaching out!"`.
  * [ ] Form input fields are reset to empty.

---

## 4. Edge Cases & Responsive Testing Criteria
* **Mobile Viewport Test (`390x844`):**
  * Desktop navigation bar collapses into a hamburger menu button (`[data-testid="mobile-menu-btn"]`).
  * Clicking hamburger menu opens slide-out drawer containing navigation links.
* **Console / Runtime Errors:**
  * Zero uncaught JavaScript errors or unhandled promise rejections in the browser console.

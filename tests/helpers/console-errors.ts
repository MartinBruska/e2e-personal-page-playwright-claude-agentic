import type { Page } from '@playwright/test';

// Firefox logs Google Analytics' (gtag.js) cookie-domain handling as console errors even
// though the cookie ends up being set correctly on reload; it's a quirk of GA's own script
// on Firefox, not an application bug, so it's excluded to avoid false failures.
const IGNORED_CONSOLE_ERROR_PATTERNS = [/Cookie .* has been rejected for invalid domain/];

/**
 * Attaches `console`/`pageerror` listeners and returns the live array of captured
 * error messages. Call this BEFORE navigation so load-time errors are captured too.
 */
export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (IGNORED_CONSOLE_ERROR_PATTERNS.some((pattern) => pattern.test(text))) return;
    errors.push(text);
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

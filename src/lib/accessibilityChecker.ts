import { AccessibilityIssue, AccessibilityReport } from './types';

type Rule = {
  id: string;
  check: (doc: Document) => AccessibilityIssue[];
};

// ─── Rule Implementations ─────────────────────────────────────────────────────

const rules: Rule[] = [
  {
    id: 'img-alt',
    check(doc) {
      const issues: AccessibilityIssue[] = [];
      doc.querySelectorAll('img').forEach((img) => {
        if (!img.hasAttribute('alt')) {
          issues.push({
            severity: 'error',
            rule: 'img-alt',
            description: 'Image is missing an alt attribute.',
            element: img.outerHTML.slice(0, 120),
            fix: 'Add alt="descriptive text" or alt="" for decorative images.',
          });
        } else if (img.getAttribute('alt') === 'image' || img.getAttribute('alt') === 'img') {
          issues.push({
            severity: 'warning',
            rule: 'img-alt-meaningful',
            description: 'Image alt text is not meaningful.',
            element: img.outerHTML.slice(0, 120),
            fix: 'Use a descriptive alt text that conveys the image\'s purpose.',
          });
        }
      });
      return issues;
    },
  },

  {
    id: 'button-accessible-name',
    check(doc) {
      const issues: AccessibilityIssue[] = [];
      doc.querySelectorAll('button, [role="button"]').forEach((btn) => {
        const hasText = btn.textContent?.trim();
        const hasLabel = btn.getAttribute('aria-label') || btn.getAttribute('aria-labelledby') || btn.getAttribute('title');
        if (!hasText && !hasLabel) {
          issues.push({
            severity: 'error',
            rule: 'button-name',
            description: 'Button has no accessible name (no text content, aria-label, or title).',
            element: btn.outerHTML.slice(0, 120),
            fix: 'Add aria-label="Action description" or visible text inside the button.',
          });
        }
      });
      return issues;
    },
  },

  {
    id: 'html-lang',
    check(doc) {
      const html = doc.documentElement;
      if (!html.getAttribute('lang')) {
        return [{
          severity: 'error',
          rule: 'html-lang',
          description: 'The <html> element is missing a lang attribute.',
          element: '<html>',
          fix: 'Add lang="en" (or the appropriate language code) to the <html> element.',
        }];
      }
      return [];
    },
  },

  {
    id: 'document-title',
    check(doc) {
      const title = doc.querySelector('title');
      if (!title || !title.textContent?.trim()) {
        return [{
          severity: 'error',
          rule: 'document-title',
          description: 'Page is missing a <title> element.',
          element: '<head>',
          fix: 'Add a descriptive <title> inside <head>.',
        }];
      }
      return [];
    },
  },

  {
    id: 'link-name',
    check(doc) {
      const issues: AccessibilityIssue[] = [];
      const vague = new Set(['click here', 'here', 'read more', 'more', 'link', 'this']);
      doc.querySelectorAll('a').forEach((a) => {
        const text = a.textContent?.trim().toLowerCase();
        const label = a.getAttribute('aria-label');
        if (!label && text && vague.has(text)) {
          issues.push({
            severity: 'warning',
            rule: 'link-name',
            description: `Link text "${text}" is not descriptive.`,
            element: a.outerHTML.slice(0, 120),
            fix: 'Use descriptive link text like "Read our pricing guide" instead of "click here".',
          });
        }
        if (!a.textContent?.trim() && !label && !a.querySelector('img[alt]')) {
          issues.push({
            severity: 'error',
            rule: 'link-empty',
            description: 'Link has no accessible name.',
            element: a.outerHTML.slice(0, 120),
            fix: 'Add visible text or aria-label to this link.',
          });
        }
      });
      return issues;
    },
  },

  {
    id: 'form-label',
    check(doc) {
      const issues: AccessibilityIssue[] = [];
      doc.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select').forEach((el) => {
        const id = el.getAttribute('id');
        const hasLabel = id && doc.querySelector(`label[for="${id}"]`);
        const hasAriaLabel = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
        const hasTitle = el.getAttribute('title');
        const hasPlaceholder = el.getAttribute('placeholder');
        if (!hasLabel && !hasAriaLabel && !hasTitle) {
          issues.push({
            severity: hasPlaceholder ? 'warning' : 'error',
            rule: 'form-label',
            description: `Form field is ${hasPlaceholder ? 'only labeled by placeholder (not accessible)' : 'missing a label'}.`,
            element: el.outerHTML.slice(0, 120),
            fix: 'Add a <label for="inputId"> element or aria-label attribute.',
          });
        }
      });
      return issues;
    },
  },

  {
    id: 'heading-order',
    check(doc) {
      const issues: AccessibilityIssue[] = [];
      const headings = Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6'));
      let prevLevel = 0;
      headings.forEach((h) => {
        const level = parseInt(h.tagName[1]);
        if (prevLevel > 0 && level > prevLevel + 1) {
          issues.push({
            severity: 'warning',
            rule: 'heading-order',
            description: `Heading level skipped: <h${prevLevel}> → <h${level}>. This breaks document outline.`,
            element: h.outerHTML.slice(0, 120),
            fix: `Use <h${prevLevel + 1}> instead of <h${level}>, or restructure the content hierarchy.`,
          });
        }
        prevLevel = level;
      });
      return issues;
    },
  },

  {
    id: 'empty-heading',
    check(doc) {
      const issues: AccessibilityIssue[] = [];
      doc.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
        if (!h.textContent?.trim()) {
          issues.push({
            severity: 'error',
            rule: 'empty-heading',
            description: `<${h.tagName.toLowerCase()}> is empty.`,
            element: h.outerHTML.slice(0, 120),
            fix: 'Add meaningful text content to the heading.',
          });
        }
      });
      return issues;
    },
  },

  {
    id: 'interactive-keyboard',
    check(doc) {
      const issues: AccessibilityIssue[] = [];
      doc.querySelectorAll('[onclick]:not(button):not(a):not(input):not(select):not(textarea)').forEach((el) => {
        issues.push({
          severity: 'warning',
          rule: 'interactive-keyboard',
          description: `Non-interactive element <${el.tagName.toLowerCase()}> has onclick handler but may not be keyboard accessible.`,
          element: el.outerHTML.slice(0, 120),
          fix: 'Use a <button> element instead, or add tabIndex="0" and onKeyDown handler.',
        });
      });
      return issues;
    },
  },

  {
    id: 'meta-viewport',
    check(doc) {
      const viewport = doc.querySelector('meta[name="viewport"]');
      if (viewport) {
        const content = viewport.getAttribute('content') ?? '';
        if (content.includes('user-scalable=no') || content.includes('maximum-scale=1')) {
          return [{
            severity: 'error',
            rule: 'meta-viewport',
            description: 'Viewport meta prevents users from zooming (user-scalable=no or maximum-scale=1).',
            element: viewport.outerHTML,
            fix: 'Remove user-scalable=no and maximum-scale restrictions to allow zoom.',
          }];
        }
      }
      return [];
    },
  },

  {
    id: 'color-contrast-hint',
    check(doc) {
      const issues: AccessibilityIssue[] = [];
      // Heuristic: flag common low-contrast Tailwind combos
      const lowContrastPairs = [
        ['text-gray-300', 'bg-white'],
        ['text-gray-400', 'bg-white'],
        ['text-slate-300', 'bg-white'],
        ['text-yellow-200', 'bg-white'],
        ['text-white', 'bg-yellow-300'],
        ['text-white', 'bg-green-300'],
      ];
      const html = doc.body?.innerHTML ?? '';
      lowContrastPairs.forEach(([text, bg]) => {
        if (html.includes(text) && html.includes(bg)) {
          issues.push({
            severity: 'warning',
            rule: 'color-contrast',
            description: `Possible low contrast: "${text}" on "${bg}" may not meet WCAG AA (4.5:1 ratio).`,
            fix: 'Use a darker text color or lighter background to ensure sufficient contrast.',
          });
        }
      });
      return issues;
    },
  },
];

// ─── Main Checker ─────────────────────────────────────────────────────────────

/**
 * Parse the HTML string into a DOM and run all accessibility rules.
 * Returns a structured report with a score and list of issues.
 */
export function checkAccessibility(html: string): AccessibilityReport {
  // Wrap in a full document so html/head/body rules work
  const fullHtml = html.includes('<html') ? html : `<!DOCTYPE html><html lang=""><head><title></title></head><body>${html}</body></html>`;

  const parser = new DOMParser();
  const doc = parser.parseFromString(fullHtml, 'text/html');

  const allIssues: AccessibilityIssue[] = [];
  const passedRules: string[] = [];

  for (const rule of rules) {
    const found = rule.check(doc);
    if (found.length === 0) {
      passedRules.push(rule.id);
    } else {
      allIssues.push(...found);
    }
  }

  // Score: start at 100, deduct per issue severity
  const deductions = allIssues.reduce((sum, issue) => {
    if (issue.severity === 'error')   return sum + 15;
    if (issue.severity === 'warning') return sum + 7;
    return sum + 2;
  }, 0);
  const score = Math.max(0, Math.min(100, 100 - deductions));

  return { score, issues: allIssues, passedRules };
}

export function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Excellent', color: 'text-emerald-600' };
  if (score >= 70) return { label: 'Good',      color: 'text-blue-600' };
  if (score >= 50) return { label: 'Fair',      color: 'text-amber-600' };
  return                  { label: 'Poor',      color: 'text-red-600' };
}

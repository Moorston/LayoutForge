import { TemplateVariable } from './types';

/** Regex that matches {{variable_name}} placeholders */
const VAR_REGEX = /\{\{([a-z][a-z0-9_]*)\}\}/gi;

// ─── Detection ────────────────────────────────────────────────────────────────

/**
 * Scan an HTML string for {{variable}} placeholders and return
 * a de-duped list of TemplateVariable objects.
 */
export function detectVariables(html: string): TemplateVariable[] {
  const seen = new Set<string>();
  const vars: TemplateVariable[] = [];

  let match: RegExpExecArray | null;
  const re = new RegExp(VAR_REGEX.source, 'gi');
  while ((match = re.exec(html)) !== null) {
    const key = match[1].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    vars.push({
      key,
      label: keyToLabel(key),
      value: '',
      type: inferType(key),
      placeholder: inferPlaceholder(key),
    });
  }
  return vars;
}

/** Return true if the HTML contains at least one {{var}} placeholder */
export function hasVariables(html: string): boolean {
  return VAR_REGEX.test(html);
}

// ─── Application ─────────────────────────────────────────────────────────────

/**
 * Replace all {{key}} occurrences in the HTML with their values.
 * Variables with empty values are left as-is (useful for partial fills).
 */
export function applyVariables(html: string, vars: TemplateVariable[]): string {
  const map = new Map(vars.map((v) => [v.key.toLowerCase(), v.value]));
  return html.replace(VAR_REGEX, (_, key: string) => {
    const val = map.get(key.toLowerCase());
    return val !== undefined && val !== '' ? val : `{{${key}}}`;
  });
}

/**
 * Check whether every variable has a non-empty value.
 */
export function allFilled(vars: TemplateVariable[]): boolean {
  return vars.every((v) => v.value.trim() !== '');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert snake_case key to a Title Case label */
export function keyToLabel(key: string): string {
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Guess the best input type from the variable name */
function inferType(key: string): TemplateVariable['type'] {
  const k = key.toLowerCase();
  if (/url|link|href|src/.test(k)) return 'url';
  if (/email|mail/.test(k)) return 'email';
  if (/color|colour|bg|background/.test(k)) return 'color';
  if (/image|photo|logo|avatar|img/.test(k)) return 'image';
  if (/description|body|content|text|bio|about|summary/.test(k)) return 'textarea';
  return 'text';
}

/** Provide a helpful placeholder text */
function inferPlaceholder(key: string): string {
  const k = key.toLowerCase();
  if (/title|heading/.test(k)) return 'Enter a compelling headline…';
  if (/subtitle|tagline/.test(k)) return 'Short supporting text…';
  if (/description|body|content/.test(k)) return 'Describe this section…';
  if (/email/.test(k)) return 'hello@example.com';
  if (/url|link/.test(k)) return 'https://';
  if (/name/.test(k)) return 'Your name or brand…';
  if (/button|cta/.test(k)) return 'Call to action text…';
  if (/phone|tel/.test(k)) return '+1 (555) 000-0000';
  if (/address/.test(k)) return '123 Main St, City, Country';
  return '';
}

// ─── Inject Variables into HTML ──────────────────────────────────────────────

/**
 * Given raw AI-generated HTML (which may or may not already have {{vars}}),
 * wrap the most likely dynamic text nodes with {{variable}} markers.
 *
 * This is a lightweight heuristic version; for better results use the AI
 * `detectTemplateVariables` service function.
 */
export function injectVariablePlaceholders(html: string): string {
  // Replace common patterns that look like placeholder / filler content
  return html
    .replace(/Lorem ipsum[^<"']*/gi, '{{body_text}}')
    .replace(/\byour (?:company|brand|business)\b/gi, '{{company_name}}')
    .replace(/\bhello@example\.com\b/gi, '{{contact_email}}')
    .replace(/\bhttps?:\/\/example\.com\b/gi, '{{website_url}}')
    .replace(/\bYour tagline here\b/gi, '{{tagline}}')
    .replace(/\bGet Started\b/g, '{{cta_primary}}')
    .replace(/\bLearn More\b/g, '{{cta_secondary}}');
}

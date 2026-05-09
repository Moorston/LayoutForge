import { BrandKit, DEFAULT_BRAND_KIT } from './types';

const STORAGE_KEY = 'layout_forge_brand_kit';

// ─── Persistence ─────────────────────────────────────────────────────────────

export function loadBrandKit(): BrandKit {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BRAND_KIT };
    return { ...DEFAULT_BRAND_KIT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_BRAND_KIT };
  }
}

export function saveBrandKit(kit: BrandKit): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(kit));
}

export function clearBrandKit(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Prompt Context ───────────────────────────────────────────────────────────

export function buildBrandKitPromptContext(kit: BrandKit): string {
  const lines: string[] = [
    '=== BRAND KIT (apply these to ALL generated code) ===',
    `Company: ${kit.companyName}`,
    kit.tagline ? `Tagline: ${kit.tagline}` : '',
    kit.website ? `Website: ${kit.website}` : '',
    kit.contactEmail ? `Email: ${kit.contactEmail}` : '',
    '',
    'Colors (use EXACTLY these hex values via Tailwind arbitrary values or CSS variables):',
    `  Primary:    ${kit.primaryColor}   → use as main CTA, headings, navbar background`,
    `  Secondary:  ${kit.secondaryColor} → use as secondary text, borders, icons`,
    `  Accent:     ${kit.accentColor}    → use for highlights, badges, hover states`,
    `  Background: ${kit.backgroundColor} → use as page/section background`,
    `  Text:       ${kit.textColor}      → use for body text`,
    '',
    'Typography:',
    `  Heading font: "${kit.headingFont}" → apply to all h1-h6 elements`,
    `  Body font:    "${kit.bodyFont}"    → apply to body, p, li, span`,
    '',
    `Border radius style: "${kit.borderRadius}" → use consistently across buttons, cards, inputs`,
    '',
    kit.logoUrl
      ? `Logo: ${kit.logoUrl.startsWith('data:') ? '[embedded logo image provided]' : kit.logoUrl} (alt: "${kit.logoAlt ?? kit.companyName}")`
      : 'Logo: not provided — use company name as text brand mark',
    '',
    'IMPORTANT: Replace ALL placeholder content (lorem ipsum, "Company Name", "Your Brand", example.com, etc.) with the brand information above.',
    '=== END BRAND KIT ===',
  ];
  return lines.filter((l) => l !== null).join('\n');
}

// ─── Tailwind helpers ─────────────────────────────────────────────────────────

export function borderRadiusToTailwind(radius: BrandKit['borderRadius']): string {
  const map: Record<BrandKit['borderRadius'], string> = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  };
  return map[radius];
}

/** Inject CSS custom properties derived from brand kit into the existing CSS string */
export function injectBrandCssVars(css: string, kit: BrandKit): string {
  const vars = `
:root {
  --color-primary: ${kit.primaryColor};
  --color-secondary: ${kit.secondaryColor};
  --color-accent: ${kit.accentColor};
  --color-bg: ${kit.backgroundColor};
  --color-text: ${kit.textColor};
  --font-heading: '${kit.headingFont}', system-ui, sans-serif;
  --font-body: '${kit.bodyFont}', system-ui, sans-serif;
}
`.trim();
  return `${vars}\n\n${css}`;
}

export const HEADING_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Poppins',
  'Playfair Display', 'Merriweather', 'Lato', 'Nunito', 'Raleway',
  'Source Sans Pro', 'Ubuntu', 'Josefin Sans', 'DM Sans', 'Outfit',
];

export const BODY_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Source Sans Pro',
  'Nunito', 'DM Sans', 'Poppins', 'Ubuntu', 'Noto Sans',
  'Mulish', 'Work Sans', 'Karla', 'Quicksand', 'Rubik',
];

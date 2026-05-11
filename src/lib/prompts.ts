/**
 * Centralized, production-grade AI prompts for layout replication.
 * Inspired by screenshot-to-code's multi-pass prompt strategy.
 *
 * Each prompt is optimized for a specific tech stack and stage
 * (initial analysis → generation → refinement).
 */

import type { ExportFormat } from "./types";

// ─── Shared system prompt ─────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are an elite frontend engineer and UI designer with 15+ years of experience.
You specialize in pixel-perfect web page replication using modern HTML, Tailwind CSS, and component frameworks.
You always produce production-grade, semantic, accessible, and responsive code.
When asked for JSON output, you output ONLY valid JSON — no markdown fences, no prose, no explanations outside the JSON.`;

// ─── Pass 1: Detailed Visual Analysis ────────────────────────────────────────

/**
 * Build a prompt for the first pass: detailed visual analysis of the image.
 * The model examines the screenshot in extreme detail, producing a structured
 * description that will be used as context for code generation in Pass 2.
 */
export function buildAnalysisPrompt(): string {
  return `Analyze this webpage screenshot with EXTREME precision. Your analysis will be used to generate pixel-perfect code.

=== ANALYSIS REQUIREMENTS ===

1. PAGE STRUCTURE:
   - Identify the page type (landing page, dashboard, blog, e-commerce, etc.)
   - List ALL major sections from top to bottom
   - For each section, note its approximate vertical position (0-100% of page height)
   - Note the overall page width estimate

2. COLOR ANALYSIS (CRITICAL \u2014 extract exact hex values):
   - Background colors for EACH section/container
   - Text colors for each text element
   - Button colors (background, text, border \u2014 default state)
   - Link colors
   - Border/divider colors
   - Shadow colors (if visible)
   - Gradient colors (start/end)

3. TYPOGRAPHY:
   - Font families (identify if possible: Inter, Roboto, system-ui, serif, etc.)
   - Font sizes for EACH text element (estimate in px)
   - Font weights (normal=400, medium=500, semibold=600, bold=700)
   - Line heights (tight=1.25, normal=1.5, relaxed=1.75)
   - Text alignment (left, center, right)
   - Text transform (uppercase, lowercase, capitalize)

4. SPACING (measure precisely):
   - Section padding (top/bottom, left/right)
   - Container max-width
   - Gaps between elements (in px)
   - Margins between sections
   - Element internal padding

5. LAYOUT STRUCTURE:
   - Number of columns in each grid/section
   - Flex direction and alignment
   - Container width constraints
   - Element ordering

6. TEXT CONTENT (extract VERBATIM):
   - ALL headings (h1, h2, h3, etc.) \u2014 exact text
   - ALL paragraphs \u2014 exact text
   - ALL button labels \u2014 exact text
   - ALL link text \u2014 exact text
   - ALL form labels and placeholders
   - ALL footer text
   - Preserve exact capitalization and punctuation

7. IMAGES & ICONS:
   - Describe each image's visual content in detail
   - Note approximate size and position
   - Identify icon style (outline/filled, which set: Lucide, Font Awesome, custom)
   - Note any logos \u2014 describe their appearance
   - Estimate aspect ratios

8. INTERACTIVE ELEMENTS:
   - Buttons: text, background color, text color, border-radius, padding, font-size
   - Links: text, color, underline style
   - Input fields: type, placeholder, border style, border-radius
   - Navigation items: text, active state indicator

9. DECORATIVE ELEMENTS:
   - Borders: width, color, style (solid, dashed)
   - Box shadows: offset-x, offset-y, blur, spread, color
   - Border-radius values (exact px or Tailwind class)
   - Background patterns or gradients
   - Divider lines

10. COMPONENT DETAILS:
    - Cards: padding, background, border, shadow, radius
    - Navigation bar: height, background, sticky/fixed, backdrop blur
    - Footer: columns, alignment, background color
    - Hero section: height, background treatment, text positioning

=== OUTPUT FORMAT ===

Output a DETAILED TEXT DESCRIPTION organized by section, from top to bottom.
Be EXTREMELY specific about colors (hex values), spacing (px or Tailwind classes), and typography.

Use this format:

HEADER (0-5% of page height):
- Background: #ffffff, border-bottom: 1px solid #e5e7eb
- Height: ~64px, padding: 0 24px
- Layout: flex, justify-between, items-center, max-width: 1280px centered
- Logo: "CompanyName" in Inter Bold 20px, color: #111827
- Nav links: "Home | About | Services | Contact" in Inter Regular 14px, color: #6b7280
- CTA button: "Get Started" bg: #4F46E5, text: #ffffff, rounded-lg, px-4 py-2, font-medium 14px

HERO (5-40% of page height):
- Background: #4F46E5 (solid indigo)
- Padding: 96px top/bottom, 24px left/right
- Text alignment: center
- Heading: "Build Amazing Products" in Inter Bold 48px, color: #ffffff, line-height: 1.1
- Subheading: "The all-in-one platform..." in Inter Regular 20px, color: rgba(255,255,255,0.85)
- Button: "Start Free Trial" bg: #ffffff, text: #4F46E5, rounded-lg, px-8 py-3, font-semibold 18px

[Continue for ALL sections \u2014 be EXHAUSTIVE]

Every pixel matters. Describe EVERY visible element with precise measurements.`;
}

// ─── Pass 2: Analysis-Aware Generation ────────────────────────────────────────

/**
 * Build the generation prompt that includes the detailed analysis from Pass 1.
 * This allows the model to reference specific colors, spacing, and typography
 * when generating code, resulting in much higher fidelity than single-pass.
 */
export function buildGenerationWithAnalysisPrompt(
  stack: ExportFormat,
  analysis: string,
  brandKitContext?: string,
  extraContext?: string,
): string {
  const brandSection = brandKitContext
    ? `\n=== BRAND KIT (apply these guidelines) ===\n${brandKitContext}\n=== END BRAND KIT ===\n`
    : "";
  const extraSection = extraContext
    ? `\n=== ADDITIONAL CONTEXT ===\n${extraContext}\n=== END ADDITIONAL CONTEXT ===\n`
    : "";
  const stackInstructions = getStackInstructions(stack);

  return `You are replicating a webpage with PIXEL-PERFECT accuracy. A detailed visual analysis of the original screenshot is provided below.
Use BOTH the analysis text AND the original image to generate code that matches the original as precisely as possible.

${brandSection}${analysis}${extraSection}
${stackInstructions}

=== CRITICAL REQUIREMENTS ===

1. PIXEL-PERFECT COLOR MATCHING:
   - Use the EXACT hex values from the analysis
   - Use Tailwind arbitrary classes for non-standard colors: bg-[#hex], text-[#hex], border-[#hex]
   - Match every background, text, button, and border color precisely

2. PIXEL-PERFECT SPACING:
   - Use the EXACT spacing values from the analysis
   - Use Tailwind scale where possible (p-1=4px, p-2=8px, p-3=12px, p-4=16px, p-6=24px, p-8=32px, p-12=48px, p-16=64px, p-20=80px, p-24=96px)
   - For non-standard values, use arbitrary classes: p-[17px], gap-[22px]

3. PIXEL-PERFECT TYPOGRAPHY:
   - Use the EXACT font sizes from the analysis (text-[14px], text-[48px], etc.)
   - Match font weights precisely (font-normal, font-medium, font-semibold, font-bold)
   - Match line heights (leading-tight, leading-normal, leading-relaxed)
   - Match text transforms (uppercase, lowercase, capitalize)

4. LAYOUT ACCURACY:
   - Match the exact column count for each grid section
   - Use the correct flex/grid properties
   - Preserve element ordering
   - Match container max-widths

5. RESPONSIVE DESIGN:
   - Use Tailwind responsive prefixes (sm:, md:, lg:, xl:)
   - Mobile-first approach
   - Ensure no horizontal overflow at any breakpoint

6. SEMANTIC HTML:
   - Use proper HTML5 elements: <header>, <nav>, <main>, <section>, <article>, <footer>
   - Proper heading hierarchy (h1 then h2 then h3)
   - Accessible markup with ARIA attributes

7. TEXT CONTENT:
   - Extract ALL text from the analysis VERBATIM
   - Preserve exact capitalization and punctuation
   - Do NOT paraphrase or modify any text

8. VISUAL ELEMENTS:
   - Use <img> tags with descriptive alt text for all images
   - Use placeholder src="" for images
   - Use Lucide icon names in aria-label for icons
   - Match exact border-radius and shadow values

=== OUTPUT FORMAT ===

Reply with ONLY a single valid JSON object. No markdown fences. No prose.

Coordinates use a 0-1000 normalized scale (0,0 = top-left, 1000,1000 = bottom-right).
Each detectedImages description MUST match the alt text of its <img> tag.

{
  "html": "string \u2014 complete HTML body content",
  "css": "string \u2014 any custom CSS beyond Tailwind (prefer empty)",
  "explanation": "string \u2014 brief description of what was replicated",
  "detectedImages": [
    {"description": "string", "coordinates": {"ymin": 0, "xmin": 0, "ymax": 1000, "xmax": 1000}}
  ],
  "detectedCharts": [
    {"type": "bar|line|pie|area", "title": "string", "description": "string", "data": [], "coordinates": {"ymin": 0, "xmin": 0, "ymax": 1000, "xmax": 1000}}
  ]
}`;
}

// ─── Stack-specific generation prompts ────────────────────────────────────────

/**
 * Build the main generation prompt for a given tech stack.
 * Used for both screenshot-to-code and URL-to-code pipelines.
 */
export function buildGenerationPrompt(
  stack: ExportFormat,
  brandKitContext?: string,
  pixelLayoutContext?: string,
  extraContext?: string,
): string {
  const brandSection = brandKitContext
    ? `\n=== BRAND KIT (apply these guidelines to ALL generated content) ===\n${brandKitContext}\n=== END BRAND KIT ===\n`
    : "";
  const pixelSection = pixelLayoutContext
    ? `\n=== PIXEL LAYOUT ANALYSIS ===\n${pixelLayoutContext}\n=== END PIXEL LAYOUT ANALYSIS ===\n`
    : "";
  const extraSection = extraContext
    ? `\n=== ADDITIONAL CONTEXT ===\n${extraContext}\n=== END ADDITIONAL CONTEXT ===\n`
    : "";

  const stackInstructions = getStackInstructions(stack);

  return `You are replicating a webpage from a screenshot/image. Analyze the image carefully and recreate it with extreme fidelity.
${brandSection}${pixelSection}${extraSection}
${stackInstructions}

=== CRITICAL REQUIREMENTS ===

1. PIXEL-PERFECT FIDELITY:
   - Match the exact layout structure, spacing (padding/margins), and proportions
   - Replicate the exact color palette — extract precise hex/RGB values from the image
   - Match typography: font weights, sizes, letter-spacing, line-heights
   - Preserve visual hierarchy exactly as shown

2. RESPONSIVE DESIGN:
   - Use Tailwind responsive prefixes (sm:, md:, lg:, xl:) for all layouts
   - Ensure mobile-first approach — base styles are mobile, add breakpoints up
   - Use flexbox and grid with proper gap/spacing utilities
   - Avoid fixed pixel widths on outer containers — use w-full, max-w-*, mx-auto

3. SEMANTIC HTML:
   - Use proper HTML5 semantic elements: <header>, <nav>, <main>, <section>, <article>, <aside>, <footer>
   - Proper heading hierarchy (h1 → h2 → h3, no skipping)
   - Use <button> for clickable elements, <a> for navigation links
   - Proper form elements with labels

4. ACCESSIBILITY:
   - All images must have descriptive alt text
   - Use aria-label, aria-hidden, role attributes where appropriate
   - Ensure proper color contrast (WCAG AA minimum)
   - Interactive elements must be keyboard accessible
   - Use sr-only text for icon-only elements

5. TAILWIND BEST PRACTICES:
   - Use Tailwind v4 utility classes exclusively (no custom CSS unless unavoidable)
   - Leverage @apply sparingly — prefer direct utility classes
   - Use proper spacing scale (p-1 through p-12, m-1 through m-12, gap-*)
   - Use modern Tailwind features: container queries, has-[], group-[], peer-[]

6. CONTENT ACCURACY:
   - Extract ALL visible text from the image — every heading, paragraph, button label, link text
   - Preserve text case and formatting
   - For icons, use Lucide React icon names in aria-label
   - For images, provide descriptive placeholders with aria-label

7. VISUAL ELEMENT REPLICATION (CRITICAL):
   - ALL visual elements MUST use <img> tags with descriptive alt attributes:
     • Photographs and illustrations
     • Flowcharts, diagrams, org charts, mind maps
     • SVG icons, logos, and vector graphics
     • Embedded charts (bar, line, pie, area)
     • Screenshots and thumbnails
     • Any non-text visual content
   - Use placeholder src="" for images that will be extracted from the original
   - Each <img> MUST have a unique, descriptive alt text matching its content
   - Example: <img src="" alt="Sales pipeline flowchart" class="w-full h-auto" />
   - Do NOT use inline <svg> for complex diagrams — always use <img> tags
   - For simple decorative icons (arrows, chevrons), inline SVG is acceptable

8. INTERACTIVE ELEMENTS:
   - Buttons: proper disabled states, hover/focus variants
   - Links: proper href="#" placeholders
   - Forms: proper input types, placeholder text, required attributes
   - Navigation: active state indicators

=== OUTPUT FORMAT ===

Reply with ONLY a single valid JSON object. No markdown fences. No prose.

IMPORTANT: The "detectedImages" array must include ALL visual elements found in the image — photographs, illustrations, flowcharts, diagrams, org charts, mind maps, SVG logos, embedded charts, screenshots, and any non-text visual content. Coordinates use a 0-1000 normalized scale where (0,0) is top-left and (1000,1000) is bottom-right. Each description MUST exactly match the alt text of its corresponding <img> tag in the HTML.

{
  "html": "string — the complete HTML body content",
  "css": "string — any custom CSS beyond Tailwind (prefer empty if possible)",
  "explanation": "string — brief description of what was replicated and any assumptions made",
  "detectedImages": [
    {"description": "string — MUST match the alt text of the corresponding <img> tag", "coordinates": {"ymin": 0, "xmin": 0, "ymax": 1000, "xmax": 1000}}
  ],
  "detectedCharts": [
    {"type": "bar|line|pie|area", "title": "string", "description": "string", "data": [], "coordinates": {"ymin": 0, "xmin": 0, "ymax": 1000, "xmax": 1000}}
  ]
}`;
}

function getStackInstructions(stack: ExportFormat): string {
  switch (stack) {
    case "react-tailwind":
      return `=== TECH STACK: React + Tailwind CSS ===
Generate a SINGLE React functional component using TypeScript (.tsx).
- Use Tailwind CSS utility classes INLINE in JSX — no separate CSS files
- The component should be self-contained and renderable
- Use proper TypeScript interfaces for props
- Export as default function component
- Use semantic HTML elements within JSX
- All styling via Tailwind className — minimize inline styles
- Use className template literals for conditional classes

CRITICAL - The "html" field format:
The "html" field MUST contain ONLY the JSX markup body (the content inside the return parentheses).
Do NOT include: import statements, const declarations, function definitions, the return keyword, or closing braces.
Correct: <div className="flex items-center"><h1 className="text-2xl">Hello</h1></div>
Wrong: import React from 'react'; const App = () => { return (<div>...</div>) }

Output the "html" field as ONLY the JSX return body - pure markup, nothing else.
Output the "css" field as any @tailwind directives or custom CSS needed.`;

    case "react":
      return `=== TECH STACK: React ===
Generate a React functional component with TypeScript.
- Use className for JSX attributes (not class)
- Use htmlFor (not for)
- Self-closing tags for void elements (<img />, <input />, <br />)
- Proper TypeScript interfaces for props
- Export as default function component
- CSS in a separate constant or imported file

CRITICAL - The "html" field MUST contain ONLY the JSX markup body (inside return parentheses).
Do NOT include import statements, const declarations, function definitions, or return keyword.

Output the "html" field as ONLY the JSX return body - pure markup, nothing else.
Output the "css" field as the component's CSS.`;

    case "nextjs":
      return `=== TECH STACK: Next.js (App Router) ===
Generate a Next.js App Router page component.
- Use 'use client' directive if client-side interactivity is needed
- Use proper Metadata exports for SEO
- Use Next.js Image component for images where appropriate
- Use Tailwind CSS for all styling
- Proper TypeScript types
- Use Link component for navigation

CRITICAL - The "html" field MUST contain ONLY the JSX markup body (inside return parentheses).
Do NOT include import statements, function definitions, the return keyword, or closing braces.

Output the "html" field as ONLY the JSX return body - pure markup, nothing else.
Output the "css" field as any module CSS or Tailwind config needed.`;

    case "vue":
      return `=== TECH STACK: Vue 3 (Composition API) ===
Generate a Vue 3 Single File Component (.vue) with <script setup lang="ts">.
- Use Composition API with TypeScript
- Use Tailwind CSS for all styling
- Proper component name via defineOptions
- Reactive data with ref() and reactive()
- Template with proper Vue directives (v-if, v-for, v-bind, v-on)

Output the "html" field as the <template> content.
Output the "css" field as <style scoped> content.`;

    case "html":
    default:
      return `=== TECH STACK: HTML + Tailwind CSS ===
Generate a single self-contained HTML file.
- Use Tailwind CSS utility classes for all styling
- DO NOT include any <script> tags — the rendering environment provides Tailwind processing
- DO NOT include Tailwind CDN <script> or <link> tags
- Semantic HTML5 structure
- Use Lucide icon names in aria-label for icon placeholders
- All custom CSS must use standard CSS (no @apply, no @tailwind directives)

Output the "html" field as the <body> content only — no <head>, no <script> tags.
Output the "css" field as any additional custom CSS (pure CSS only, no Tailwind directives).`;
  }
}

// ─── Style Template prompt ───────────────────────────────────────────────────

/**
 * Build a prompt for generating a reusable style template from an image.
 *
 * Unlike the replication prompts which try to reproduce the exact page content,
 * this prompt focuses on extracting the DESIGN LANGUAGE — colors, typography,
 * spacing, component patterns — and generating an editable template with CSS
 * custom properties (design tokens).
 *
 * Key differences from replication:
 * - NO <img> tags referencing the original screenshot
 * - Uses CSS custom properties (--color-primary, --spacing-lg, etc.) for all tokens
 * - Uses placeholder/dummy text content instead of extracting exact text
 * - Generates reusable component patterns (cards, buttons, navbars, sections)
 * - Output is a template users can customize by editing CSS variables
 */
export function buildStyleTemplatePrompt(
  stack: ExportFormat,
  analysis: string,
  brandKitContext?: string,
  extraContext?: string,
): string {
  const brandSection = brandKitContext
    ? `\n=== BRAND KIT (apply these guidelines) ===\n${brandKitContext}\n=== END BRAND KIT ===\n`
    : "";
  const extraSection = extraContext
    ? `\n=== ADDITIONAL CONTEXT ===\n${extraContext}\n=== END ADDITIONAL CONTEXT ===\n`
    : "";
  const stackInstructions = getStackInstructions(stack);

  return `You are creating a REUSABLE STYLE TEMPLATE from a webpage screenshot.
Your goal is to extract the DESIGN LANGUAGE (colors, typography, spacing, layout patterns,
component styles) and generate an editable code template that users can customize.

This is NOT a pixel-perfect replica. This is a STYLE TEMPLATE — a starting point for users
to build their own pages using the same design language.

${brandSection}${analysis}${extraSection}
${stackInstructions}

=== CRITICAL REQUIREMENTS ===

1. CSS CUSTOM PROPERTIES (DESIGN TOKENS):
   - Define ALL colors as CSS custom properties in a :root {} block or Tailwind theme config
   - Example: --color-primary: #4F46E5; --color-bg: #ffffff; --color-text: #111827;
   - Define spacing scale: --space-xs: 4px; --space-sm: 8px; --space-md: 16px; --space-lg: 24px; --space-xl: 32px; --space-2xl: 48px;
   - Define typography: --font-heading: 'Inter', sans-serif; --font-body: 'Inter', sans-serif;
   - Define font sizes: --text-xs: 12px; --text-sm: 14px; --text-base: 16px; --text-lg: 18px; --text-xl: 24px; --text-2xl: 32px; --text-3xl: 48px;
   - Define border radius: --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 16px;
   - Define shadows: --shadow-sm: 0 1px 2px rgba(0,0,0,0.05); --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
   - Use these tokens EVERYWHERE in the generated code

2. NO IMAGE EMBEDDING:
   - Do NOT use <img> tags for images from the original screenshot
   - Use CSS gradients, background colors, or placeholder boxes for image areas
   - Use descriptive comments where images would go: <!-- Hero image here -->, <!-- Product photo here -->
   - For decorative backgrounds, use CSS gradients or solid colors

3. PLACEHOLDER CONTENT:
   - Use Lorem Ipsum or generic placeholder text
   - Use descriptive placeholder labels: "Company Name", "Tagline goes here", "Call to Action"
   - Use {{variable}} syntax for dynamic content: {{company_name}}, {{hero_title}}, {{hero_subtitle}}
   - Make it clear which parts are placeholders that users should customize

4. REUSABLE COMPONENT PATTERNS:
   - Generate multiple component variations:
     • 2-3 button styles (primary, secondary, outline)
     • Card component with slots for content
     • Navigation bar
     • Hero section
     • Feature grid
     • Footer
   - Each component should use the design tokens consistently

5. LAYOUT STRUCTURE:
   - Create a well-organized page layout with clear section boundaries
   - Use semantic HTML: <header>, <nav>, <main>, <section>, <footer>
   - Each section should be a self-contained block
   - Add HTML comments to mark each section: <!-- Navigation -->, <!-- Hero Section -->, etc.

6. EDITABILITY:
   - The CSS should be at the TOP of the output, inside a <style> tag
   - Users should be able to change a CSS variable and see the entire page update
   - Group CSS custom properties logically (colors, typography, spacing, effects)
   - Add comments explaining each group of tokens

7. RESPONSIVE:
   - Use responsive design with Tailwind breakpoints or CSS media queries
   - Mobile-first approach

=== OUTPUT FORMAT ===

Reply with ONLY a single valid JSON object. No markdown fences. No prose.

The "html" field should contain the full page template with <style> at the top.
The "css" field should be EMPTY — all CSS goes inside the <style> tag in html.
The "designTokens" field should list all extracted design tokens grouped by category.

{
  "html": "string — complete template with <style> tag containing CSS custom properties, followed by HTML body",
  "css": "",
  "explanation": "string — description of the extracted design language and how to customize the template",
  "designTokens": {
    "colors": { "primary": "#hex", "secondary": "#hex", "background": "#hex", "text": "#hex", ... },
    "typography": { "headingFont": "string", "bodyFont": "string", "baseFontSize": "string" },
    "spacing": { "unit": "string", "scale": ["string"] },
    "effects": { "borderRadius": "string", "shadowStyle": "string" }
  },
  "detectedImages": [],
  "detectedCharts": []
}`;
}

// ─── Refinement prompt ───────────────────────────────────────────────────────

/**
 * Build a refinement prompt for improving previously generated code.
 * Used in the second pass of the multi-step pipeline.
 */
export function buildRefinementPrompt(
  stack: ExportFormat,
  currentHtml: string,
  currentCss: string,
  originalDescription?: string,
): string {
  return `You are refining a previously generated webpage to achieve pixel-perfect quality.
${originalDescription ? `\nOriginal page description:\n${originalDescription}\n` : ""}
Current code:
HTML: ${currentHtml}
CSS: ${currentCss}

=== REFINEMENT GOALS ===

1. LAYOUT PRECISION:
   - Review spacing, alignment, and proportions
   - Ensure consistent padding/margins throughout
   - Fix any visual inconsistencies in the layout

2. TYPOGRAPHY POLISH:
   - Verify font sizes, weights, and line-heights are appropriate
   - Ensure text hierarchy is clear and readable
   - Check letter-spacing and text-transform consistency

3. COLOR & CONTRAST:
   - Verify all colors match the original
   - Ensure sufficient contrast for readability
   - Check hover/focus/active states for interactive elements

4. RESPONSIVE QUALITY:
   - Test mentally at mobile (375px), tablet (768px), and desktop (1280px) widths
   - Ensure no horizontal overflow at any breakpoint
   - Verify that all content is accessible at all sizes

5. SPACING RHYTHM:
   - Ensure consistent spacing rhythm (4px or 8px grid)
   - Fix any awkward gaps or overlaps
   - Section spacing should be uniform

6. POLISH DETAILS:
   - Proper border-radius consistency
   - Shadow depth consistency
   - Transition/animation smoothness
   - Image aspect ratios

=== OUTPUT FORMAT ===

Reply with ONLY a single valid JSON object:
{
  "html": "string — the refined HTML",
  "css": "string — the refined CSS (prefer Tailwind classes)",
  "explanation": "string — what was refined and why"
}`;
}

// ─── URL skeleton generation prompt ──────────────────────────────────────────

/**
 * Build a prompt for generating code from a URL's structural skeleton.
 */
export function buildSkeletonPrompt(
  stack: ExportFormat,
  skeleton: string,
  brandKitContext?: string,
): string {
  const brandSection = brandKitContext
    ? `\n=== BRAND KIT ===\n${brandKitContext}\n=== END BRAND KIT ===\n`
    : "";
  const stackInstructions = getStackInstructions(stack);

  return `You are an expert Frontend Developer. Based on the following skeleton structure of a website, create a complete, production-grade, styled page.
${brandSection}
=== SITE SKELETON ===
${skeleton}
=== END SKELETON ===

${stackInstructions}

=== REQUIREMENTS ===
1. Fill in realistic, professional content that matches the layout structure
2. Use modern, clean design with proper visual hierarchy
3. All Tailwind classes — minimize custom CSS
4. Responsive at all breakpoints (mobile, tablet, desktop)
5. Semantic HTML5 elements
6. Accessible (ARIA, keyboard navigation, color contrast)
7. Use Lucide React icon names for icon placeholders

Reply with ONLY a single valid JSON object:
{
  "html": "string",
  "css": "string",
  "explanation": "string"
}`;
}

// ─── Text content generation prompt ──────────────────────────────────────────

/**
 * Build a prompt for generating code from text/markdown content.
 */
export function buildTextPrompt(
  stack: ExportFormat,
  content: string,
  brandKitContext?: string,
): string {
  const brandSection = brandKitContext
    ? `\n=== BRAND KIT ===\n${brandKitContext}\n=== END BRAND KIT ===\n`
    : "";
  const stackInstructions = getStackInstructions(stack);

  return `You are an expert Frontend Developer. Based on the following text description of a website, create a complete, production-grade page with modern design.
${brandSection}
=== CONTENT ===
${content}
=== END CONTENT ===

${stackInstructions}

=== REQUIREMENTS ===
1. Infer the best layout structure from the content
2. Use modern, clean design with professional typography
3. All Tailwind classes — minimize custom CSS
4. Responsive at all breakpoints
5. Semantic HTML5 elements
6. Accessible
7. Realistic, professional content

Reply with ONLY a single valid JSON object:
{
  "html": "string",
  "css": "string",
  "explanation": "string"
}`;
}

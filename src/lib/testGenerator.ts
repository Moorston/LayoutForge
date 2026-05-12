/**
 * Test Generator — Creates unit and integration tests for generated components.
 * Supports React (Jest + React Testing Library) and Vue (Vitest + Vue Test Utils).
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TestResult {
  code: string;
  framework: "react" | "vue";
  componentName: string;
  testCount: number;
  categories: {
    rendering: number;
    content: number;
    structure: number;
    interaction: number;
    accessibility: number;
  };
}

// ─── HTML Analysis Helpers ───────────────────────────────────────────────────

interface ComponentAnalysis {
  headings: Array<{ level: number; text: string }>;
  images: Array<{ src: string; alt: string }>;
  links: Array<{ href: string; text: string }>;
  buttons: Array<{ text: string; type?: string }>;
  forms: Array<{ action?: string; inputs: Array<{ type: string; name?: string; id?: string; placeholder?: string }> }>;
  landmarks: string[];
  textContent: string[];
  hasNav: boolean;
  hasHeader: boolean;
  hasFooter: boolean;
  hasMain: boolean;
  hasForm: boolean;
  interactiveElements: Array<{ tag: string; text: string; role?: string }>;
}

function analyzeHtml(html: string): ComponentAnalysis {
  const parser = new DOMParser();
  const full = html.includes("<html") ? html : `<html><body>${html}</body></html>`;
  const doc = parser.parseFromString(full, "text/html");

  const headings: Array<{ level: number; text: string }> = [];
  doc.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((h) => {
    headings.push({
      level: parseInt(h.tagName[1]),
      text: h.textContent?.trim() ?? "",
    });
  });

  const images: Array<{ src: string; alt: string }> = [];
  doc.querySelectorAll("img").forEach((img) => {
    images.push({
      src: img.getAttribute("src") ?? "",
      alt: img.getAttribute("alt") ?? "",
    });
  });

  const links: Array<{ href: string; text: string }> = [];
  doc.querySelectorAll("a[href]").forEach((a) => {
    links.push({
      href: a.getAttribute("href") ?? "",
      text: a.textContent?.trim() ?? "",
    });
  });

  const buttons: Array<{ text: string; type?: string }> = [];
  doc.querySelectorAll("button, [role='button']").forEach((btn) => {
    buttons.push({
      text: btn.textContent?.trim() ?? "",
      type: btn.getAttribute("type") ?? undefined,
    });
  });

  const forms: Array<{ action?: string; inputs: Array<{ type: string; name?: string; id?: string; placeholder?: string }> }> = [];
  doc.querySelectorAll("form").forEach((form) => {
    const inputs: Array<{ type: string; name?: string; id?: string; placeholder?: string }> = [];
    form.querySelectorAll("input, textarea, select").forEach((input) => {
      inputs.push({
        type: input.getAttribute("type") ?? input.tagName.toLowerCase(),
        name: input.getAttribute("name") ?? undefined,
        id: input.getAttribute("id") ?? undefined,
        placeholder: input.getAttribute("placeholder") ?? undefined,
      });
    });
    forms.push({ action: form.getAttribute("action") ?? undefined, inputs });
  });

  const landmarks: string[] = [];
  const landmarkTags = ["nav", "main", "header", "footer", "aside", "section"];
  landmarkTags.forEach((tag) => {
    if (doc.querySelector(tag)) landmarks.push(tag);
  });

  const textContent: string[] = [];
  doc.querySelectorAll("p, li, td, th, label, span").forEach((el) => {
    const text = el.textContent?.trim();
    if (text && text.length > 3 && text.length < 100) {
      textContent.push(text);
    }
  });

  const interactiveElements: Array<{ tag: string; text: string; role?: string }> = [];
  doc.querySelectorAll("button, a, input, select, textarea, [role='button'], [onclick]").forEach((el) => {
    interactiveElements.push({
      tag: el.tagName.toLowerCase(),
      text: el.textContent?.trim()?.slice(0, 50) ?? "",
      role: el.getAttribute("role") ?? undefined,
    });
  });

  return {
    headings,
    images,
    links,
    buttons,
    forms,
    landmarks,
    textContent: textContent.slice(0, 10), // Limit for readability
    hasNav: !!doc.querySelector("nav"),
    hasHeader: !!doc.querySelector("header"),
    hasFooter: !!doc.querySelector("footer"),
    hasMain: !!doc.querySelector("main"),
    hasForm: forms.length > 0,
    interactiveElements,
  };
}

function pascalCase(str: string): string {
  return str
    .replace(/[^a-z0-9]/gi, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

function escapeStr(str: string): string {
  return str.replace(/'/g, "\\'").replace(/\n/g, " ");
}

// ─── React Test Generator ────────────────────────────────────────────────────

function generateReactTestCode(componentName: string, html: string): TestResult {
  const analysis = analyzeHtml(html);
  const name = pascalCase(componentName);
  const lines: string[] = [];
  let testCount = 0;
  const categories = { rendering: 0, content: 0, structure: 0, interaction: 0, accessibility: 0 };

  lines.push(`import React from 'react';`);
  lines.push(`import { render, screen, fireEvent } from '@testing-library/react';`);
  lines.push(`import { ${name} } from './${name}';`);
  lines.push(``);
  lines.push(`describe('${name}', () => {`);

  // ── Rendering tests
  lines.push(`  describe('Rendering', () => {`);
  lines.push(`    it('renders without crashing', () => {`);
  lines.push(`      render(<${name} />);`);
  lines.push(`    });`);
  testCount++;
  categories.rendering++;

  if (analysis.headings.length > 0) {
    const firstHeading = analysis.headings[0];
    lines.push(``);
    lines.push(`    it('renders the main heading', () => {`);
    lines.push(`      render(<${name} />);`);
    lines.push(`      expect(screen.getByRole('heading', { level: ${firstHeading.level} })).toBeInTheDocument();`);
    lines.push(`    });`);
    testCount++;
    categories.rendering++;
  }
  lines.push(`  });`);

  // ── Content tests
  lines.push(``);
  lines.push(`  describe('Content', () => {`);
  const uniqueTexts = [...new Set(analysis.textContent)].slice(0, 5);
  if (uniqueTexts.length > 0) {
    for (const text of uniqueTexts) {
      lines.push(`    it('displays expected text content', () => {`);
      lines.push(`      render(<${name} />);`);
      lines.push(`      expect(screen.getByText('${escapeStr(text)}')).toBeInTheDocument();`);
      lines.push(`    });`);
      testCount++;
      categories.content++;
    }
  } else {
    lines.push(`    it('renders content into the DOM', () => {`);
    lines.push(`      const { container } = render(<${name} />);`);
    lines.push(`      expect(container.firstChild).toBeTruthy();`);
    lines.push(`    });`);
    testCount++;
    categories.content++;
  }
  lines.push(`  });`);

  // ── Structure tests
  lines.push(``);
  lines.push(`  describe('Structure', () => {`);
  if (analysis.headings.length > 1) {
    lines.push(`    it('maintains proper heading hierarchy', () => {`);
    lines.push(`      render(<${name} />);`);
    lines.push(`      const headings = screen.getAllByRole('heading');`);
    lines.push(`      expect(headings.length).toBeGreaterThanOrEqual(${Math.min(analysis.headings.length, 3)});`);
    lines.push(`    });`);
    testCount++;
    categories.structure++;
  }

  if (analysis.landmarks.length > 0) {
    lines.push(`    it('contains landmark regions', () => {`);
    lines.push(`      const { container } = render(<${name} />);`);
    for (const landmark of analysis.landmarks.slice(0, 3)) {
      const role = landmark === "header" ? "banner" : landmark === "footer" ? "contentinfo" : landmark === "main" ? "main" : landmark === "nav" ? "navigation" : landmark;
      lines.push(`      expect(container.querySelector('${landmark}')).toBeTruthy();`);
    }
    lines.push(`    });`);
    testCount++;
    categories.structure++;
  }

  if (analysis.images.length > 0) {
    lines.push(`    it('renders images with alt text', () => {`);
    lines.push(`      render(<${name} />);`);
    lines.push(`      const images = screen.getAllByRole('img');`);
    lines.push(`      expect(images.length).toBeGreaterThanOrEqual(1);`);
    lines.push(`    });`);
    testCount++;
    categories.structure++;
  }
  lines.push(`  });`);

  // ── Interaction tests
  if (analysis.buttons.length > 0 || analysis.forms.length > 0) {
    lines.push(``);
    lines.push(`  describe('Interaction', () => {`);
    for (const btn of analysis.buttons.slice(0, 3)) {
      if (btn.text) {
        lines.push(`    it('handles button click', () => {`);
        lines.push(`      render(<${name} />);`);
        lines.push(`      const button = screen.getByRole('button', { name: '${escapeStr(btn.text)}' });`);
        lines.push(`      fireEvent.click(button);`);
        lines.push(`    });`);
        testCount++;
        categories.interaction++;
      }
    }
    if (analysis.forms.length > 0) {
      lines.push(`    it('handles form submission', () => {`);
      lines.push(`      render(<${name} />);`);
      lines.push(`      const form = document.querySelector('form');`);
      lines.push(`      if (form) {`);
      lines.push(`        fireEvent.submit(form);`);
      lines.push(`      }`);
      lines.push(`    });`);
      testCount++;
      categories.interaction++;
    }
    lines.push(`  });`);
  }

  // ── Accessibility tests
  lines.push(``);
  lines.push(`  describe('Accessibility', () => {`);
  if (analysis.images.length > 0) {
    lines.push(`    it('images have alt attributes', () => {`);
    lines.push(`      render(<${name} />);`);
    lines.push(`      const images = screen.getAllByRole('img');`);
    lines.push(`      images.forEach((img) => {`);
    lines.push(`        expect(img).toHaveAttribute('alt');`);
    lines.push(`      });`);
    lines.push(`    });`);
    testCount++;
    categories.accessibility++;
  }

  if (analysis.links.length > 0) {
    lines.push(`    it('links have accessible text', () => {`);
    lines.push(`      render(<${name} />);`);
    lines.push(`      const links = screen.getAllByRole('link');`);
    lines.push(`      links.forEach((link) => {`);
    lines.push(`        expect(link.textContent?.trim() || link.getAttribute('aria-label')).toBeTruthy();`);
    lines.push(`      });`);
    lines.push(`    });`);
    testCount++;
    categories.accessibility++;
  }

  lines.push(`    it('has no obvious accessibility violations', () => {`);
  lines.push(`      const { container } = render(<${name} />);`);
  lines.push(`      // Check for empty interactive elements`);
  lines.push(`      const buttons = container.querySelectorAll('button');`);
  lines.push(`      buttons.forEach((btn) => {`);
  lines.push(`        const hasText = btn.textContent?.trim();`);
  lines.push(`        const hasLabel = btn.getAttribute('aria-label');`);
  lines.push(`        expect(hasText || hasLabel).toBeTruthy();`);
  lines.push(`      });`);
  lines.push(`    });`);
  testCount++;
  categories.accessibility++;

  if (analysis.hasForm) {
    lines.push(`    it('form inputs have labels', () => {`);
    lines.push(`      const { container } = render(<${name} />);`);
    lines.push(`      const inputs = container.querySelectorAll('input:not([type="hidden"]):not([type="submit"])');`);
    lines.push(`      inputs.forEach((input) => {`);
    lines.push(`        const id = input.getAttribute('id');`);
    lines.push(`        const hasLabel = id && container.querySelector(\`label[for="\${id}"]\`);`);
    lines.push(`        const hasAria = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');`);
    lines.push(`        expect(hasLabel || hasAria).toBeTruthy();`);
    lines.push(`      });`);
    lines.push(`    });`);
    testCount++;
    categories.accessibility++;
  }
  lines.push(`  });`);

  // ── Snapshot test
  lines.push(``);
  lines.push(`  describe('Snapshot', () => {`);
  lines.push(`    it('matches snapshot', () => {`);
  lines.push(`      const { container } = render(<${name} />);`);
  lines.push(`      expect(container).toMatchSnapshot();`);
  lines.push(`    });`);
  lines.push(`  });`);
  testCount++;
  categories.rendering++;

  lines.push(`});`);

  return {
    code: lines.join("\n"),
    framework: "react",
    componentName: name,
    testCount,
    categories,
  };
}

// ─── Vue Test Generator ──────────────────────────────────────────────────────

function generateVueTestCode(componentName: string, html: string): TestResult {
  const analysis = analyzeHtml(html);
  const name = pascalCase(componentName);
  const kebabName = componentName
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "");
  const lines: string[] = [];
  let testCount = 0;
  const categories = { rendering: 0, content: 0, structure: 0, interaction: 0, accessibility: 0 };

  lines.push(`import { describe, it, expect } from 'vitest';`);
  lines.push(`import { mount } from '@vue/test-utils';`);
  lines.push(`import ${name} from './${name}.vue';`);
  lines.push(``);
  lines.push(`describe('${name}', () => {`);

  // ── Rendering tests
  lines.push(`  describe('Rendering', () => {`);
  lines.push(`    it('renders without crashing', () => {`);
  lines.push(`      const wrapper = mount(${name});`);
  lines.push(`      expect(wrapper.exists()).toBe(true);`);
  lines.push(`    });`);
  testCount++;
  categories.rendering++;

  if (analysis.headings.length > 0) {
    const firstHeading = analysis.headings[0];
    lines.push(``);
    lines.push(`    it('renders the main heading', () => {`);
    lines.push(`      const wrapper = mount(${name});`);
    lines.push(`      const heading = wrapper.find('h${firstHeading.level}');`);
    lines.push(`      expect(heading.exists()).toBe(true);`);
    lines.push(`    });`);
    testCount++;
    categories.rendering++;
  }
  lines.push(`  });`);

  // ── Content tests
  lines.push(``);
  lines.push(`  describe('Content', () => {`);
  const uniqueTexts = [...new Set(analysis.textContent)].slice(0, 5);
  if (uniqueTexts.length > 0) {
    for (const text of uniqueTexts) {
      lines.push(`    it('displays expected text content', () => {`);
      lines.push(`      const wrapper = mount(${name});`);
      lines.push(`      expect(wrapper.text()).toContain('${escapeStr(text)}');`);
      lines.push(`    });`);
      testCount++;
      categories.content++;
    }
  } else {
    lines.push(`    it('renders content into the DOM', () => {`);
    lines.push(`      const wrapper = mount(${name});`);
    lines.push(`      expect(wrapper.html().length).toBeGreaterThan(0);`);
    lines.push(`    });`);
    testCount++;
    categories.content++;
  }
  lines.push(`  });`);

  // ── Structure tests
  lines.push(``);
  lines.push(`  describe('Structure', () => {`);
  if (analysis.headings.length > 1) {
    lines.push(`    it('maintains proper heading hierarchy', () => {`);
    lines.push(`      const wrapper = mount(${name});`);
    lines.push(`      const headings = wrapper.findAll('h1, h2, h3, h4, h5, h6');`);
    lines.push(`      expect(headings.length).toBeGreaterThanOrEqual(${Math.min(analysis.headings.length, 3)});`);
    lines.push(`    });`);
    testCount++;
    categories.structure++;
  }

  if (analysis.landmarks.length > 0) {
    lines.push(`    it('contains landmark regions', () => {`);
    lines.push(`      const wrapper = mount(${name});`);
    for (const landmark of analysis.landmarks.slice(0, 3)) {
      lines.push(`      expect(wrapper.find('${landmark}').exists()).toBe(true);`);
    }
    lines.push(`    });`);
    testCount++;
    categories.structure++;
  }
  lines.push(`  });`);

  // ── Interaction tests
  if (analysis.buttons.length > 0) {
    lines.push(``);
    lines.push(`  describe('Interaction', () => {`);
    for (const btn of analysis.buttons.slice(0, 3)) {
      if (btn.text) {
        lines.push(`    it('handles button click', async () => {`);
        lines.push(`      const wrapper = mount(${name});`);
        lines.push(`      const button = wrapper.find('button');`);
        lines.push(`      if (button.exists()) {`);
        lines.push(`        await button.trigger('click');`);
        lines.push(`      }`);
        lines.push(`    });`);
        testCount++;
        categories.interaction++;
      }
    }
    lines.push(`  });`);
  }

  // ── Accessibility tests
  lines.push(``);
  lines.push(`  describe('Accessibility', () => {`);
  if (analysis.images.length > 0) {
    lines.push(`    it('images have alt attributes', () => {`);
    lines.push(`      const wrapper = mount(${name});`);
    lines.push(`      const images = wrapper.findAll('img');`);
    lines.push(`      images.forEach((img) => {`);
    lines.push(`        expect(img.attributes('alt')).toBeDefined();`);
    lines.push(`      });`);
    lines.push(`    });`);
    testCount++;
    categories.accessibility++;
  }

  lines.push(`    it('has no obvious accessibility violations', () => {`);
  lines.push(`      const wrapper = mount(${name});`);
  lines.push(`      const buttons = wrapper.findAll('button');`);
  lines.push(`      buttons.forEach((btn) => {`);
  lines.push(`        const hasText = btn.text().trim();`);
  lines.push(`        const hasLabel = btn.attributes('aria-label');`);
  lines.push(`        expect(hasText || hasLabel).toBeTruthy();`);
  lines.push(`      });`);
  lines.push(`    });`);
  testCount++;
  categories.accessibility++;
  lines.push(`  });`);

  // ── Snapshot test
  lines.push(``);
  lines.push(`  describe('Snapshot', () => {`);
  lines.push(`    it('matches snapshot', () => {`);
  lines.push(`      const wrapper = mount(${name});`);
  lines.push(`      expect(wrapper.html()).toMatchSnapshot();`);
  lines.push(`    });`);
  lines.push(`  });`);
  testCount++;
  categories.rendering++;

  lines.push(`});`);

  return {
    code: lines.join("\n"),
    framework: "vue",
    componentName: name,
    testCount,
    categories,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generates Jest + React Testing Library tests for a React component.
 */
export function generateReactTests(componentName: string, html: string): string {
  return generateReactTestCode(componentName, html).code;
}

/**
 * Generates Vitest + Vue Test Utils tests for a Vue component.
 */
export function generateVueTests(componentName: string, html: string): string {
  return generateVueTestCode(componentName, html).code;
}

/**
 * Detect the stack from context and generate appropriate tests.
 */
export function generateTests(
  componentName: string,
  html: string,
  stack: string,
): TestResult {
  const lowerStack = stack.toLowerCase();
  if (lowerStack.includes("vue")) {
    return generateVueTestCode(componentName, html);
  }
  return generateReactTestCode(componentName, html);
}

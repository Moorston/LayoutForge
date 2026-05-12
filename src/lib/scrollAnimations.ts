/**
 * Scroll Animation Presets and Code Generators
 * Provides CSS animations triggered by Intersection Observer.
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ScrollPreset {
  id: string;
  name: string;
  nameZh: string;
  css: string;
  intersectionConfig: { threshold: number; rootMargin: string };
}

// ─── Presets ─────────────────────────────────────────────────────────────────

export const SCROLL_PRESETS: ScrollPreset[] = [
  {
    id: "fadeIn",
    name: "Fade In",
    nameZh: "淡入",
    css: `@keyframes scrollFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
[data-scroll="fadeIn"] {
  opacity: 0;
  animation: scrollFadeIn var(--scroll-duration, 0.6s) var(--scroll-easing, ease-out) forwards;
  animation-delay: var(--scroll-delay, 0s);
}`,
    intersectionConfig: { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
  },
  {
    id: "slideUp",
    name: "Slide Up",
    nameZh: "向上滑入",
    css: `@keyframes scrollSlideUp {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}
[data-scroll="slideUp"] {
  opacity: 0;
  transform: translateY(40px);
  animation: scrollSlideUp var(--scroll-duration, 0.6s) var(--scroll-easing, ease-out) forwards;
  animation-delay: var(--scroll-delay, 0s);
}`,
    intersectionConfig: { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
  },
  {
    id: "slideLeft",
    name: "Slide Left",
    nameZh: "从右滑入",
    css: `@keyframes scrollSlideLeft {
  from { opacity: 0; transform: translateX(60px); }
  to { opacity: 1; transform: translateX(0); }
}
[data-scroll="slideLeft"] {
  opacity: 0;
  transform: translateX(60px);
  animation: scrollSlideLeft var(--scroll-duration, 0.6s) var(--scroll-easing, ease-out) forwards;
  animation-delay: var(--scroll-delay, 0s);
}`,
    intersectionConfig: { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
  },
  {
    id: "slideRight",
    name: "Slide Right",
    nameZh: "从左滑入",
    css: `@keyframes scrollSlideRight {
  from { opacity: 0; transform: translateX(-60px); }
  to { opacity: 1; transform: translateX(0); }
}
[data-scroll="slideRight"] {
  opacity: 0;
  transform: translateX(-60px);
  animation: scrollSlideRight var(--scroll-duration, 0.6s) var(--scroll-easing, ease-out) forwards;
  animation-delay: var(--scroll-delay, 0s);
}`,
    intersectionConfig: { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
  },
  {
    id: "scaleUp",
    name: "Scale Up",
    nameZh: "缩放出现",
    css: `@keyframes scrollScaleUp {
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
}
[data-scroll="scaleUp"] {
  opacity: 0;
  transform: scale(0.85);
  animation: scrollScaleUp var(--scroll-duration, 0.6s) var(--scroll-easing, ease-out) forwards;
  animation-delay: var(--scroll-delay, 0s);
}`,
    intersectionConfig: { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
  },
  {
    id: "rotateIn",
    name: "Rotate In",
    nameZh: "旋转进入",
    css: `@keyframes scrollRotateIn {
  from { opacity: 0; transform: rotate(-8deg) scale(0.9); }
  to { opacity: 1; transform: rotate(0) scale(1); }
}
[data-scroll="rotateIn"] {
  opacity: 0;
  transform: rotate(-8deg) scale(0.9);
  animation: scrollRotateIn var(--scroll-duration, 0.7s) var(--scroll-easing, ease-out) forwards;
  animation-delay: var(--scroll-delay, 0s);
}`,
    intersectionConfig: { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
  },
  {
    id: "blurIn",
    name: "Blur In",
    nameZh: "模糊聚焦",
    css: `@keyframes scrollBlurIn {
  from { opacity: 0; filter: blur(12px); }
  to { opacity: 1; filter: blur(0); }
}
[data-scroll="blurIn"] {
  opacity: 0;
  filter: blur(12px);
  animation: scrollBlurIn var(--scroll-duration, 0.8s) var(--scroll-easing, ease-out) forwards;
  animation-delay: var(--scroll-delay, 0s);
}`,
    intersectionConfig: { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
  },
  {
    id: "parallax",
    name: "Parallax",
    nameZh: "视差滚动",
    css: `@keyframes scrollParallax {
  from { opacity: 0; transform: translateY(80px) scale(1.05); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
[data-scroll="parallax"] {
  opacity: 0;
  transform: translateY(80px) scale(1.05);
  animation: scrollParallax var(--scroll-duration, 1s) var(--scroll-easing, cubic-bezier(0.16, 1, 0.3, 1)) forwards;
  animation-delay: var(--scroll-delay, 0s);
}`,
    intersectionConfig: { threshold: 0.05, rootMargin: "0px 0px -80px 0px" },
  },
];

// ─── Generate CSS ────────────────────────────────────────────────────────────

/**
 * Generates the combined CSS for selected scroll animation presets,
 * with configurable duration, delay, and easing via CSS custom properties.
 */
export function generateScrollAnimationCSS(
  presets: ScrollPreset[],
  options?: {
    duration?: string;
    delay?: string;
    easing?: string;
  },
): string {
  const cssParts: string[] = [];

  // Global custom properties for scroll animations
  cssParts.push(`:root {
  --scroll-duration: ${options?.duration || "0.6s"};
  --scroll-delay: ${options?.delay || "0s"};
  --scroll-easing: ${options?.easing || "ease-out"};
}`);

  for (const preset of presets) {
    cssParts.push(preset.css);
  }

  return cssParts.join("\n\n");
}

// ─── Generate Intersection Observer JS ───────────────────────────────────────

/**
 * Generates Intersection Observer JavaScript code
 * that triggers scroll animations when elements enter the viewport.
 */
export function generateScrollObserverJS(): string {
  return `// LayoutForge Scroll Animation Observer
(function() {
  'use strict';

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var el = entry.target;
        // Trigger animation by adding the 'is-visible' class
        el.classList.add('is-visible');
        // Only animate once
        observer.unobserve(el);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  // Observe all elements with data-scroll attribute
  var targets = document.querySelectorAll('[data-scroll]');
  targets.forEach(function(el) {
    observer.observe(el);
  });

  // Re-observe on dynamic content changes (optional)
  if (typeof MutationObserver !== 'undefined') {
    var mutObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) {
            if (node.hasAttribute && node.hasAttribute('data-scroll')) {
              observer.observe(node);
            }
            var children = node.querySelectorAll ? node.querySelectorAll('[data-scroll]') : [];
            children.forEach(function(child) {
              observer.observe(child);
            });
          }
        });
      });
    });

    mutObserver.observe(document.body, { childList: true, subtree: true });
  }
})();`;
}

// ─── Inject Scroll Animations into HTML ──────────────────────────────────────

/**
 * Adds data-scroll attributes to HTML elements to enable scroll animations.
 * Uses a heuristic approach: adds animation data attributes to significant
 * container elements, headings, images, and cards.
 */
export function injectScrollAnimations(
  html: string,
  presetIds: string[],
): string {
  if (presetIds.length === 0) return html;

  let result = html;
  let presetIndex = 0;

  const getNextPreset = (): string => {
    const preset = presetIds[presetIndex % presetIds.length];
    presetIndex++;
    return preset;
  };

  // Add data-scroll to section and article tags
  result = result.replace(
    /<(section|article)(\s[^>]*)?>/gi,
    (match, tag, attrs = "") => {
      if (/data-scroll/.test(attrs)) return match;
      const preset = getNextPreset();
      return `<${tag} data-scroll="${preset}"${attrs}>`;
    },
  );

  // Add data-scroll to headings
  result = result.replace(
    /<(h[1-6])(\s[^>]*)?>/gi,
    (match, tag, attrs = "") => {
      if (/data-scroll/.test(attrs)) return match;
      const preset = getNextPreset();
      return `<${tag} data-scroll="${preset}"${attrs}>`;
    },
  );

  // Add data-scroll to images
  result = result.replace(
    /<img(\s[^>]*)?>/gi,
    (match, attrs = "") => {
      if (/data-scroll/.test(attrs)) return match;
      const preset = getNextPreset();
      return `<img data-scroll="${preset}"${attrs}>`;
    },
  );

  // Add data-scroll to divs with common component class patterns
  result = result.replace(
    /<div(\s+class="[^"]*(?:card|hero|feature|testimonial|cta|banner)[^"]*"[^>]*)>/gi,
    (match, attrs) => {
      if (/data-scroll/.test(attrs)) return match;
      const preset = getNextPreset();
      return `<div data-scroll="${preset}"${attrs}>`;
    },
  );

  return result;
}

// ─── Helper: Get preset by ID ────────────────────────────────────────────────

export function getPresetById(id: string): ScrollPreset | undefined {
  return SCROLL_PRESETS.find((p) => p.id === id);
}

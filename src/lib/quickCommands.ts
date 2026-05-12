/**
 * Quick Commands for the chat panel.
 * Preset natural-language edit prompts organized by category.
 */

export interface QuickCommand {
  id: string;
  category: string;
  label: string;
  labelZh: string;
  prompt: string;
  icon: string;
}

export const QUICK_COMMANDS: QuickCommand[] = [
  // ── Layout ──────────────────────────────────────────────────────────────────
  {
    id: "layout-sticky-nav",
    category: "Layout",
    label: "Make navbar sticky",
    labelZh: "固定导航栏",
    prompt: "Make the navigation bar sticky at the top of the page with a backdrop blur effect when scrolling",
    icon: "📌",
  },
  {
    id: "layout-center-hero",
    category: "Layout",
    label: "Center align hero section",
    labelZh: "居中对齐Hero区域",
    prompt: "Center align all content in the hero section horizontally and vertically",
    icon: "🎯",
  },
  {
    id: "layout-add-footer",
    category: "Layout",
    label: "Add footer links",
    labelZh: "添加页脚链接",
    prompt: "Add a comprehensive footer with organized link columns, social media icons, and copyright notice",
    icon: "🔗",
  },
  {
    id: "layout-breadcrumbs",
    category: "Layout",
    label: "Add breadcrumb navigation",
    labelZh: "添加面包屑导航",
    prompt: "Add a breadcrumb navigation trail below the navbar showing the page hierarchy",
    icon: "🍞",
  },
  {
    id: "layout-back-to-top",
    category: "Layout",
    label: "Add back-to-top button",
    labelZh: "添加返回顶部按钮",
    prompt: "Add a floating back-to-top button that appears when the user scrolls down, with smooth scroll behavior",
    icon: "⬆️",
  },
  {
    id: "layout-sidebar",
    category: "Layout",
    label: "Add sidebar navigation",
    labelZh: "添加侧边导航",
    prompt: "Convert the layout to include a collapsible sidebar navigation on the left side",
    icon: "📋",
  },

  // ── Style ───────────────────────────────────────────────────────────────────
  {
    id: "style-dark-mode",
    category: "Style",
    label: "Add dark mode",
    labelZh: "添加暗色模式",
    prompt: "Add a dark mode toggle with CSS custom properties, inverting backgrounds and text colors appropriately",
    icon: "🌙",
  },
  {
    id: "style-gradient-buttons",
    category: "Style",
    label: "Gradient buttons",
    labelZh: "按钮改为渐变",
    prompt: "Convert all buttons to use gradient backgrounds with smooth hover transitions",
    icon: "🎨",
  },
  {
    id: "style-card-shadows",
    category: "Style",
    label: "Add shadow to cards",
    labelZh: "给卡片添加阴影",
    prompt: "Add elegant box shadows to all card elements with hover lift effect",
    icon: "🖼️",
  },
  {
    id: "style-increase-fonts",
    category: "Style",
    label: "Increase font sizes",
    labelZh: "增大字体",
    prompt: "Increase all font sizes by 15-20% for better readability, maintaining the typographic hierarchy",
    icon: "🔤",
  },
  {
    id: "style-serif-fonts",
    category: "Style",
    label: "Change to serif fonts",
    labelZh: "改为衬线字体",
    prompt: "Change all fonts to elegant serif typefaces (Georgia for body, Playfair Display for headings)",
    icon: "📰",
  },
  {
    id: "style-minimalist",
    category: "Style",
    label: "Make it minimalist",
    labelZh: "改为极简风格",
    prompt: "Simplify the design to a minimalist style: remove unnecessary decorations, increase whitespace, use subtle borders, and reduce color palette",
    icon: "✨",
  },
  {
    id: "style-glassmorphism",
    category: "Style",
    label: "Add glassmorphism effect",
    labelZh: "添加毛玻璃效果",
    prompt: "Apply glassmorphism effect to cards and overlays with backdrop blur, semi-transparent backgrounds, and subtle borders",
    icon: "🪟",
  },

  // ── Components ──────────────────────────────────────────────────────────────
  {
    id: "comp-faq-accordion",
    category: "Components",
    label: "Add FAQ accordion",
    labelZh: "添加FAQ折叠区",
    prompt: "Add an FAQ section with collapsible accordion items and smooth expand/collapse animations",
    icon: "❓",
  },
  {
    id: "comp-loading-skeleton",
    category: "Components",
    label: "Add loading skeleton",
    labelZh: "添加加载骨架屏",
    prompt: "Add skeleton loading placeholders with shimmer animation for content areas",
    icon: "💀",
  },
  {
    id: "comp-social-icons",
    category: "Components",
    label: "Add social media icons",
    labelZh: "添加社交媒体图标",
    prompt: "Add a social media icon bar with links to Twitter, GitHub, LinkedIn, and other platforms using SVG icons",
    icon: "🌐",
  },
  {
    id: "comp-testimonial-carousel",
    category: "Components",
    label: "Add testimonial carousel",
    labelZh: "添加客户评价轮播",
    prompt: "Add a testimonial carousel with customer quotes, avatars, and auto-rotation",
    icon: "💬",
  },
  {
    id: "comp-pricing-table",
    category: "Components",
    label: "Add pricing table",
    labelZh: "添加定价表",
    prompt: "Add a pricing table with 3 tiers (Basic, Pro, Enterprise) with feature comparison and CTA buttons",
    icon: "💰",
  },
  {
    id: "comp-newsletter",
    category: "Components",
    label: "Add newsletter signup",
    labelZh: "添加邮件订阅",
    prompt: "Add a newsletter signup section with email input, subscribe button, and privacy note",
    icon: "📧",
  },

  // ── Responsive ──────────────────────────────────────────────────────────────
  {
    id: "resp-improve-mobile",
    category: "Responsive",
    label: "Improve mobile layout",
    labelZh: "优化移动端布局",
    prompt: "Improve the mobile layout: stack columns vertically, adjust font sizes, add proper touch targets, and ensure no horizontal overflow",
    icon: "📱",
  },
  {
    id: "resp-hamburger-menu",
    category: "Responsive",
    label: "Add hamburger menu",
    labelZh: "添加汉堡菜单",
    prompt: "Convert the navigation to a hamburger menu on mobile with a slide-in drawer and overlay",
    icon: "🍔",
  },
  {
    id: "resp-fluid-typography",
    category: "Responsive",
    label: "Fluid typography",
    labelZh: "流体排版",
    prompt: "Implement fluid typography using CSS clamp() so font sizes scale smoothly between mobile and desktop",
    icon: "📏",
  },
  {
    id: "resp-grid-adaptive",
    category: "Responsive",
    label: "Adaptive grid layout",
    labelZh: "自适应网格布局",
    prompt: "Convert fixed-width grids to adaptive CSS Grid with auto-fit and minmax for natural responsive behavior",
    icon: "🔲",
  },

  // ── Animation ───────────────────────────────────────────────────────────────
  {
    id: "anim-hover",
    category: "Animation",
    label: "Add hover animations",
    labelZh: "添加悬停动画",
    prompt: "Add smooth hover animations to interactive elements: scale on buttons, underline on links, lift on cards",
    icon: "🎭",
  },
  {
    id: "anim-scroll-reveal",
    category: "Animation",
    label: "Add scroll reveal",
    labelZh: "添加滚动显现",
    prompt: "Add scroll-triggered reveal animations where sections fade in and slide up as they enter the viewport",
    icon: "👁️",
  },
  {
    id: "anim-page-transition",
    category: "Animation",
    label: "Add page transitions",
    labelZh: "添加页面过渡",
    prompt: "Add smooth page-level transition animations with fade and slide effects between sections",
    icon: "🎬",
  },
  {
    id: "anim-loading-spinner",
    category: "Animation",
    label: "Add loading spinner",
    labelZh: "添加加载动画",
    prompt: "Add a polished loading spinner animation with a pulsing brand-colored ring",
    icon: "🔄",
  },
];

/**
 * Get all unique categories from the quick commands.
 */
export function getCommandCategories(): string[] {
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const cmd of QUICK_COMMANDS) {
    if (!seen.has(cmd.category)) {
      seen.add(cmd.category);
      categories.push(cmd.category);
    }
  }
  return categories;
}

/**
 * Filter commands by category.
 */
export function getCommandsByCategory(category: string): QuickCommand[] {
  return QUICK_COMMANDS.filter((cmd) => cmd.category === category);
}

/**
 * Search commands by label (supports both English and Chinese).
 */
export function searchCommands(query: string): QuickCommand[] {
  const lower = query.toLowerCase();
  return QUICK_COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(lower) ||
      cmd.labelZh.includes(query) ||
      cmd.prompt.toLowerCase().includes(lower) ||
      cmd.category.toLowerCase().includes(lower),
  );
}

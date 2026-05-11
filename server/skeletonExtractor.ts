/**
 * Layout skeleton extraction from raw HTML.
 * Analyzes the structural elements and returns a human-readable description
 * that AI can use to generate a fresh, structurally similar template.
 */

export function extractBySelector(html: string, selector: string): string {
  const sel = selector.trim();
  if (!/^[a-z][a-z0-9]*$/i.test(sel)) return html;
  const tag = sel.toLowerCase();

  const openPattern = new RegExp(`<${tag}(?:\\s[^>]*)?>`, "i");
  const firstMatch = openPattern.exec(html);
  if (!firstMatch) return html;

  const startIdx = firstMatch.index;
  let pos = startIdx + firstMatch[0].length;
  let depth = 1;
  const closeTag = `</${tag}>`;

  while (depth > 0 && pos < html.length) {
    const nextOpenIdx = html.indexOf(`<${tag}`, pos);
    const nextCloseIdx = html.indexOf(closeTag, pos);

    if (nextCloseIdx === -1) break;

    if (nextOpenIdx !== -1 && nextOpenIdx < nextCloseIdx) {
      const charAfterTag = html[nextOpenIdx + 1 + tag.length];
      if (
        charAfterTag === ">" ||
        charAfterTag === " " ||
        charAfterTag === "\n" ||
        charAfterTag === "\t" ||
        charAfterTag === "\r"
      ) {
        depth++;
        pos = nextOpenIdx + 1 + tag.length;
      } else {
        pos = nextOpenIdx + 1;
      }
    } else {
      depth--;
      pos = nextCloseIdx + closeTag.length;
    }
  }

  return depth !== 0 ? html : html.slice(startIdx, pos);
}

export function extractLayoutSkeleton(html: string): string {
  const h = html.toLowerCase();
  const lines: string[] = [];

  const hasTopNav = /<nav|role=["']navigation|class=["'][^"']*navbar/.test(h);
  const hasSidebar = /sidebar|side-nav|side_nav|aside/.test(h);
  if (hasTopNav) lines.push("- Top navigation bar (logo left + links right, likely sticky)");
  if (hasSidebar) lines.push("- Left sidebar navigation panel");

  const hasHero = /hero|banner|jumbotron|masthead|splash/.test(h);
  if (hasHero) {
    const hasVideo = /video|background-video|autoplay/.test(h);
    const hasCTA = /btn|button|cta|get.started|sign.up|try.free/.test(h);
    lines.push(`- Hero section: full-width${hasVideo ? " video background" : ""}, large heading, subtext${hasCTA ? ", 1-2 CTA buttons" : ""}`);
  }

  const cardMatches = html.match(/<(?:div|article|li)[^>]*(?:card|feature|item|col)[^>]*>/gi) ?? [];
  if (cardMatches.length >= 3) {
    const is3col = /grid-cols-3|lg:grid-cols-3|col-md-4|three|3-col|col-4/.test(h);
    const is4col = /grid-cols-4|lg:grid-cols-4|col-md-3|four|4-col|col-3/.test(h);
    const cols = is4col ? 4 : is3col ? 3 : 2;
    lines.push(`- Feature / service card grid: ${cols}-column layout, ${Math.min(cardMatches.length, 8)} cards with icon + title + description`);
  }

  const hasPricing = /pric|plan|tier|monthly|annually|per.month|subscribe/.test(h);
  if (hasPricing) {
    const pricingCols = /three|3.plan|starter.+pro.+enterprise|basic.+standard.+premium/.test(h) ? 3 : 2;
    lines.push(`- Pricing section: ${pricingCols}-column pricing table with plan names, price, and feature list`);
  }

  const hasTestimonials = /testimonial|review|quote|client.say|what.people|feedback/.test(h);
  if (hasTestimonials) lines.push("- Testimonials section: quote cards (2-3 column) with avatar, name, role, and review text");

  const hasTeam = /team|staff|founder|our.people|meet.the/.test(h);
  if (hasTeam) lines.push("- Team section: profile cards with photo, name, job title, and social links");

  const hasFAQ = /faq|frequently.asked|accordion|question/.test(h);
  if (hasFAQ) lines.push("- FAQ section: accordion-style Q&A list");

  const hasStats = /\d+[k+m%]?\+?[\s\S]{0,20}(?:user|client|customer|download|project|year)/.test(h);
  if (hasStats) lines.push("- Statistics / metrics row: 3-4 large numbered highlights with labels");

  const hasCTASection = /get.started|sign.up.now|try.for.free|start.today|join.us/.test(h);
  if (hasCTASection) lines.push("- Full-width CTA section: compelling heading, subtext, primary button");

  const hasGallery = /gallery|portfolio|work|project|masonry/.test(h);
  if (hasGallery) lines.push("- Gallery / portfolio grid: image grid with hover overlay");

  const hasForm = /<form|contact.form|contact.us|send.message/.test(h);
  if (hasForm) lines.push("- Contact section: form with name / email / message fields, submit button, and contact info aside");

  const hasNewsletter = /newsletter|subscribe|email.list/.test(h);
  if (hasNewsletter) lines.push("- Newsletter signup: email input + subscribe button (inline or section)");

  const hasBlog = /blog|news|article|post|latest.update/.test(h);
  if (hasBlog) lines.push("- Blog / news section: 3-column card grid with image, date, title, excerpt, read-more link");

  const hasLogos = /partner|client.logo|trust|sponsor|as.seen/.test(h);
  if (hasLogos) lines.push("- Logo cloud: row of partner / client logos with grayscale filter");

  const hasFooter = /<footer/.test(html);
  if (hasFooter) {
    const footerCols = /grid-cols-4|col-md-3|four.column/.test(h) ? 4 : /grid-cols-3|col-md-4|three.column/.test(h) ? 3 : 2;
    lines.push(`- Footer: ${footerCols}-column layout (links, about, contact, social) + copyright bar`);
  }

  const isDarkTheme = /bg-gray-9|bg-slate-9|bg-black|dark.mode|theme-dark/.test(h);
  const hasAnimations = /animate|transition|motion|aos|gsap|scroll/.test(h);
  const hasBackground = /gradient|radial|linear-gradient|bg-gradient/.test(h);
  const hints: string[] = [];
  if (isDarkTheme) hints.push("dark color scheme");
  if (hasAnimations) hints.push("scroll animations");
  if (hasBackground) hints.push("gradient backgrounds");
  if (hints.length) lines.push(`\nStyle hints: ${hints.join(", ")}`);

  if (lines.length === 0) {
    lines.push("- Standard marketing website layout");
    lines.push("- Header with navigation");
    lines.push("- Hero section with CTA");
    lines.push("- 3-column feature section");
    lines.push("- Footer with links");
  }

  return lines.join("\n");
}

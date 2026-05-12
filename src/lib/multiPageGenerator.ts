/**
 * Multi-page Site Generator — Analyzes a homepage and generates
 * consistent sub-pages with shared navigation, footer, and styling.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type PageType = "home" | "about" | "services" | "contact" | "blog" | "portfolio" | "faq" | "pricing";

export interface SitePage {
  type: PageType;
  title: string;
  slug: string;
}

export interface SiteMap {
  pages: SitePage[];
  navLinks: Array<{ label: string; href: string }>;
}

export interface GeneratedPage {
  type: PageType;
  html: string;
  css: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseHtml(html: string): Document {
  const full = html.includes("<html") ? html : `<!DOCTYPE html><html><head></head><body>${html}</body></html>`;
  const parser = new DOMParser();
  return parser.parseFromString(full, "text/html");
}

function extractNav(html: string): string {
  const doc = parseHtml(html);
  const nav = doc.querySelector("nav");
  if (nav) return nav.outerHTML;

  // Fallback: look for header
  const header = doc.querySelector("header");
  if (header) return header.outerHTML;

  return "";
}

function extractFooter(html: string): string {
  const doc = parseHtml(html);
  const footer = doc.querySelector("footer");
  if (footer) return footer.outerHTML;
  return "";
}

function extractColorScheme(css: string): {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  text: string;
} {
  const findColor = (pattern: RegExp, fallback: string): string => {
    const m = css.match(pattern);
    return m ? m[1] : fallback;
  };

  return {
    primary: findColor(/(?:bg|text|border)-(\w+)-\d{3}/, "slate"),
    secondary: findColor(/(?:bg|text|border)-(\w+)-\d{3}/g, "gray") as string,
    accent: findColor(/accent[^\s]*\s*(\w+)-\d{3}/, "indigo"),
    bg: findColor(/bg-(white|slate-\d+|gray-\d+)/, "white"),
    text: findColor(/text-(slate|gray|zinc)-\d{3}/, "slate-900"),
  };
}

function extractHeading(html: string): string {
  const doc = parseHtml(html);
  const h1 = doc.querySelector("h1");
  if (h1) return h1.textContent?.trim() ?? "Website";
  return "Website";
}

function extractLogo(html: string): string {
  const doc = parseHtml(html);
  const img = doc.querySelector("header img, nav img, .logo img");
  if (img) return img.outerHTML;
  return "";
}

// ─── Page Templates ──────────────────────────────────────────────────────────

function generateAboutPage(html: string, css: string, siteMap: SiteMap): string {
  const navHtml = buildNav(siteMap, "about");
  const footerHtml = extractFooter(html);
  const logo = extractLogo(html);
  const siteName = extractHeading(html);

  return `<div class="min-h-screen bg-white">
  ${navHtml}

  <main class="max-w-6xl mx-auto px-6 py-16">
    <div class="text-center mb-16">
      <h1 class="text-4xl md:text-5xl font-bold text-slate-900 mb-4">About ${siteName}</h1>
      <p class="text-lg text-slate-600 max-w-2xl mx-auto">Learn more about our story, mission, and the team behind ${siteName}.</p>
    </div>

    <div class="grid md:grid-cols-2 gap-16 mb-20">
      <div>
        <h2 class="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
        <p class="text-slate-600 leading-relaxed mb-4">We are dedicated to delivering exceptional experiences that empower our users and communities. Our mission is to create innovative solutions that make a meaningful difference.</p>
        <p class="text-slate-600 leading-relaxed">Founded with a passion for excellence, we continue to push boundaries and set new standards in our industry.</p>
      </div>
      <div class="bg-slate-100 rounded-2xl p-8 flex items-center justify-center">
        <div class="text-center">
          <div class="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <p class="text-sm font-semibold text-slate-500 uppercase tracking-wider">Est. 2024</p>
        </div>
      </div>
    </div>

    <div class="mb-20">
      <h2 class="text-2xl font-bold text-slate-900 mb-8 text-center">Our Values</h2>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h3 class="font-bold text-slate-900 mb-2">Quality First</h3>
          <p class="text-sm text-slate-600">We never compromise on quality. Every product and service meets the highest standards.</p>
        </div>
        <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div class="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
          <h3 class="font-bold text-slate-900 mb-2">Community</h3>
          <p class="text-sm text-slate-600">Building strong relationships with our users and partners is at the heart of everything we do.</p>
        </div>
        <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <h3 class="font-bold text-slate-900 mb-2">Innovation</h3>
          <p class="text-sm text-slate-600">Constantly evolving and embracing new technologies to stay ahead of the curve.</p>
        </div>
      </div>
    </div>

    <div class="bg-slate-50 rounded-2xl p-10 text-center">
      <h2 class="text-2xl font-bold text-slate-900 mb-4">Meet the Team</h2>
      <p class="text-slate-600 mb-8 max-w-lg mx-auto">Our talented team brings together diverse expertise to deliver outstanding results.</p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div class="text-center">
          <div class="w-20 h-20 bg-slate-200 rounded-full mx-auto mb-3"></div>
          <p class="font-semibold text-slate-900 text-sm">Alex Johnson</p>
          <p class="text-xs text-slate-500">CEO & Founder</p>
        </div>
        <div class="text-center">
          <div class="w-20 h-20 bg-slate-200 rounded-full mx-auto mb-3"></div>
          <p class="font-semibold text-slate-900 text-sm">Sarah Chen</p>
          <p class="text-xs text-slate-500">CTO</p>
        </div>
        <div class="text-center">
          <div class="w-20 h-20 bg-slate-200 rounded-full mx-auto mb-3"></div>
          <p class="font-semibold text-slate-900 text-sm">Mike Williams</p>
          <p class="text-xs text-slate-500">Lead Designer</p>
        </div>
        <div class="text-center">
          <div class="w-20 h-20 bg-slate-200 rounded-full mx-auto mb-3"></div>
          <p class="font-semibold text-slate-900 text-sm">Emily Davis</p>
          <p class="text-xs text-slate-500">Marketing</p>
        </div>
      </div>
    </div>
  </main>

  ${footerHtml}
</div>`;
}

function generateServicesPage(html: string, css: string, siteMap: SiteMap): string {
  const navHtml = buildNav(siteMap, "services");
  const footerHtml = extractFooter(html);

  return `<div class="min-h-screen bg-white">
  ${navHtml}

  <main class="max-w-6xl mx-auto px-6 py-16">
    <div class="text-center mb-16">
      <p class="text-sm font-bold uppercase tracking-widest text-indigo-600 mb-3">What We Offer</p>
      <h1 class="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Our Services</h1>
      <p class="text-lg text-slate-600 max-w-2xl mx-auto">Comprehensive solutions tailored to your needs. We deliver results that matter.</p>
    </div>

    <div class="grid md:grid-cols-3 gap-8 mb-20">
      <div class="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow group">
        <div class="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-600 transition-colors">
          <svg class="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
        </div>
        <h3 class="text-xl font-bold text-slate-900 mb-3">Web Development</h3>
        <p class="text-slate-600 text-sm leading-relaxed mb-4">Custom websites and web applications built with modern technologies for optimal performance and user experience.</p>
        <a href="#" class="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Learn more →</a>
      </div>

      <div class="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow group">
        <div class="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-emerald-600 transition-colors">
          <svg class="w-7 h-7 text-emerald-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>
        </div>
        <h3 class="text-xl font-bold text-slate-900 mb-3">UI/UX Design</h3>
        <p class="text-slate-600 text-sm leading-relaxed mb-4">Beautiful, intuitive interfaces designed to delight users and drive engagement across all platforms.</p>
        <a href="#" class="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Learn more →</a>
      </div>

      <div class="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow group">
        <div class="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-purple-600 transition-colors">
          <svg class="w-7 h-7 text-purple-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        </div>
        <h3 class="text-xl font-bold text-slate-900 mb-3">Performance Optimization</h3>
        <p class="text-slate-600 text-sm leading-relaxed mb-4">Speed up your website with advanced optimization techniques that improve load times and user satisfaction.</p>
        <a href="#" class="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Learn more →</a>
      </div>

      <div class="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow group">
        <div class="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-amber-600 transition-colors">
          <svg class="w-7 h-7 text-amber-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
        </div>
        <h3 class="text-xl font-bold text-slate-900 mb-3">Mobile Development</h3>
        <p class="text-slate-600 text-sm leading-relaxed mb-4">Native and cross-platform mobile applications that provide seamless experiences on iOS and Android.</p>
        <a href="#" class="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Learn more →</a>
      </div>

      <div class="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow group">
        <div class="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-rose-600 transition-colors">
          <svg class="w-7 h-7 text-rose-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
        </div>
        <h3 class="text-xl font-bold text-slate-900 mb-3">Analytics & SEO</h3>
        <p class="text-slate-600 text-sm leading-relaxed mb-4">Data-driven insights and search engine optimization to maximize your online visibility and growth.</p>
        <a href="#" class="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Learn more →</a>
      </div>

      <div class="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow group">
        <div class="w-14 h-14 bg-cyan-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-cyan-600 transition-colors">
          <svg class="w-7 h-7 text-cyan-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
        </div>
        <h3 class="text-xl font-bold text-slate-900 mb-3">24/7 Support</h3>
        <p class="text-slate-600 text-sm leading-relaxed mb-4">Round-the-clock technical support and maintenance to keep your digital presence running smoothly.</p>
        <a href="#" class="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Learn more →</a>
      </div>
    </div>
  </main>

  ${footerHtml}
</div>`;
}

function generateContactPage(html: string, css: string, siteMap: SiteMap): string {
  const navHtml = buildNav(siteMap, "contact");
  const footerHtml = extractFooter(html);

  return `<div class="min-h-screen bg-white">
  ${navHtml}

  <main class="max-w-6xl mx-auto px-6 py-16">
    <div class="text-center mb-16">
      <p class="text-sm font-bold uppercase tracking-widest text-indigo-600 mb-3">Get in Touch</p>
      <h1 class="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Contact Us</h1>
      <p class="text-lg text-slate-600 max-w-2xl mx-auto">Have a question or want to work together? We'd love to hear from you.</p>
    </div>

    <div class="grid md:grid-cols-5 gap-12">
      <div class="md:col-span-2 space-y-8">
        <div>
          <h3 class="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Contact Info</h3>
          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-900">Email</p>
                <p class="text-sm text-slate-600">hello@example.com</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-900">Phone</p>
                <p class="text-sm text-slate-600">+1 (555) 123-4567</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-900">Address</p>
                <p class="text-sm text-slate-600">123 Main Street<br/>City, State 12345</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="md:col-span-3">
        <form class="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
          <div class="grid md:grid-cols-2 gap-6">
            <div>
              <label for="name" class="block text-sm font-semibold text-slate-900 mb-2">Full Name</label>
              <input type="text" id="name" name="name" placeholder="John Doe" class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
            <div>
              <label for="email" class="block text-sm font-semibold text-slate-900 mb-2">Email Address</label>
              <input type="email" id="email" name="email" placeholder="john@example.com" class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
          </div>
          <div>
            <label for="subject" class="block text-sm font-semibold text-slate-900 mb-2">Subject</label>
            <input type="text" id="subject" name="subject" placeholder="How can we help?" class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div>
            <label for="message" class="block text-sm font-semibold text-slate-900 mb-2">Message</label>
            <textarea id="message" name="message" rows="5" placeholder="Tell us more about your project..." class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"></textarea>
          </div>
          <button type="submit" class="w-full bg-slate-900 text-white font-bold py-3.5 px-6 rounded-xl hover:bg-slate-800 transition-colors">Send Message</button>
        </form>
      </div>
    </div>
  </main>

  ${footerHtml}
</div>`;
}

function generateBlogPage(html: string, css: string, siteMap: SiteMap): string {
  const navHtml = buildNav(siteMap, "blog");
  const footerHtml = extractFooter(html);

  const posts = [
    { title: "Getting Started with Modern Web Development", date: "Jan 15, 2025", category: "Tutorial", excerpt: "Learn the fundamentals of building modern web applications with the latest tools and frameworks." },
    { title: "10 Tips for Better UI Design", date: "Jan 10, 2025", category: "Design", excerpt: "Improve your design skills with these proven tips used by professional designers worldwide." },
    { title: "The Future of Frontend Development", date: "Jan 5, 2025", category: "Industry", excerpt: "Explore emerging trends and technologies that are shaping the future of frontend development." },
  ];

  return `<div class="min-h-screen bg-white">
  ${navHtml}

  <main class="max-w-6xl mx-auto px-6 py-16">
    <div class="text-center mb-16">
      <p class="text-sm font-bold uppercase tracking-widest text-indigo-600 mb-3">Our Blog</p>
      <h1 class="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Latest Articles</h1>
      <p class="text-lg text-slate-600 max-w-2xl mx-auto">Insights, tutorials, and updates from our team.</p>
    </div>

    <div class="grid md:grid-cols-3 gap-8">
      ${posts.map((post) => `
      <article class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div class="h-48 bg-gradient-to-br from-indigo-100 to-purple-100"></div>
        <div class="p-6">
          <div class="flex items-center gap-2 mb-3">
            <span class="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full">${post.category}</span>
            <span class="text-xs text-slate-400">${post.date}</span>
          </div>
          <h2 class="text-lg font-bold text-slate-900 mb-2">${post.title}</h2>
          <p class="text-sm text-slate-600 leading-relaxed mb-4">${post.excerpt}</p>
          <a href="#" class="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Read article →</a>
        </div>
      </article>`).join("")}
    </div>
  </main>

  ${footerHtml}
</div>`;
}

function generatePortfolioPage(html: string, css: string, siteMap: SiteMap): string {
  const navHtml = buildNav(siteMap, "portfolio");
  const footerHtml = extractFooter(html);

  return `<div class="min-h-screen bg-white">
  ${navHtml}

  <main class="max-w-6xl mx-auto px-6 py-16">
    <div class="text-center mb-16">
      <p class="text-sm font-bold uppercase tracking-widest text-indigo-600 mb-3">Our Work</p>
      <h1 class="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Portfolio</h1>
      <p class="text-lg text-slate-600 max-w-2xl mx-auto">A showcase of our recent projects and creative solutions.</p>
    </div>

    <div class="grid md:grid-cols-2 gap-8 mb-12">
      <div class="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
        <div class="h-64 bg-gradient-to-br from-blue-100 to-indigo-100 relative overflow-hidden">
          <div class="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors"></div>
        </div>
        <div class="p-6">
          <span class="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-2 block">Web Application</span>
          <h3 class="text-xl font-bold text-slate-900 mb-2">E-Commerce Platform</h3>
          <p class="text-sm text-slate-600 mb-4">A modern e-commerce solution with advanced product filtering, real-time inventory, and seamless checkout.</p>
          <div class="flex gap-2">
            <span class="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">React</span>
            <span class="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">Node.js</span>
            <span class="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">PostgreSQL</span>
          </div>
        </div>
      </div>

      <div class="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
        <div class="h-64 bg-gradient-to-br from-emerald-100 to-teal-100 relative overflow-hidden">
          <div class="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors"></div>
        </div>
        <div class="p-6">
          <span class="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2 block">Mobile App</span>
          <h3 class="text-xl font-bold text-slate-900 mb-2">Fitness Tracker</h3>
          <p class="text-sm text-slate-600 mb-4">A cross-platform fitness app with workout tracking, nutrition logging, and social challenges.</p>
          <div class="flex gap-2">
            <span class="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">React Native</span>
            <span class="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">Firebase</span>
          </div>
        </div>
      </div>
    </div>
  </main>

  ${footerHtml}
</div>`;
}

function generateFaqPage(html: string, css: string, siteMap: SiteMap): string {
  const navHtml = buildNav(siteMap, "faq");
  const footerHtml = extractFooter(html);

  const faqs = [
    { q: "What services do you offer?", a: "We offer a comprehensive range of digital services including web development, UI/UX design, mobile app development, and digital marketing consulting." },
    { q: "How long does a typical project take?", a: "Project timelines vary based on scope and complexity. A simple website takes 2-4 weeks, while complex applications may take 2-6 months. We provide detailed timelines during our initial consultation." },
    { q: "What is your pricing structure?", a: "We offer both project-based and retainer pricing. Each project is quoted individually based on requirements. Contact us for a free estimate tailored to your needs." },
    { q: "Do you provide ongoing support?", a: "Yes! We offer ongoing maintenance and support packages to keep your digital presence running smoothly, including updates, monitoring, and technical assistance." },
    { q: "Can you work with our existing brand?", a: "Absolutely. We can work within your existing brand guidelines or help you develop a new brand identity from scratch." },
  ];

  return `<div class="min-h-screen bg-white">
  ${navHtml}

  <main class="max-w-3xl mx-auto px-6 py-16">
    <div class="text-center mb-16">
      <p class="text-sm font-bold uppercase tracking-widest text-indigo-600 mb-3">Support</p>
      <h1 class="text-4xl md:text-5xl font-bold text-slate-900 mb-4">FAQ</h1>
      <p class="text-lg text-slate-600">Frequently asked questions about our services and process.</p>
    </div>

    <div class="space-y-4">
      ${faqs.map((faq, i) => `
      <details class="bg-white border border-slate-200 rounded-2xl shadow-sm group" ${i === 0 ? "open" : ""}>
        <summary class="flex items-center justify-between px-6 py-5 cursor-pointer text-slate-900 font-bold hover:text-indigo-600 transition-colors">
          <span>${faq.q}</span>
          <svg class="w-5 h-5 text-slate-400 shrink-0 ml-4 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </summary>
        <div class="px-6 pb-5 text-sm text-slate-600 leading-relaxed">${faq.a}</div>
      </details>`).join("")}
    </div>
  </main>

  ${footerHtml}
</div>`;
}

function generatePricingPage(html: string, css: string, siteMap: SiteMap): string {
  const navHtml = buildNav(siteMap, "pricing");
  const footerHtml = extractFooter(html);

  return `<div class="min-h-screen bg-white">
  ${navHtml}

  <main class="max-w-6xl mx-auto px-6 py-16">
    <div class="text-center mb-16">
      <p class="text-sm font-bold uppercase tracking-widest text-indigo-600 mb-3">Pricing</p>
      <h1 class="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Simple, Transparent Pricing</h1>
      <p class="text-lg text-slate-600 max-w-2xl mx-auto">Choose the plan that works best for you. All plans include core features.</p>
    </div>

    <div class="grid md:grid-cols-3 gap-8">
      <div class="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h3 class="text-lg font-bold text-slate-900 mb-2">Starter</h3>
        <p class="text-sm text-slate-500 mb-6">Perfect for small projects</p>
        <div class="mb-6">
          <span class="text-4xl font-extrabold text-slate-900">$49</span>
          <span class="text-slate-500 text-sm">/month</span>
        </div>
        <ul class="space-y-3 mb-8">
          <li class="flex items-center gap-2 text-sm text-slate-600"><svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>5 Projects</li>
          <li class="flex items-center gap-2 text-sm text-slate-600"><svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>Basic Analytics</li>
          <li class="flex items-center gap-2 text-sm text-slate-600"><svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>Email Support</li>
        </ul>
        <button class="w-full py-3 px-6 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 hover:bg-slate-50 transition-colors">Get Started</button>
      </div>

      <div class="bg-slate-900 rounded-2xl p-8 shadow-lg relative">
        <div class="absolute top-4 right-4 px-2.5 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-full">Popular</div>
        <h3 class="text-lg font-bold text-white mb-2">Professional</h3>
        <p class="text-sm text-slate-400 mb-6">Best for growing businesses</p>
        <div class="mb-6">
          <span class="text-4xl font-extrabold text-white">$149</span>
          <span class="text-slate-400 text-sm">/month</span>
        </div>
        <ul class="space-y-3 mb-8">
          <li class="flex items-center gap-2 text-sm text-slate-300"><svg class="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>Unlimited Projects</li>
          <li class="flex items-center gap-2 text-sm text-slate-300"><svg class="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>Advanced Analytics</li>
          <li class="flex items-center gap-2 text-sm text-slate-300"><svg class="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>Priority Support</li>
          <li class="flex items-center gap-2 text-sm text-slate-300"><svg class="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>Custom Integrations</li>
        </ul>
        <button class="w-full py-3 px-6 bg-white text-slate-900 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors">Get Started</button>
      </div>

      <div class="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h3 class="text-lg font-bold text-slate-900 mb-2">Enterprise</h3>
        <p class="text-sm text-slate-500 mb-6">For large organizations</p>
        <div class="mb-6">
          <span class="text-4xl font-extrabold text-slate-900">$399</span>
          <span class="text-slate-500 text-sm">/month</span>
        </div>
        <ul class="space-y-3 mb-8">
          <li class="flex items-center gap-2 text-sm text-slate-600"><svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>Everything in Pro</li>
          <li class="flex items-center gap-2 text-sm text-slate-600"><svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>Dedicated Manager</li>
          <li class="flex items-center gap-2 text-sm text-slate-600"><svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>SLA & Uptime Guarantee</li>
          <li class="flex items-center gap-2 text-sm text-slate-600"><svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>White Label Options</li>
        </ul>
        <button class="w-full py-3 px-6 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 hover:bg-slate-50 transition-colors">Contact Sales</button>
      </div>
    </div>
  </main>

  ${footerHtml}
</div>`;
}

// ─── Navigation Builder ──────────────────────────────────────────────────────

function buildNav(siteMap: SiteMap, currentPage: string): string {
  const links = siteMap.navLinks
    .map((link) => {
      const isActive = link.href === `/${currentPage}` || (currentPage === "home" && link.href === "/");
      const activeClasses = isActive ? "text-indigo-600" : "text-slate-600 hover:text-slate-900";
      return `<a href="${link.href}" class="text-sm font-semibold ${activeClasses} transition-colors">${link.label}</a>`;
    })
    .join("\n      ");

  return `<nav class="bg-white border-b border-slate-200">
  <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
    <a href="/" class="text-xl font-extrabold text-slate-900">Website</a>
    <div class="flex items-center gap-6">
      ${links}
    </div>
  </div>
</nav>`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Analyzes a homepage and infers a site structure with common pages.
 */
export function generateSiteMap(homeHtml: string, homeCss: string): SiteMap {
  const doc = parseHtml(homeHtml);

  // Detect existing nav structure
  const existingLinks = Array.from(doc.querySelectorAll("nav a, header a[href]"));
  const detectedPages: Set<string> = new Set();
  existingLinks.forEach((a) => {
    const href = a.getAttribute("href") ?? "";
    const slug = href.replace(/^\//, "").replace(/\.html?$/, "").toLowerCase();
    if (slug && slug !== "#" && slug !== "home" && slug !== "") {
      detectedPages.add(slug);
    }
  });

  // Always include these standard pages
  const standardPages: PageType[] = ["home", "about", "services", "contact", "blog"];

  // If we detected specific pages, map them
  const pageTypeMap: Record<string, PageType> = {
    about: "about",
    services: "services",
    service: "services",
    contact: "contact",
    blog: "blog",
    news: "blog",
    portfolio: "portfolio",
    work: "portfolio",
    projects: "portfolio",
    faq: "faq",
    help: "faq",
    support: "faq",
    pricing: "pricing",
    plans: "pricing",
  };

  const pages: SitePage[] = [];
  const addedTypes = new Set<PageType>();

  // Add home
  pages.push({ type: "home", title: "Home", slug: "/" });
  addedTypes.add("home");

  // Add detected pages
  for (const slug of detectedPages) {
    const type = pageTypeMap[slug];
    if (type && !addedTypes.has(type)) {
      pages.push({ type, title: slug.charAt(0).toUpperCase() + slug.slice(1), slug: `/${slug}` });
      addedTypes.add(type);
    }
  }

  // Fill in standard pages if not enough detected
  for (const type of standardPages) {
    if (!addedTypes.has(type)) {
      pages.push({
        type,
        title: type.charAt(0).toUpperCase() + type.slice(1),
        slug: type === "home" ? "/" : `/${type}`,
      });
      addedTypes.add(type);
    }
  }

  const navLinks = pages.map((p) => ({
    label: p.title,
    href: p.slug,
  }));

  return { pages, navLinks };
}

/**
 * Generates a specific page based on the homepage structure.
 */
export function generatePage(
  homeHtml: string,
  homeCss: string,
  pageType: PageType,
  siteMap: SiteMap,
): GeneratedPage {
  let html: string;

  switch (pageType) {
    case "home":
      html = homeHtml;
      break;
    case "about":
      html = generateAboutPage(homeHtml, homeCss, siteMap);
      break;
    case "services":
      html = generateServicesPage(homeHtml, homeCss, siteMap);
      break;
    case "contact":
      html = generateContactPage(homeHtml, homeCss, siteMap);
      break;
    case "blog":
      html = generateBlogPage(homeHtml, homeCss, siteMap);
      break;
    case "portfolio":
      html = generatePortfolioPage(homeHtml, homeCss, siteMap);
      break;
    case "faq":
      html = generateFaqPage(homeHtml, homeCss, siteMap);
      break;
    case "pricing":
      html = generatePricingPage(homeHtml, homeCss, siteMap);
      break;
    default:
      html = homeHtml;
  }

  return { type: pageType, html, css: homeCss };
}

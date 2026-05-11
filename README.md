<div align="center">
<img width="1200" height="475" alt="GHBanner" src="./assets/banner.png" />
</div>

# Layout Replicator
Layout Forge is a feature-rich and well-architected AI-powered web layout replication tool.
> Upload a screenshot or provide a URL, and AI replicates the layout as clean, editable HTML + Tailwind CSS code.

Supports brand kit customization, SEO generation, accessibility checking, component extraction, batch processing, and a chat-based refinement panel.

---

## Features

- **Screenshot Replication** — Upload any webpage screenshot; AI analyzes layout, colors, and spacing to generate semantic HTML + Tailwind CSS
- **URL Skeleton Extraction** — Fetch a URL, extract the layout skeleton, generate a fresh template (no original content copied)
- **Brand Kit** — Define brand colors, fonts, logo, etc., and AI automatically applies them to generated pages
- **Component Extraction** — Automatically split generated HTML into reusable components (navbar, hero, feature cards, etc.)
- **SEO Generation** — Auto-generate SEO meta tags based on page content
- **Accessibility Checker** — Audit page accessibility issues and suggest fixes
- **Chat Refinement** — Adjust layout and style in real time through conversational AI
- **Batch Processing** — Upload multiple screenshots at once and replicate layouts in bulk
- **Device Preview** — Switch between desktop, tablet, and mobile views
- **Multi-format Export** — Export as HTML + Tailwind, React + Tailwind, or Vue 3 code
- **Style Template Mode** — Extract design language from images, generate editable templates with CSS custom properties

---

## Feature Architecture

```
Input Layer                 Processing Layer               Output Layer
┌─────────────────┐     ┌──────────────────────┐    ┌─────────────────┐
│ 📷 Image Upload  │     │ Multi-Pass Pipeline   │    │ 💻 Code Editor   │
│ 🌐 URL Fetch     │ ──→ │  Pass 1: Analysis     │ ──→ │ 👁️ Live Preview  │
│ 📦 Batch Upload  │     │  Pass 2: Generation   │    │ 📥 Multi-format   │
│                 │     │  Pass 3: Refinement   │    │ 💾 Project Save   │
└─────────────────┘     └──────────────────────┘    └─────────────────┘
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
              Pixel Layout  Scene     Design
              Analysis      Classify  Template
```

## Feature List

<table>
  <thead>
    <tr>
      <th>Category</th>
      <th>Feature</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="6"><strong>Core Pipeline</strong></td>
      <td>Multi-Pass Vision Pipeline</td>
      <td>Analyze → Generate → Refine three-stage pipeline for significantly improved accuracy</td>
    </tr>
    <tr>
      <td>URL → Code</td>
      <td>Server-side Playwright screenshot + skeleton extraction, vision model replication</td>
    </tr>
    <tr>
      <td>Pixel Layout Analysis</td>
      <td>Canvas pixel sampling: color bands, column structure, content density, brightness</td>
    </tr>
    <tr>
      <td>Scene Classification</td>
      <td>AI classifies images: portrait / scenery / animal / object / abstract</td>
    </tr>
    <tr>
      <td>Style Template Mode</td>
      <td>Extract design language, generate CSS custom properties + {{variable}} placeholders, no image embedding</td>
    </tr>
    <tr>
      <td>Chart Detection & Recreation</td>
      <td>Detect bar/line/pie/area charts in screenshots, recreate as interactive Recharts components</td>
    </tr>
    <tr>
      <td rowspan="2"><strong>Tech Stack</strong></td>
      <td>3 Output Formats</td>
      <td>HTML + Tailwind, React + Tailwind, Vue 3</td>
    </tr>
    <tr>
      <td>Multi-Provider AI</td>
      <td>OpenAI / Anthropic / DeepSeek / Qwen / Groq / Zhipu / Google / Xiaomi MiMo</td>
    </tr>
    <tr>
      <td rowspan="6"><strong>Editing</strong></td>
      <td>Monaco Code Editor</td>
      <td>Dual-tab HTML / CSS editing with syntax highlighting</td>
    </tr>
    <tr>
      <td>Brand Kit</td>
      <td>Colors / fonts / border-radius / logo / company info, injected as CSS variables</td>
    </tr>
    <tr>
      <td>Template Variables</td>
      <td>AI detects editable text, {{variable}} form-based editing</td>
    </tr>
    <tr>
      <td>AI Chat Refinement</td>
      <td>Conversational iterative code modification with instruction-based optimization</td>
    </tr>
    <tr>
      <td>Image Editor</td>
      <td>Crop / replace detected image assets</td>
    </tr>
    <tr>
      <td>Asset Management</td>
      <td>Detect → crop → replace → upload images, with manual addition support</td>
    </tr>
    <tr>
      <td rowspan="3"><strong>Quality Analysis</strong></td>
      <td>Accessibility Checker</td>
      <td>11 rules (img-alt, heading-order, color-contrast, etc.), scored 0–100</td>
    </tr>
    <tr>
      <td>SEO Panel</td>
      <td>AI-generated meta / Open Graph / Twitter Card tags, fully editable</td>
    </tr>
    <tr>
      <td>Device Preview</td>
      <td>Mobile / Tablet / Desktop / Wide switching, auto-resizing iframe height</td>
    </tr>
    <tr>
      <td rowspan="6"><strong>Infrastructure</strong></td>
      <td>SSRF Protection</td>
      <td>URL safety validation with allowlisted domains</td>
    </tr>
    <tr>
      <td>Response Caching</td>
      <td>Server-side AI response cache for 30 minutes (max 50 entries)</td>
    </tr>
    <tr>
      <td>Rate Limiting</td>
      <td>20 requests per 60 seconds per IP</td>
    </tr>
    <tr>
      <td>Batch Processing</td>
      <td>Parallel multi-image generation</td>
    </tr>
    <tr>
      <td>Project Management</td>
      <td>localStorage-based project history save/load</td>
    </tr>
    <tr>
      <td>Internationalization</td>
      <td>English / Chinese language switching</td>
    </tr>
  </tbody>
</table>

---

## Supported AI Providers

| Provider | Env Variable |
|----------|-------------|
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Google Gemini | `GOOGLE_AI_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| Qwen (Tongyi Qianwen) | `QWEN_API_KEY` |
| Zhipu GLM | `ZHIPU_API_KEY` |
| Groq | `GROQ_API_KEY` |
| Xiaomi MiMo | `MIMO_API_KEY` |
| Custom (OpenAI-compatible) | `AI_CUSTOM_API_KEY` + `AI_CUSTOM_BASE_URL` |

---

## Quick Start

### Prerequisites

- Node.js >= 18

### 1. Clone & Install

```bash
git clone <repo-url>
cd layout-replicator
npm install
```

### 2. Configure Environment

Copy the environment template and configure:

```bash
cp .env.example .env.local
```

Edit `.env.local` with at least:

```ini
AI_PROVIDER=mimo                          # Choose your AI provider
MIMO_API_KEY="your-api-key-here"          # Set the corresponding API key
```

> See [.env.example](.env.example) for all available options.

### 3. Run

```bash
npm run dev
```

Open your browser to **http://localhost:3000**

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_PROVIDER` | Yes | AI provider to use (openai, anthropic, google, deepseek, qwen, zhipu, groq, mimo, custom) |
| `AI_API_BASE_URL` | No | Generic API base URL override for custom gateways or proxies |
| `AI_MODEL_TEXT` | No | Text model override |
| `AI_MODEL_VISION` | No | Vision model override |
| `{PROVIDER}_API_KEY` | Yes | API key for the corresponding provider |

---

## Project Structure

```
├── .env.local           # Local environment config (secrets, gitignored)
├── .env.example         # Environment variable template
├── server.ts            # Express backend (AI proxy routing, caching, URL fetching)
├── vite.config.ts       # Vite build configuration
├── src/
│   ├── App.tsx          # Main app component
│   ├── components/      # UI components
│   │   ├── UploadZone.tsx
│   │   ├── ResultView.tsx
│   │   ├── ChatPanel.tsx
│   │   ├── BrandKitPanel.tsx
│   │   ├── SEOPanel.tsx
│   │   └── ...
│   └── lib/
│       ├── providers.ts   # AI provider & model definitions
│       ├── brandKit.ts    # Brand kit logic
│       ├── codeExporter.ts# Code export
│       └── ...
```

---

## Architecture

- **Frontend:** React 19 + Vite 6 + Tailwind CSS v4
- **Backend:** Express 4 (port 3000), TypeScript via `tsx`
- **AI Proxy Pattern:** The browser never calls AI providers directly. Requests go through the local Express server, which forwards them to the AI provider. API keys stay server-side.
- **Caching:** Non-streaming, non-image AI responses are cached for 30 minutes (max 50 entries).
- **Rate Limiting:** 20 requests per 60 seconds per IP on AI endpoints.
- **SSRF Protection:** MiMo API base URLs are restricted to allowlisted domains.

---

## License

MIT

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="./assets/banner.png" />
</div>

# Layout Replicator

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
- **Multi-format Export** — Export as HTML, React, Vue, or Next.js code

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

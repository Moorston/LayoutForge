/**
 * ToolboxPanel — Unified entry point for all 20 advanced features.
 *
 * Displays a card grid of tools organized by category.
 * Clicking a card opens that tool's panel inline with a back button.
 */

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Moon,
  Layers,
  Smartphone,
  Palette,
  BookOpen,
  Figma,
  ShoppingBag,
  SplitSquareHorizontal,
  History,
  Rocket,
  Sparkles,
  Gauge,
  FileStack,
  TestTube,
  Accessibility,
  Database,
  Wand2,
  Search,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Feature panels (lazy-ish imports via direct references) ──────────────────
import { DarkModePanel } from "./DarkModePanel";
import { PixelHeatmapOverlay } from "./PixelHeatmapOverlay";
import { MultiBreakpointPreview } from "./MultiBreakpointPreview";
import { PaletteEditor } from "./PaletteEditor";
import { ComponentGallery } from "./ComponentGallery";
import { DesignSystemPanel } from "./DesignSystemPanel";
import { FigmaImportPanel } from "./FigmaImportPanel";
import { TemplateMarket } from "./TemplateMarket";
import { ABComparePanel } from "./ABComparePanel";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import { DeployPanel } from "./DeployPanel";
import { ScrollAnimationPanel } from "./ScrollAnimationPanel";
import { PerformanceAuditPanel } from "./PerformanceAuditPanel";
import { MultiPagePanel } from "./MultiPagePanel";
import { OutputFormatPanel } from "./OutputFormatPanel";
import { TestGenPanel } from "./TestGenPanel";
import { WcagAutoFixPanel } from "./WcagAutoFixPanel";
import { CMSAdapterPanel } from "./CMSAdapterPanel";
import { StorybookPanel } from "./StorybookPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToolID =
  | "darkMode"
  | "heatmap"
  | "responsive"
  | "palette"
  | "components"
  | "designSystem"
  | "figma"
  | "templateMarket"
  | "abCompare"
  | "versionHistory"
  | "deploy"
  | "scrollAnimation"
  | "performance"
  | "multiPage"
  | "nativeExport"
  | "testGen"
  | "wcagFix"
  | "cmsAdapter"
  | "storybook";

interface ToolDef {
  id: ToolID;
  icon: LucideIcon;
  name: string;
  desc: string;
  category: "design" | "quality" | "engineering" | "ai";
  color: string;
}

const TOOLS: ToolDef[] = [
  // ── Design ──
  {
    id: "darkMode",
    icon: Moon,
    name: "Dark Mode",
    desc: "Auto-generate dark theme CSS variables and media queries",
    category: "design",
    color: "from-indigo-500 to-purple-600",
  },
  {
    id: "palette",
    icon: Palette,
    name: "Palette Editor",
    desc: "Extract, edit and replace colors across your code",
    category: "design",
    color: "from-pink-500 to-rose-600",
  },
  {
    id: "responsive",
    icon: Smartphone,
    name: "Responsive Preview",
    desc: "Side-by-side Mobile / Tablet / Desktop breakpoints",
    category: "design",
    color: "from-cyan-500 to-blue-600",
  },
  {
    id: "heatmap",
    icon: SplitSquareHorizontal,
    name: "Pixel Heatmap",
    desc: "Overlay original image to compare pixel-level accuracy",
    category: "design",
    color: "from-amber-500 to-orange-600",
  },
  {
    id: "scrollAnimation",
    icon: Sparkles,
    name: "Scroll Animations",
    desc: "Add Intersection Observer scroll-reveal animations",
    category: "design",
    color: "from-violet-500 to-indigo-600",
  },
  {
    id: "components",
    icon: Layers,
    name: "Component Gallery",
    desc: "AI-split page into reusable Navbar / Hero / Features etc.",
    category: "design",
    color: "from-teal-500 to-emerald-600",
  },
  {
    id: "designSystem",
    icon: BookOpen,
    name: "Design System",
    desc: "Auto-extract and document design tokens",
    category: "design",
    color: "from-sky-500 to-blue-600",
  },
  {
    id: "figma",
    icon: Figma,
    name: "Figma Import",
    desc: "Import designs directly from Figma files",
    category: "design",
    color: "from-fuchsia-500 to-purple-600",
  },
  {
    id: "templateMarket",
    icon: ShoppingBag,
    name: "Template Market",
    desc: "Browse community templates and publish your own",
    category: "design",
    color: "from-emerald-500 to-green-600",
  },
  // ── Quality ──
  {
    id: "performance",
    icon: Gauge,
    name: "Performance Audit",
    desc: "Lighthouse-style audit with auto-fix suggestions",
    category: "quality",
    color: "from-red-500 to-rose-600",
  },
  {
    id: "wcagFix",
    icon: Accessibility,
    name: "WCAG Auto-fix",
    desc: "Detect and auto-fix accessibility violations",
    category: "quality",
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: "abCompare",
    icon: SplitSquareHorizontal,
    name: "A/B Compare",
    desc: "Compare outputs from different AI models side by side",
    category: "quality",
    color: "from-orange-500 to-amber-600",
  },
  // ── Engineering ──
  {
    id: "versionHistory",
    icon: History,
    name: "Version History",
    desc: "Timeline snapshots, diff comparison and rollback",
    category: "engineering",
    color: "from-slate-500 to-gray-600",
  },
  {
    id: "deploy",
    icon: Rocket,
    name: "One-Click Deploy",
    desc: "Deploy to Vercel, Netlify or GitHub Pages",
    category: "engineering",
    color: "from-green-500 to-emerald-600",
  },
  {
    id: "multiPage",
    icon: FileStack,
    name: "Multi-Page Generator",
    desc: "Generate full site: About, Services, Contact, Blog...",
    category: "engineering",
    color: "from-purple-500 to-violet-600",
  },
  {
    id: "nativeExport",
    icon: Smartphone,
    name: "Native Export",
    desc: "Convert to React Native or Flutter code",
    category: "engineering",
    color: "from-cyan-600 to-teal-700",
  },
  {
    id: "testGen",
    icon: TestTube,
    name: "Test Generator",
    desc: "Auto-generate Jest / Vitest unit tests for components",
    category: "engineering",
    color: "from-lime-500 to-green-600",
  },
  {
    id: "cmsAdapter",
    icon: Database,
    name: "CMS Adapter",
    desc: "Adapt to WordPress, Shopify Liquid or Strapi",
    category: "engineering",
    color: "from-stone-500 to-zinc-600",
  },
  {
    id: "storybook",
    icon: Wand2,
    name: "Storybook Export",
    desc: "Generate Storybook stories with controls and docs",
    category: "engineering",
    color: "from-pink-500 to-red-600",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  design: "Design Tools",
  quality: "Quality Assurance",
  engineering: "Engineering",
};

const CATEGORY_ORDER = ["design", "quality", "engineering"] as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface ToolboxPanelProps {
  html: string;
  css: string;
  originalImage?: string;
  iframeContent: string;
  onHtmlChange: (html: string) => void;
  onCssChange: (css: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ToolboxPanel({
  html,
  css,
  originalImage,
  iframeContent,
  onHtmlChange,
  onCssChange,
}: ToolboxPanelProps) {
  const [activeTool, setActiveTool] = useState<ToolID | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleBack = useCallback(() => setActiveTool(null), []);

  // ── Render active tool panel ──────────────────────────────────────────────

  if (activeTool) {
    const tool = TOOLS.find((t) => t.id === activeTool);
    return (
      <motion.div
        key={activeTool}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col gap-6"
      >
        {/* Back button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors self-start"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All Tools
        </button>

        {/* Tool content */}
        <ToolRouter
          toolId={activeTool}
          html={html}
          css={css}
          originalImage={originalImage}
          iframeContent={iframeContent}
          onHtmlChange={onHtmlChange}
          onCssChange={onCssChange}
          onBack={handleBack}
        />
      </motion.div>
    );
  }

  // ── Render tool grid ──────────────────────────────────────────────────────

  const filteredTools = searchQuery.trim()
    ? TOOLS.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.desc.toLowerCase().includes(searchQuery.toLowerCase()) || t.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : TOOLS;

  return (
    <motion.div
      key="toolbox-grid"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-8"
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Search tools..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
          aria-label="Search tools" />
      </div>
      {CATEGORY_ORDER.map((cat) => {
        const tools = filteredTools.filter((t) => t.category === cat);
        if (tools.length === 0) return null;
        return (
          <div key={cat}>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">
              {CATEGORY_LABELS[cat]}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onClick={() => setActiveTool(tool.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

// ─── Tool Card ────────────────────────────────────────────────────────────────

function ToolCard({ tool, onClick }: { tool: ToolDef; onClick: () => void }) {
  const Icon = tool.icon;
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative bg-white rounded-2xl border border-slate-200 p-5 text-left flex items-start gap-4 hover:border-slate-300 hover:shadow-lg transition-all duration-200"
    >
      <div
        className={cn(
          "p-2.5 rounded-xl bg-gradient-to-br text-white shrink-0 shadow-sm",
          tool.color,
        )}
      >
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-slate-900 mb-0.5 group-hover:text-indigo-700 transition-colors">
          {tool.name}
        </h4>
        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
          {tool.desc}
        </p>
      </div>
      <ArrowLeft className="w-3.5 h-3.5 text-slate-300 rotate-180 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.button>
  );
}

// ─── Tool Router ──────────────────────────────────────────────────────────────

interface ToolRouterProps {
  toolId: ToolID;
  html: string;
  css: string;
  originalImage?: string;
  iframeContent: string;
  onHtmlChange: (html: string) => void;
  onCssChange: (css: string) => void;
  onBack: () => void;
}

function ToolRouter({
  toolId,
  html,
  css,
  originalImage,
  iframeContent,
  onHtmlChange,
  onCssChange,
}: ToolRouterProps) {
  switch (toolId) {
    // ── Design ──
    case "darkMode":
      return (
        <DarkModePanel
          css={css}
          onApply={(newCss: string) => onCssChange(newCss)}
        />
      );

    case "palette":
      return (
        <PaletteEditor
          html={html}
          css={css}
          onHtmlChange={onHtmlChange}
          onCssChange={onCssChange}
        />
      );

    case "responsive":
      return <MultiBreakpointPreview iframeContent={iframeContent} />;

    case "heatmap":
      return originalImage ? (
        <PixelHeatmapOverlay
          originalImage={originalImage}
          iframeContent={iframeContent}
        />
      ) : (
        <EmptyState message="Pixel heatmap requires an original image reference." />
      );

    case "scrollAnimation":
      return (
        <ScrollAnimationPanel
          html={html}
          css={css}
          onApply={(newHtml: string, newCss: string) => {
            onHtmlChange(newHtml);
            onCssChange(newCss);
          }}
        />
      );

    case "components":
      return <ComponentGallery html={html} css={css} />;

    case "designSystem":
      return <DesignSystemPanel html={html} css={css} />;

    case "figma":
      return (
        <FigmaImportPanel
          onImport={(newHtml: string, newCss: string) => {
            onHtmlChange(newHtml);
            onCssChange(newCss);
          }}
        />
      );

    case "templateMarket":
      return <TemplateMarket />;

    // ── Quality ──
    case "performance":
      return (
        <PerformanceAuditPanel
          html={html}
          css={css}
          onApplyFix={(newHtml: string, newCss: string) => {
            onHtmlChange(newHtml);
            onCssChange(newCss);
          }}
        />
      );

    case "wcagFix":
      return (
        <WcagAutoFixPanel
          html={html}
          css={css}
          onApplyFix={(newHtml: string, newCss: string) => {
            onHtmlChange(newHtml);
            onCssChange(newCss);
          }}
        />
      );

    case "abCompare":
      return (
        <ABComparePanel
          results={[{ modelName: "Current Output", html, css }]}
          originalImage={originalImage}
        />
      );

    // ── Engineering ──
    case "versionHistory":
      return (
        <VersionHistoryPanel
          versions={[]}
          onRollback={(newHtml: string, newCss: string) => {
            onHtmlChange(newHtml);
            onCssChange(newCss);
          }}
        />
      );

    case "deploy":
      return <DeployPanel html={html} css={css} />;

    case "multiPage":
      return <MultiPagePanel homeHtml={html} homeCss={css} />;

    case "nativeExport":
      return <OutputFormatPanel html={html} css={css} />;

    case "testGen":
      return <TestGenPanel html={html} css={css} stack="html" />;

    case "cmsAdapter":
      return <CMSAdapterPanel html={html} css={css} />;

    case "storybook":
      return <StorybookPanel html={html} css={css} />;

    default:
      return <EmptyState message="Tool not found." />;
  }
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <Wand2 className="w-10 h-10 mb-3 opacity-30" />
      <p className="text-xs font-bold">{message}</p>
    </div>
  );
}

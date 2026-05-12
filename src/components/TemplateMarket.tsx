import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Heart,
  X,
  ExternalLink,
  Star,
  Upload,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  name: string;
  author: string;
  likes: number;
  category: TemplateCategory;
  tags: string[];
  gradient: string;
  description: string;
  featured?: boolean;
}

type TemplateCategory =
  | "Landing"
  | "Portfolio"
  | "Blog"
  | "E-commerce"
  | "SaaS"
  | "Agency";

const CATEGORIES: TemplateCategory[] = [
  "Landing",
  "Portfolio",
  "Blog",
  "E-commerce",
  "SaaS",
  "Agency",
];

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_TEMPLATES: Template[] = [
  {
    id: "tpl-01",
    name: "Stellar Hero",
    author: "DesignPro",
    likes: 342,
    category: "Landing",
    tags: ["hero", "gradient", "modern"],
    gradient: "from-violet-500 via-purple-500 to-indigo-600",
    description:
      "A bold hero section with gradient backgrounds and animated text. Perfect for SaaS products.",
    featured: true,
  },
  {
    id: "tpl-02",
    name: "Minimal Portfolio",
    author: "CleanUI",
    likes: 218,
    category: "Portfolio",
    tags: ["minimal", "grid", "gallery"],
    gradient: "from-slate-700 via-slate-800 to-slate-900",
    description:
      "A clean, minimal portfolio layout with image grid and smooth transitions.",
    featured: true,
  },
  {
    id: "tpl-03",
    name: "NeonStore",
    author: "ShopCraft",
    likes: 189,
    category: "E-commerce",
    tags: ["neon", "dark", "products"],
    gradient: "from-cyan-400 via-blue-500 to-purple-600",
    description:
      "A dark-themed e-commerce template with neon accents and product showcase.",
    featured: true,
  },
  {
    id: "tpl-04",
    name: "DevBlog",
    author: "ContentFirst",
    likes: 156,
    category: "Blog",
    tags: ["typography", "content", "readable"],
    gradient: "from-amber-400 via-orange-400 to-rose-400",
    description:
      "A developer-focused blog template with great typography and code blocks.",
  },
  {
    id: "tpl-05",
    name: "CloudPulse",
    author: "SaaSKit",
    likes: 274,
    category: "SaaS",
    tags: ["dashboard", "analytics", "pricing"],
    gradient: "from-blue-500 via-indigo-500 to-purple-600",
    description:
      "SaaS landing page with feature sections, pricing table, and testimonials.",
  },
  {
    id: "tpl-06",
    name: "CreativeStudio",
    author: "ArtFolio",
    likes: 132,
    category: "Agency",
    tags: ["creative", "fullscreen", "parallax"],
    gradient: "from-rose-500 via-pink-500 to-fuchsia-500",
    description:
      "A bold, creative agency template with fullscreen sections and parallax effects.",
  },
  {
    id: "tpl-07",
    name: "GlassDash",
    author: "ModernUI",
    likes: 198,
    category: "SaaS",
    tags: ["glassmorphism", "dashboard", "modern"],
    gradient: "from-teal-300 via-emerald-400 to-green-500",
    description:
      "Glassmorphism-style SaaS dashboard with translucent cards and clean data visualization.",
  },
  {
    id: "tpl-08",
    name: "ElegantShop",
    author: "LuxThemes",
    likes: 245,
    category: "E-commerce",
    tags: ["luxury", "minimal", "fashion"],
    gradient: "from-neutral-200 via-stone-300 to-zinc-400",
    description:
      "A luxury e-commerce template with elegant typography and minimal product layouts.",
  },
  {
    id: "tpl-09",
    name: "StartupLaunch",
    author: "LaunchKit",
    likes: 312,
    category: "Landing",
    tags: ["startup", "cta", "features"],
    gradient: "from-orange-400 via-red-400 to-pink-500",
    description:
      "A high-converting startup landing page with bold CTAs and feature grids.",
  },
  {
    id: "tpl-10",
    name: "PhotoFrame",
    author: "PixelPerfect",
    likes: 87,
    category: "Portfolio",
    tags: ["photography", "fullscreen", "lightbox"],
    gradient: "from-gray-800 via-gray-900 to-black",
    description:
      "A dark portfolio template designed for photographers with fullscreen galleries.",
  },
  {
    id: "tpl-11",
    name: "WriteSpace",
    author: "BlogMaster",
    likes: 163,
    category: "Blog",
    tags: ["serif", "editorial", "white-space"],
    gradient: "from-sky-400 via-blue-400 to-indigo-500",
    description:
      "An editorial blog template with generous white space and beautiful serif typography.",
  },
  {
    id: "tpl-12",
    name: "AgencyOne",
    author: "BrandWorks",
    likes: 201,
    category: "Agency",
    tags: ["corporate", "sections", "team"],
    gradient: "from-emerald-500 via-teal-500 to-cyan-600",
    description:
      "A professional agency template with team sections, case studies, and service showcases.",
  },
];

// ─── Template Card ───────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onUse,
  onPreview,
}: {
  template: Template;
  onUse: (t: Template) => void;
  onPreview: (t: Template) => void;
}) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(template.likes);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked((v) => !v);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={() => onPreview(template)}
    >
      {/* Gradient preview */}
      <div
        className={cn(
          "h-40 bg-gradient-to-br relative",
          template.gradient,
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <span className="text-white/90 text-sm font-bold">
              {template.name}
            </span>
          </div>
        </div>

        {/* Like button */}
        <button
          onClick={handleLike}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
        >
          <Heart
            className={cn(
              "w-4 h-4",
              liked ? "fill-red-400 text-red-400" : "text-white",
            )}
          />
        </button>

        {template.featured && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full text-[9px] font-bold">
            <Star className="w-3 h-3 fill-current" />
            Featured
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-sm font-bold text-slate-900 mb-0.5">
          {template.name}
        </h3>
        <p className="text-[10px] text-slate-400 mb-2">
          by {template.author}
        </p>
        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mb-3">
          {template.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-semibold"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 text-slate-400">
            <Heart className="w-3 h-3" />
            <span className="text-[10px] font-semibold">{likeCount}</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onUse(template);
            }}
            className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold hover:bg-slate-800 transition-colors"
          >
            Use Template
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Detail Modal ────────────────────────────────────────────────────────────

function TemplateDetailModal({
  template,
  onClose,
  onUse,
}: {
  template: Template;
  onClose: () => void;
  onUse: (t: Template) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Preview */}
        <div
          className={cn(
            "h-48 bg-gradient-to-br relative",
            template.gradient,
          )}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="absolute inset-0 flex items-center justify-center">
            <h3 className="text-2xl font-extrabold text-white">
              {template.name}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
              {template.category}
            </span>
            {template.featured && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold">
                <Star className="w-3 h-3 fill-current" /> Featured
              </span>
            )}
          </div>

          <h2 className="text-lg font-bold text-slate-900 mt-2">
            {template.name}
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            by {template.author} · {template.likes} likes
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            {template.description}
          </p>

          <div className="flex flex-wrap gap-1.5 mb-5">
            {template.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-semibold"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onUse(template);
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl py-3 text-sm font-bold hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Use Template
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-5 rounded-xl py-3 text-sm font-bold border border-slate-200 text-slate-600 hover:border-slate-300 transition-colors"
            >
              Close
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium"
    >
      {message}
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function TemplateMarket() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<TemplateCategory | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [showToast, setShowToast] = useState(false);

  const filtered = useMemo(() => {
    let result = MOCK_TEMPLATES;

    if (activeFilter) {
      result = result.filter((t) => t.category === activeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.author.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
          t.category.toLowerCase().includes(q),
      );
    }

    return result;
  }, [search, activeFilter]);

  const featured = useMemo(
    () => MOCK_TEMPLATES.filter((t) => t.featured),
    [],
  );

  const handleUseTemplate = useCallback((_t: Template) => {
    // In a real app, this would load the template HTML/CSS
    // For now, it's a no-op placeholder
  }, []);

  const handlePublish = useCallback(() => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 flex flex-col gap-5">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Marketplace
          </p>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Star className="w-5 h-5 shrink-0 text-amber-500" />
            Template Market
          </h2>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handlePublish}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Publish Template
        </motion.button>
      </div>

      {/* ── Search ─────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates…"
          className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition"
        />
      </div>

      {/* ── Filter chips ───────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveFilter(null)}
          className={cn(
            "px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors",
            activeFilter === null
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200",
          )}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() =>
              setActiveFilter(activeFilter === cat ? null : cat)
            }
            className={cn(
              "px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors",
              activeFilter === cat
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Featured ────────────────────────────────────────── */}
      {!search && !activeFilter && featured.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
            ⭐ Featured
          </p>
          <div className="grid grid-cols-3 gap-3">
            {featured.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onUse={handleUseTemplate}
                onPreview={setPreviewTemplate}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── All Templates ───────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          {search || activeFilter
            ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`
            : "All Templates"}
        </p>
        <div className="grid grid-cols-3 gap-3">
          <AnimatePresence>
            {filtered.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onUse={handleUseTemplate}
                onPreview={setPreviewTemplate}
              />
            ))}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Search className="w-8 h-8 text-slate-300" />
            <p className="text-sm font-semibold text-slate-400">
              No templates found
            </p>
            <p className="text-xs text-slate-300">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>

      {/* ── Detail Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {previewTemplate && (
          <TemplateDetailModal
            template={previewTemplate}
            onClose={() => setPreviewTemplate(null)}
            onUse={handleUseTemplate}
          />
        )}
      </AnimatePresence>

      {/* ── Toast ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showToast && (
          <Toast
            message="🚀 Publishing is coming soon! Stay tuned."
            onClose={() => setShowToast(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

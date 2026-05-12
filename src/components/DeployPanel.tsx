import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Rocket,
  Globe,
  Github,
  Key,
  FolderOpen,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  AlertCircle,
  RotateCcw,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deployToVercel,
  deployToNetlify,
  createGitHubRepo,
  pushToGitHub,
} from "@/services/deployService";
import type { DeployResult, DeployProvider } from "@/services/deployService";

// ─── Props ───────────────────────────────────────────────────────────────────

interface DeployPanelProps {
  html: string;
  css: string;
}

// ─── Provider Config ─────────────────────────────────────────────────────────

interface ProviderInfo {
  id: DeployProvider;
  name: string;
  icon: React.ElementType;
  color: string;
  description: string;
  tokenPlaceholder: string;
  tokenHelp: string;
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: "vercel",
    name: "Vercel",
    icon: Zap,
    color: "bg-black text-white",
    description: "Deploy instantly to Vercel's global edge network.",
    tokenPlaceholder: "vercel_xxxxxxxxxxxx",
    tokenHelp:
      "Get your token at vercel.com → Settings → Tokens → Create",
  },
  {
    id: "netlify",
    name: "Netlify",
    icon: Globe,
    color: "bg-teal-600 text-white",
    description: "Deploy to Netlify with automatic HTTPS and CDN.",
    tokenPlaceholder: "nfp_xxxxxxxxxxxxxxxxxxxxxxxx",
    tokenHelp:
      "Get your token at app.netlify.com → User Settings → Applications → Personal Access Tokens",
  },
  {
    id: "github",
    name: "GitHub Pages",
    icon: Github,
    color: "bg-slate-800 text-white",
    description:
      "Push to a new GitHub repo and enable GitHub Pages.",
    tokenPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    tokenHelp:
      "Get your token at github.com → Settings → Developer Settings → Personal Access Tokens (with repo scope)",
  },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export function DeployPanel({ html, css }: DeployPanelProps) {
  const [selectedProvider, setSelectedProvider] = useState<DeployProvider>("vercel");
  const [projectName, setProjectName] = useState("my-layoutforge-site");
  const [tokens, setTokens] = useState<Record<DeployProvider, string>>(() => {
    const initial: Record<DeployProvider, string> = {
      vercel: "",
      netlify: "",
      github: "",
    };
    try {
      for (const p of ["vercel", "netlify", "github"] as DeployProvider[]) {
        const saved = sessionStorage.getItem(`deploy-token-${p}`);
        if (saved) initial[p] = saved;
      }
    } catch {
      // Ignore storage errors
    }
    return initial;
  });
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DeployResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTokenChange = useCallback(
    (provider: DeployProvider, value: string) => {
      setTokens((prev) => ({ ...prev, [provider]: value }));
      try {
        sessionStorage.setItem(`deploy-token-${provider}`, value);
      } catch {
        // Ignore storage errors
      }
    },
    [],
  );

  const handleDeploy = useCallback(async () => {
    const token = tokens[selectedProvider];
    if (!token.trim()) {
      setError(`Please enter your ${selectedProvider} API token.`);
      return;
    }

    if (!projectName.trim()) {
      setError("Please enter a project name.");
      return;
    }

    setDeploying(true);
    setError(null);
    setResult(null);

    try {
      let deployResult: DeployResult;

      switch (selectedProvider) {
        case "vercel":
          deployResult = await deployToVercel(html, css, projectName, token);
          break;

        case "netlify":
          deployResult = await deployToNetlify(html, css, projectName, token);
          break;

        case "github": {
          const repoUrl = await createGitHubRepo(projectName, token);
          await pushToGitHub(repoUrl, html, css, token);
          deployResult = {
            url: repoUrl.replace("github.com", `${projectName}.github.io`),
            provider: "github",
            deployedAt: Date.now(),
          };
          break;
        }

        default:
          throw new Error(`Unknown provider: ${selectedProvider}`);
      }

      setResult(deployResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Deployment failed. Please try again.",
      );
    } finally {
      setDeploying(false);
    }
  }, [selectedProvider, tokens, projectName, html, css]);

  const handleCopyUrl = useCallback(async () => {
    if (!result?.url) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }, [result]);

  const currentProvider = PROVIDERS.find((p) => p.id === selectedProvider)!;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 flex flex-col gap-5">
      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
          Deploy
        </p>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Rocket className="w-5 h-5 shrink-0" />
          One-click Deploy
        </h2>
      </div>

      {/* ── Provider cards ──────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          Target
        </p>
        <div className="grid grid-cols-3 gap-2">
          {PROVIDERS.map((provider) => {
            const Icon = provider.icon;
            const isSelected = selectedProvider === provider.id;
            return (
              <motion.button
                key={provider.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setSelectedProvider(provider.id);
                  setError(null);
                  setResult(null);
                }}
                className={cn(
                  "relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all duration-200",
                  isSelected
                    ? "border-slate-900 ring-2 ring-slate-900 bg-slate-50"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60",
                )}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", provider.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-900">
                  {provider.name}
                </span>
                <span className="text-[10px] text-slate-500 leading-snug">
                  {provider.description}
                </span>
                {isSelected && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-slate-900" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Token input ─────────────────────────────────────── */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
          API Token
        </label>
        <div className="relative">
          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="password"
            value={tokens[selectedProvider]}
            onChange={(e) => handleTokenChange(selectedProvider, e.target.value)}
            placeholder={currentProvider.tokenPlaceholder}
            className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 font-mono placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition"
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
          {currentProvider.tokenHelp}. Stored in{" "}
          <span className="font-semibold text-slate-500">sessionStorage only</span>.
        </p>
      </div>

      {/* ── Project name ────────────────────────────────────── */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
          Project Name
        </label>
        <div className="relative">
          <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="my-layoutforge-site"
            className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition"
          />
        </div>
      </div>

      {/* ── Deploy button ───────────────────────────────────── */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleDeploy}
        disabled={deploying}
        className="w-full bg-slate-900 text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {deploying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Deploying to {currentProvider.name}…
          </>
        ) : (
          <>
            <Rocket className="w-4 h-4" />
            Deploy to {currentProvider.name}
          </>
        )}
      </motion.button>

      {/* ── Error ───────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
          >
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-red-700 leading-relaxed">{error}</p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleDeploy}
                className="flex items-center gap-1 mt-2 text-[10px] font-bold text-red-600 hover:text-red-800 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Retry
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Success result ──────────────────────────────────── */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex flex-col gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-900">
                  Deployed successfully!
                </p>
                <p className="text-[10px] text-emerald-600">
                  via {result.provider} ·{" "}
                  {new Date(result.deployedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* URL display */}
            <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-2">
              <Globe className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-xs font-mono text-slate-700 truncate flex-1">
                {result.url}
              </span>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleCopyUrl}
                className="shrink-0 p-1.5 rounded-md hover:bg-emerald-50 transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
              </motion.button>
            </div>

            {/* Open link */}
            {result.url && (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-lg py-2 text-xs font-bold hover:bg-emerald-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Site
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

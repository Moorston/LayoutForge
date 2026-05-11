/**
 * Shared type definitions for all Layout Replicator features.
 */

// ─── Brand Kit ───────────────────────────────────────────────────────────────

export interface BrandKit {
  /** Primary brand color (hex) */
  primaryColor: string;
  /** Secondary / complementary color (hex) */
  secondaryColor: string;
  /** Accent / highlight color (hex) */
  accentColor: string;
  /** Page background color (hex) */
  backgroundColor: string;
  /** Default text color (hex) */
  textColor: string;
  /** Font family for headings */
  headingFont: string;
  /** Font family for body text */
  bodyFont: string;
  /** Global border-radius style */
  borderRadius: "none" | "sm" | "md" | "lg" | "xl" | "full";
  /** Logo image (data-URL or https URL) */
  logoUrl?: string;
  logoAlt?: string;
  companyName: string;
  tagline?: string;
  contactEmail?: string;
  website?: string;
}

export const DEFAULT_BRAND_KIT: BrandKit = {
  primaryColor: "#0f172a",
  secondaryColor: "#475569",
  accentColor: "#6366f1",
  backgroundColor: "#ffffff",
  textColor: "#0f172a",
  headingFont: "Inter",
  bodyFont: "Inter",
  borderRadius: "lg",
  companyName: "My Company",
  tagline: "",
  contactEmail: "",
  website: "",
};

// ─── Template Variables ───────────────────────────────────────────────────────

export interface TemplateVariable {
  /** Identifier used in the HTML as {{key}} */
  key: string;
  /** Human-readable label shown in the editor */
  label: string;
  /** Current value entered by the user */
  value: string;
  /** Input type hint */
  type: "text" | "url" | "email" | "color" | "image" | "textarea";
  placeholder?: string;
}

// ─── Chat / Refinement ───────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  /** True while a streaming response is still arriving */
  isStreaming?: boolean;
}

// ─── Accessibility ────────────────────────────────────────────────────────────

export interface AccessibilityIssue {
  severity: "error" | "warning" | "info";
  /** Short machine-readable rule name, e.g. "img-alt" */
  rule: string;
  /** Human-readable description */
  description: string;
  /** Snippet of the offending element */
  element?: string;
  /** Suggested fix or best practice */
  fix?: string;
}

export interface AccessibilityReport {
  score: number; // 0-100
  issues: AccessibilityIssue[];
  passedRules: string[];
}

// ─── SEO ─────────────────────────────────────────────────────────────────────

export interface SEOData {
  title: string;
  description: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImage?: string;
  canonicalUrl?: string;
  twitterCard: "summary" | "summary_large_image";
  author?: string;
  robots?: string;
}

export const DEFAULT_SEO_DATA: SEOData = {
  title: "",
  description: "",
  keywords: [],
  ogTitle: "",
  ogDescription: "",
  twitterCard: "summary_large_image",
  robots: "index, follow",
};

// ─── Export ───────────────────────────────────────────────────────────────────

export type ExportFormat = "html" | "react-tailwind" | "vue";

/** Generation mode: 'replicate' for pixel-perfect copy, 'template' for reusable style template */
export type GenerationMode = "replicate" | "template";

export interface ExportResult {
  format: ExportFormat;
  filename: string;
  content: string;
  language: string;
}

// ─── Batch Processing ─────────────────────────────────────────────────────────

export interface BatchItem {
  id: string;
  name: string;
  file: File;
  status: "pending" | "processing" | "done" | "error";
  /** Generated code result */
  result?: {
    html: string;
    css: string;
    explanation: string;
  };
  error?: string;
  /** Base64 data URL of the source image */
  previewUrl?: string;
}

// ─── Extracted Components ─────────────────────────────────────────────────────

export interface ExtractedComponent {
  name: string;
  description: string;
  html: string;
  /** Tailwind classes used */
  classes: string[];
}

// ─── Device Breakpoints ───────────────────────────────────────────────────────

export interface DevicePreset {
  label: string;
  icon: string;
  width: number;
  height?: number;
}

export const DEVICE_PRESETS: DevicePreset[] = [
  { label: "Mobile", icon: "📱", width: 375, height: 812 },
  { label: "Tablet", icon: "📟", width: 768, height: 1024 },
  { label: "Desktop", icon: "💻", width: 1280, height: 800 },
  { label: "Wide", icon: "🖥️", width: 1920, height: 1080 },
];

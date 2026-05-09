import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Palette,
  Type,
  Building2,
  Image,
  RefreshCw,
  Download,
  Upload,
  Check,
  Layers,
} from 'lucide-react';
import { BrandKit, DEFAULT_BRAND_KIT } from '@/lib/types';
import { HEADING_FONTS, BODY_FONTS } from '@/lib/brandKit';
import { cn } from '@/lib/utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface BrandKitPanelProps {
  brandKit: BrandKit;
  onChange: (kit: BrandKit) => void;
  onClose: () => void;
  isOpen: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BORDER_RADIUS_OPTIONS: Array<{ label: string; value: BrandKit['borderRadius'] }> = [
  { label: 'None', value: 'none' },
  { label: 'SM',   value: 'sm'   },
  { label: 'MD',   value: 'md'   },
  { label: 'LG',   value: 'lg'   },
  { label: 'XL',   value: 'xl'   },
  { label: 'Full', value: 'full' },
];

type ColorKey = 'primaryColor' | 'secondaryColor' | 'accentColor' | 'backgroundColor' | 'textColor';

const COLOR_FIELDS: Array<{ label: string; key: ColorKey }> = [
  { label: 'Primary',    key: 'primaryColor'     },
  { label: 'Secondary',  key: 'secondaryColor'   },
  { label: 'Accent',     key: 'accentColor'      },
  { label: 'Background', key: 'backgroundColor'  },
  { label: 'Text',       key: 'textColor'        },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-slate-400" />
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{title}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BrandKitPanel({ brandKit, onChange, onClose, isOpen }: BrandKitPanelProps) {
  const [localKit, setLocalKit]       = useState<BrandKit>({ ...brandKit });
  const [companyError, setCompanyError] = useState(false);

  const logoFileRef  = useRef<HTMLInputElement>(null);
  const colorRefs    = useRef<Record<string, HTMLInputElement | null>>({});

  // Sync local state whenever the panel opens or brandKit prop changes
  useEffect(() => {
    if (isOpen) {
      setLocalKit({ ...brandKit });
      setCompanyError(false);
    }
  }, [isOpen, brandKit]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const update = <K extends keyof BrandKit>(key: K, value: BrandKit[K]) =>
    setLocalKit(prev => ({ ...prev, [key]: value }));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLocalKit(prev => ({ ...prev, logoUrl: ev.target?.result as string }));
    reader.readAsDataURL(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(localKit, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'brand-kit.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    if (!localKit.companyName.trim()) {
      setCompanyError(true);
      return;
    }
    onChange(localKit);
    onClose();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="bk-backdrop"
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* ── Panel ── */}
          <motion.div
            key="bk-panel"
            className="fixed right-0 top-0 h-screen w-[440px] bg-white z-50 shadow-2xl flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
          >
            {/* ── Sticky Header ── */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Brand Kit</h2>
                <p className="text-xs text-slate-500 mt-0.5">Customize your brand identity</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close brand kit panel"
                className="mt-0.5 p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Scrollable Body ── */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

              {/* ─ Colors ──────────────────────────────────────────── */}
              <section>
                <SectionHeader icon={Palette} title="Colors" />
                <div className="space-y-3">
                  {COLOR_FIELDS.map(({ label, key }) => (
                    <div key={key} className="flex items-center gap-3">
                      {/* Clickable colour swatch */}
                      <button
                        type="button"
                        aria-label={`Pick ${label} color`}
                        className="w-8 h-8 rounded-lg border border-slate-200 shadow-sm flex-shrink-0 ring-2 ring-offset-1 ring-transparent hover:ring-slate-300 transition-all"
                        style={{ backgroundColor: localKit[key] as string }}
                        onClick={() => colorRefs.current[key]?.click()}
                      />
                      {/* Hidden native colour picker */}
                      <input
                        ref={el => { colorRefs.current[key] = el; }}
                        type="color"
                        className="sr-only"
                        value={localKit[key] as string}
                        onChange={e => update(key, e.target.value as BrandKit[typeof key])}
                      />
                      <span className="text-xs font-semibold text-slate-600 w-[72px] flex-shrink-0">
                        {label}
                      </span>
                      {/* Hex text input */}
                      <input
                        type="text"
                        maxLength={7}
                        className="flex-1 text-xs font-mono px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 text-slate-700 placeholder:text-slate-400 transition-colors"
                        value={localKit[key] as string}
                        onChange={e => update(key, e.target.value as BrandKit[typeof key])}
                        placeholder="#000000"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* ─ Border Radius ───────────────────────────────────── */}
              <section>
                <SectionHeader icon={Layers} title="Border Radius" />
                <div className="flex flex-wrap gap-2">
                  {BORDER_RADIUS_OPTIONS.map(({ label, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update('borderRadius', value)}
                      className={cn(
                        'px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-lg border transition-all',
                        localKit.borderRadius === value
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {/* ─ Typography ──────────────────────────────────────── */}
              <section>
                <SectionHeader icon={Type} title="Typography" />
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Heading Font
                    </label>
                    <select
                      className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 text-slate-700 transition-colors"
                      value={localKit.headingFont}
                      onChange={e => update('headingFont', e.target.value)}
                    >
                      {HEADING_FONTS.map(font => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Body Font
                    </label>
                    <select
                      className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 text-slate-700 transition-colors"
                      value={localKit.bodyFont}
                      onChange={e => update('bodyFont', e.target.value)}
                    >
                      {BODY_FONTS.map(font => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* ─ Identity ────────────────────────────────────────── */}
              <section>
                <SectionHeader icon={Building2} title="Identity" />
                <div className="space-y-3">
                  {/* Company Name (required) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Company Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      className={cn(
                        'w-full text-sm px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 text-slate-700 placeholder:text-slate-400 transition-colors',
                        companyError
                          ? 'bg-red-50 border-red-300 focus:ring-red-200 focus:border-red-400'
                          : 'bg-slate-50 border-slate-200 focus:ring-slate-900/20 focus:border-slate-400'
                      )}
                      value={localKit.companyName}
                      onChange={e => {
                        update('companyName', e.target.value);
                        if (e.target.value.trim()) setCompanyError(false);
                      }}
                      placeholder="Acme Corporation"
                    />
                    {companyError && (
                      <p className="text-xs text-red-500 mt-1">Company name is required.</p>
                    )}
                  </div>

                  {/* Tagline */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tagline</label>
                    <input
                      type="text"
                      className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 text-slate-700 placeholder:text-slate-400"
                      value={localKit.tagline ?? ''}
                      onChange={e => update('tagline', e.target.value)}
                      placeholder="Your brand's short motto"
                    />
                  </div>

                  {/* Contact Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Contact Email</label>
                    <input
                      type="email"
                      className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 text-slate-700 placeholder:text-slate-400"
                      value={localKit.contactEmail ?? ''}
                      onChange={e => update('contactEmail', e.target.value)}
                      placeholder="hello@example.com"
                    />
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Website</label>
                    <input
                      type="url"
                      className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 text-slate-700 placeholder:text-slate-400"
                      value={localKit.website ?? ''}
                      onChange={e => update('website', e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </section>

              {/* ─ Logo ────────────────────────────────────────────── */}
              <section>
                <SectionHeader icon={Image} title="Logo" />
                <div className="space-y-3">
                  {localKit.logoUrl ? (
                    /* Preview + remove */
                    <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-center">
                      <img
                        src={localKit.logoUrl}
                        alt={localKit.logoAlt ?? localKit.companyName}
                        className="max-h-20 max-w-full object-contain"
                      />
                      <button
                        type="button"
                        aria-label="Remove logo"
                        onClick={() => setLocalKit(prev => ({ ...prev, logoUrl: undefined, logoAlt: undefined }))}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    /* Upload drop zone */
                    <button
                      type="button"
                      onClick={() => logoFileRef.current?.click()}
                      className="w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-slate-400 hover:bg-slate-100 transition-all px-4 py-7 flex flex-col items-center gap-2 text-slate-400 hover:text-slate-600"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-xs font-semibold">Click to upload logo</span>
                      <span className="text-[11px] text-slate-400">PNG, JPG, SVG, WebP</span>
                    </button>
                  )}

                  {/* Hidden file input */}
                  <input
                    ref={logoFileRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleLogoUpload}
                  />

                  {/* Replace + Alt text (shown only when a logo is set) */}
                  {localKit.logoUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() => logoFileRef.current?.click()}
                        className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Replace Image
                      </button>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          Logo Alt Text
                        </label>
                        <input
                          type="text"
                          className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 text-slate-700 placeholder:text-slate-400"
                          value={localKit.logoAlt ?? ''}
                          onChange={e => update('logoAlt', e.target.value)}
                          placeholder={`${localKit.companyName} logo`}
                        />
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>

            {/* ── Sticky Footer ── */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center gap-2">
              {/* Reset */}
              <button
                type="button"
                onClick={() => setLocalKit({ ...DEFAULT_BRAND_KIT })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>

              {/* Export JSON */}
              <button
                type="button"
                onClick={handleExportJson}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Export JSON
              </button>

              <div className="flex-1" />

              {/* Save & Apply */}
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-700 shadow-sm transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                Save & Apply
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

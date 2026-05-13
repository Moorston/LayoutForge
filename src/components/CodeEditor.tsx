import React, { useState } from "react";
import { Check, Copy, Download, Code } from "lucide-react";
import Editor from "@monaco-editor/react";
import { cn } from "@/lib/utils";
import { sanitizeForIframe } from "@/lib/sanitize";

interface CodeEditorProps {
  html: string;
  css: string;
  onHtmlChange: (html: string) => void;
  onCssChange: (css: string) => void;
}

export function CodeEditor({ html, css, onHtmlChange, onCssChange }: CodeEditorProps) {
  const [codeTab, setCodeTab] = useState<"html" | "css">("html");
  const [copied, setCopied] = useState(false);

  const handleCodeChange = (value: string | undefined) => {
    if (value === undefined) return;
    if (codeTab === "html") onHtmlChange(value);
    else onCssChange(value);
  };

  const copyToClipboard = async () => {
    const content = codeTab === "html" ? html : css;
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadHtmlFile = () => {
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Replicated Design</title>
    <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lucide-static@0.321.0/font/lucide.min.css">
    <style>${css} body { margin: 0; }</style>
</head>
<body>${sanitizeForIframe(html)}</body>
</html>`;
    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "replicated-design.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-950 shadow-2xl ring-1 ring-black/10">
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-slate-400" />
          <div className="flex bg-slate-800 rounded-lg p-0.5 ml-2">
            <button
              onClick={() => setCodeTab("html")}
              className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-widest", codeTab === "html" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300")}
              aria-label="Switch to HTML editor"
            >
              Index.html
            </button>
            <button
              onClick={() => setCodeTab("css")}
              className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-widest", codeTab === "css" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300")}
              aria-label="Switch to CSS editor"
            >
              Styles.css
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={downloadHtmlFile}
            className="flex items-center gap-2 px-3 py-1 text-[10px] font-bold text-slate-400 border border-slate-700 rounded-md hover:bg-slate-800 hover:text-white transition-all uppercase tracking-tighter"
            aria-label="Download HTML file"
          >
            <Download className="w-3 h-3" />
            Download .html
          </button>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-3 py-1 text-[10px] font-bold text-slate-400 border border-slate-700 rounded-md hover:bg-slate-800 hover:text-white transition-all uppercase tracking-tighter"
            aria-label="Copy code to clipboard"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <div className="flex gap-1.5" aria-hidden="true">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
          </div>
        </div>
      </div>
      <div className="h-[75vh]">
        <Editor
          height="100%"
          language={codeTab === "html" ? "html" : "css"}
          theme="vs-dark"
          value={codeTab === "html" ? html : css}
          onChange={handleCodeChange}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineHeight: 20,
            fontFamily: "JetBrains Mono, monospace",
            padding: { top: 24, bottom: 24 },
            wordWrap: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            scrollbar: { vertical: "hidden", horizontal: "hidden" },
          }}
        />
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Send,
  Wand2,
  Loader2,
  StopCircle,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import { refineLayout } from "@/services/mimoService";
import { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentHtml: string;
  currentCss: string;
  onUpdate: (html: string, css: string, explanation: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_SUGGESTIONS = [
  "Make navbar sticky and add blur backdrop",
  "Improve mobile responsiveness",
  "Add smooth hover animations",
  "Convert color scheme to dark mode",
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function StreamingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="animate-pulse text-slate-400 text-[10px]"
          style={{ animationDelay: `${delay}ms` }}
        >
          ●
        </span>
      ))}
    </span>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-indigo-600 text-white rounded-2xl rounded-br-sm max-w-[80%]"
            : "bg-slate-800 border border-slate-700 text-slate-100 rounded-2xl rounded-bl-sm max-w-[85%]",
        )}
      >
        {/* Streaming placeholder (empty content) */}
        {message.isStreaming && !message.content && <StreamingDots />}

        {/* Content */}
        {message.content && (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}

        {/* Blinking cursor while still streaming */}
        {message.isStreaming && message.content && (
          <span className="inline-block w-[3px] h-3.5 bg-slate-400 ml-0.5 animate-pulse rounded-sm align-middle" />
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ChatPanel({
  isOpen,
  onClose,
  currentHtml,
  currentCss,
  onUpdate,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Side effects ─────────────────────────────────────────────────────────

  // Reset conversation when panel closes
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setInput("");
      setIsLoading(false);
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    }
  }, [isOpen]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleAbort = () => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.isStreaming) {
        return [
          ...prev.slice(0, -1),
          {
            ...last,
            isStreaming: false,
            content: (last.content || "") + " [cancelled]",
          },
        ];
      }
      return prev;
    });
  };

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };

    // Snapshot history before adding the new user message
    const chatHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Shrink textarea back to default height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Insert streaming placeholder immediately
    const placeholderId = String(Date.now() + 1);
    const placeholder: ChatMessage = {
      id: placeholderId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, placeholder]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await refineLayout(
        currentHtml,
        currentCss,
        trimmed,
        chatHistory,
        controller.signal,
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? {
                ...m,
                content:
                  result.explanation || "Done! The layout has been updated.",
                isStreaming: false,
              }
            : m,
        ),
      );

      onUpdate(result.html, result.css, result.explanation);
    } catch (err) {
      const isAborted =
        err instanceof DOMException && err.name === "AbortError";
      if (!isAborted) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? {
                  ...m,
                  content: `⚠ ${err instanceof Error ? err.message : "Something went wrong. Please try again."}`,
                  isStreaming: false,
                }
              : m,
          ),
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [input, isLoading, messages, currentHtml, currentCss, onUpdate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-expand up to ~120 px
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const injectSuggestion = (text: string) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="chat-backdrop"
            className="fixed inset-0 bg-slate-900/10 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* ── Panel ── */}
          <motion.div
            key="chat-panel"
            className="fixed right-0 top-0 h-screen w-[400px] bg-slate-950 text-white z-50 flex flex-col shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
          >
            {/* ── Header ── */}
            <div className="bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-indigo-600/20 flex-shrink-0">
                <Wand2 className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-white">AI Refinement</h2>
                <p className="text-[11px] text-slate-400">
                  Iteratively improve your layout
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {messages.length > 0 && (
                  <button
                    onClick={() => setMessages([])}
                    title="Clear conversation"
                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close chat panel"
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Message List ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                /* Empty state */
                <div className="h-full flex flex-col items-center justify-center text-center px-4 select-none">
                  <div className="p-4 rounded-2xl bg-slate-800/60 mb-4 ring-1 ring-slate-700/50">
                    <Wand2 className="w-8 h-8 text-indigo-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-300 mb-1.5">
                    AI Layout Refinement
                  </p>
                  <p className="text-xs text-slate-500 mb-7">
                    Describe what to change...
                  </p>

                  {/* Quick suggestion chips */}
                  <div className="w-full space-y-2">
                    {QUICK_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => injectSuggestion(suggestion)}
                        className="w-full text-left text-xs text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 transition-all group"
                      >
                        <ChevronRight className="w-3 h-3 flex-shrink-0 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                        <span>{suggestion}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Message thread */
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <React.Fragment key={msg.id}>
                      <MessageBubble message={msg} />
                    </React.Fragment>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* ── Input Area ── */}
            <div className="bg-slate-900 border-t border-slate-800 px-4 py-4">
              <textarea
                ref={textareaRef}
                rows={3}
                maxLength={500}
                disabled={isLoading}
                className={cn(
                  "w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-4 py-3",
                  "resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500",
                  "placeholder:text-slate-500 transition-colors",
                  isLoading && "opacity-60 cursor-not-allowed",
                )}
                placeholder="Describe what you want to change… (Enter to send, Shift+Enter for new line)"
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
              />

              {/* Character count + action buttons */}
              <div className="flex items-center justify-between mt-2">
                <span
                  className={cn(
                    "text-[11px] tabular-nums transition-colors",
                    input.length > 450 ? "text-amber-400" : "text-slate-600",
                  )}
                >
                  {input.length} / 500
                </span>

                <div className="flex items-center gap-2">
                  {isLoading ? (
                    /* Stop button while loading */
                    <button
                      onClick={handleAbort}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      Stop
                    </button>
                  ) : (
                    /* Send button */
                    <button
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                        input.trim()
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                          : "bg-slate-700 text-slate-500 cursor-not-allowed",
                      )}
                    >
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Send
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

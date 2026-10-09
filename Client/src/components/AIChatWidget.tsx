'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, MessageCircle, Sparkles, X } from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../lib/format';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = ['How do caution deposits work?', 'What is anti-sniping?', 'How do I become a seller?', 'How do refunds work?'];

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hi! I’m the Auctio assistant. Ask me about bidding, deposits, orders or selling.' },
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      inputRef.current?.focus();
    }
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || loading) return;
    const next = [...messages, { role: 'user' as const, content: message }];
    setMessages(next);
    setInput('');
    setLoading(true);
    const res = await api.post<{ reply: string }>('/ai/support-chat', { message, history: next.slice(-6) });
    setMessages((m) => [
      ...m,
      {
        role: 'assistant',
        content: res.success && res.data?.reply ? res.data.reply : 'I couldn’t reach the assistant right now. Please try again in a moment, or visit the Help centre.',
      },
    ]);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[60] sm:bottom-6 sm:right-6">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex h-12 items-center gap-2 rounded-full bg-ink pl-4 pr-5 text-sm font-medium text-white shadow-overlay transition-transform hover:scale-[1.03] active:scale-[0.98]"
          aria-label="Open Auctio assistant"
        >
          <MessageCircle className="size-5" aria-hidden />
          <span className="hidden sm:inline">Ask Auctio</span>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Auctio assistant"
          className="fixed inset-x-3 bottom-3 flex h-[min(560px,calc(100dvh-1.5rem))] animate-rise flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-overlay sm:absolute sm:inset-auto sm:bottom-0 sm:right-0 sm:w-[380px]"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Sparkles className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Auctio assistant</p>
                <p className="text-xs text-muted">AI answers · may make mistakes</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink" aria-label="Close assistant">
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    m.role === 'user' ? 'rounded-br-md bg-ink text-white' : 'rounded-bl-md bg-subtle text-ink'
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-1 rounded-2xl rounded-bl-md bg-subtle px-4 py-3 w-fit" aria-label="Assistant is typing">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d * 120}ms` }} />
                ))}
              </div>
            )}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border border-line-strong px-3 py-1.5 text-xs text-ink-2 hover:bg-subtle">
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-line p-3"
          >
            <label htmlFor="assistant-input" className="sr-only">
              Message
            </label>
            <input
              ref={inputRef}
              id="assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="h-11 flex-1 rounded-full border border-line-strong bg-surface px-4 focus:border-ink focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex size-11 items-center justify-center rounded-full bg-ink text-white disabled:opacity-40"
              aria-label="Send message"
            >
              <ArrowUp className="size-5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

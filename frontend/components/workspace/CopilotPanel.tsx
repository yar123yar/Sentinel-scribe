'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TextareaAutosize from 'react-textarea-autosize';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '@/lib/api';
import { CopilotMessage, TriageResponse } from '@/lib/types';
import { Send, User, Loader2, Sparkles, RotateCcw, BookOpen, Info, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
interface Props {
  patientId?: string | null;
  consultationId?: string | null;
  triageResult?: TriageResponse | null;
  context?: 'dashboard' | 'workspace';
  transcript?: string;
  onClose?: () => void;
}

const WORKSPACE_PROMPTS = [
  { text: 'What symptoms were detected?',          icon: '🔍', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  { text: 'Why was this priority assigned?',        icon: '❓', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  { text: 'Has this patient had similar issues?',   icon: '📋', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  { text: 'Summarize previous visits.',             icon: '🕒', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { text: 'What is the recommended next action?',  icon: '💡', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
];

const DASHBOARD_PROMPTS = [
  { text: 'Identify overlapping symptom clusters.',  icon: '📊', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
  { text: 'Which patients need immediate review?',  icon: '🚨', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
  { text: "Summarize today's P1 cases.",            icon: '📋', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
  { text: 'Are there any unusual trends today?',    icon: '📈', color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-500/10' },
];

export default function CopilotPanel({ patientId, consultationId, triageResult, context = 'workspace', transcript, onClose }: Props) {
  const [messages, setMessages] = useState<CopilotMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('ws_copilotMessages');
      if (saved) {
        return JSON.parse(saved).map((m: any) => ({ ...m, isHistory: true }));
      }
    }
    return [];
  });
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sources, setSources]   = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const prompts = context === 'dashboard' ? DASHBOARD_PROMPTS : WORKSPACE_PROMPTS;

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    sessionStorage.setItem('ws_copilotMessages', JSON.stringify(messages));
  }, [messages, isHydrated]);

  useEffect(() => {
    if (bottomRef.current) {
      const container = bottomRef.current.closest('.overflow-y-auto');
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages]);

  useEffect(() => {
    if (context === 'workspace' && consultationId && triageResult) {
      if (messages.length === 0 || messages[0].content.indexOf('Analysis complete') === -1) {
        const priority = triageResult.priority;
        const confidence = Math.round((triageResult.confidence ?? 0) * 100);
        setMessages([{
          role: 'assistant',
          content: `Analysis complete. **${priority === 'P1' ? '🚨 P1 Emergency' : priority === 'P2' ? '⚠️ P2 Urgent' : '🟢 P3 Non-Urgent'}** 🎯 ${confidence}% confidence.\n\nI've reviewed the consultation transcript, extracted symptoms, and generated SOAP notes. How can I assist with this case?`,
        }]);
      }
    }
  }, [consultationId, triageResult, context]);

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg) return;

    const userMsg: CopilotMessage = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setSources([]);

    try {
      const res = await api.post('/copilot/chat', {
        patient_id: patientId ?? 'dashboard',
        consultation_id: consultationId,
        transcript,
        message: msg,
        history: messages.slice(-10),
        context, // optional hint for backend
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.answer }]);
      setSources(res.data.sources ?? []);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ I\'m unable to respond right now. Please ensure the backend is running.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const hasContent = messages.length > 0;
  const canChat = true;

  const resetChat = () => {
    setMessages([]);
    setSources([]);
    sessionStorage.removeItem('ws_copilotMessages');
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/30 dark:bg-slate-950/30 rounded-[24px] overflow-hidden shadow-sm border border-slate-200/60 dark:border-slate-800/60 relative">
      
      {/* Decorative gradient blur in background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Header */}
      <div className="h-16 flex-shrink-0 flex items-center justify-between px-5 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h4 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 leading-none">AI Copilot</h4>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500 leading-none">
                {context === 'dashboard' ? 'Command Center' : 'Workspace Active'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {hasContent && (
            <Button variant="ghost" size="sm" onClick={resetChat} className="h-8 px-2.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 dark:hover:text-slate-300 dark:hover:bg-slate-800/50 font-semibold text-xs transition-colors">
              <RotateCcw size={13} className="mr-1.5 stroke-[2.5]" /> Reset
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors xl:hidden">
              <X size={18} />
            </Button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 px-5 py-6 overflow-y-auto">
        <div className="space-y-6 flex flex-col min-h-full">
          {/* Empty state with suggested prompts */}
          {!hasContent && (
            <div className="flex flex-col items-center pt-8 pb-4 h-full my-auto">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-5 shadow-lg shadow-blue-500/10 bg-gradient-to-br from-white to-blue-50 border border-blue-100 dark:from-slate-800 dark:to-blue-900/30 dark:border-blue-900/50 relative group">
                <div className="absolute inset-0 rounded-3xl bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <Sparkles size={28} className="text-blue-600 dark:text-blue-400 relative z-10" />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2 tracking-tight">How can I help?</h4>
              <p className="text-[13px] text-center mb-8 max-w-[260px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                {context === 'dashboard' 
                  ? 'I monitor the clinical environment. Ask me to analyze trends or review specific cases.'
                  : 'Ask me anything about this consultation, patient history, or clinical guidelines.'}
              </p>

              {canChat && (
                <div className="w-full flex flex-col gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-center w-full mb-1 text-slate-400 dark:text-slate-500">Suggested queries</p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {prompts.map(({ text, icon, bg, color }) => (
                      <motion.button
                        key={text}
                        whileHover={{ scale: 1.01, y: -1 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => sendMessage(text)}
                        disabled={loading}
                        className="flex items-center justify-between px-4 py-3.5 rounded-[16px] text-left text-sm transition-all shadow-sm w-full bg-white/80 border border-slate-200/60 hover:bg-white hover:shadow-md dark:bg-slate-900/60 dark:border-slate-800/60 dark:hover:bg-slate-900/90 group"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${bg} ${color}`}>
                            <span className="text-sm">{icon}</span>
                          </div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{text}</span>
                        </div>
                        <ArrowRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <ChatBubble message={msg} bottomRef={bottomRef} animate={!(msg as any).isHistory} />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-md shadow-blue-500/20 bg-gradient-to-br from-blue-600 to-indigo-600">
                <Sparkles size={14} className="text-white animate-pulse" />
              </div>
              <div className="rounded-[20px_20px_20px_6px] px-5 py-4 shadow-sm bg-white/80 backdrop-blur-md border border-slate-200/60 dark:bg-slate-900/80 dark:border-slate-800/60">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map(j => (
                    <motion.div
                      key={j}
                      className="w-2 h-2 rounded-full bg-blue-500/50 dark:bg-blue-400/50"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: j * 0.2, ease: "easeInOut" }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Citation sources */}
          {sources.length > 0 && !loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-2.5 pt-2 pl-11"
            >
              <BookOpen size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <div className="flex flex-wrap gap-2">
                {sources.map((s, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200/60 shadow-sm dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input Dock */}
      <div className="p-4 bg-transparent z-10 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-slate-950 dark:via-slate-950/90 -z-10" />
        
        <div className={`relative flex items-end gap-2 rounded-3xl p-1.5 transition-all shadow-lg backdrop-blur-xl ${input ? 'bg-white border-blue-200 shadow-blue-500/10 dark:bg-slate-900 dark:border-blue-900/50 dark:shadow-blue-900/20' : 'bg-white/80 border-slate-200/60 dark:bg-slate-900/60 dark:border-slate-800/60'} border`}>
          <TextareaAutosize
            id="copilot-input"
            className="flex-1 outline-none text-[15px] font-medium bg-transparent px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal resize-none overflow-y-auto max-h-[150px]"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown as any}
            placeholder={canChat ? 'Ask a clinical question…' : 'Disabled'}
            disabled={!canChat || loading}
            minRows={1}
            maxRows={6}
          />
          <Button
            id="copilot-send"
            size="icon"
            onClick={() => sendMessage()}
            disabled={!input.trim() || !canChat || loading}
            className={`w-11 h-11 rounded-2xl flex-shrink-0 m-0.5 transition-all ${input.trim() && canChat ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 hover:scale-105 active:scale-95' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700'}`}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} className="ml-0.5" />
            )}
          </Button>
        </div>
        
        {/* Disclaimer */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          <Info size={12} className="text-slate-400 flex-shrink-0" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            AI-generated. Verify against clinical judgment.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Chat Bubble ──────────────────────────────────────────────────────────── */
function ChatBubble({ message, bottomRef, animate = true }: { message: CopilotMessage; bottomRef?: React.RefObject<HTMLDivElement | null>, animate?: boolean }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex items-start gap-3 w-full ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${isUser ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700' : 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/20 border border-blue-500/50'}`}
      >
        {isUser
          ? <User size={14} className="stroke-[2.5]" />
          : <Sparkles size={14} className="text-white" />
        }
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[85%] px-5 py-3.5 text-[15px] font-medium leading-relaxed shadow-sm break-words min-w-0 ${
          isUser 
            ? 'bg-blue-600 text-white rounded-[20px_6px_20px_20px] shadow-blue-500/10' 
            : 'bg-white/90 backdrop-blur-md border border-slate-200/60 text-slate-800 rounded-[6px_20px_20px_20px] dark:bg-slate-900/90 dark:border-slate-800/60 dark:text-slate-200'
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap leading-relaxed break-words">{message.content}</div>
        ) : (
          <TypewriterText content={message.content} bottomRef={bottomRef} animate={animate} />
        )}
      </div>
    </div>
  );
}

/* ── Typewriter & Markdown ────────────────────────────────────────────────── */
function TypewriterText({ content, bottomRef, animate = true }: { content: string; bottomRef?: React.RefObject<HTMLDivElement | null>, animate?: boolean }) {
  const [displayed, setDisplayed] = useState(animate ? '' : content);

  useEffect(() => {
    if (!animate) {
      setDisplayed(content);
      return;
    }
    
    let i = 0;
    const interval = setInterval(() => {
      i += 4; // Reveal speed
      if (i >= content.length) {
        setDisplayed(content);
        clearInterval(interval);
      } else {
        setDisplayed(content.slice(0, i));
      }
      // Auto-scroll while typing (only scroll the container to avoid page jumps)
      if (bottomRef?.current) {
        const container = bottomRef.current.closest('.overflow-y-auto');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }
    }, 15);
    
    return () => clearInterval(interval);
  }, [content, bottomRef, animate]);

  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({node, ...props}: any) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
        ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
        ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
        li: ({node, ...props}: any) => <li className="" {...props} />,
        strong: ({node, ...props}: any) => <strong className="font-bold text-slate-900 dark:text-slate-100" {...props} />,
        pre: ({node, ...props}: any) => (
          <pre className="bg-slate-800 text-slate-100 p-3.5 rounded-xl overflow-x-auto text-[13px] my-4 shadow-inner" {...props} />
        ),
        code: ({node, className, children, ...props}: any) => {
          const isBlock = /language-(\w+)/.test(className || '');
          if (isBlock) {
            return <code className={className} {...props}>{children}</code>;
          }
          return (
            <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-md text-[13.5px] font-mono text-slate-800 dark:text-slate-200" {...props}>
              {children}
            </code>
          );
        },
        a: ({node, ...props}: any) => <a className="text-blue-600 dark:text-blue-400 hover:underline font-medium" {...props} />,
        table: ({node, ...props}: any) => (
          <div className="overflow-x-auto my-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-left text-sm" {...props} />
          </div>
        ),
        th: ({node, ...props}: any) => <th className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 font-bold border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100" {...props} />,
        td: ({node, ...props}: any) => <td className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/50 last:border-0" {...props} />,
        blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-blue-500 pl-4 py-1 my-3 text-slate-600 dark:text-slate-400 italic" {...props} />,
      }}
    >
      {displayed}
    </ReactMarkdown>
  );
}


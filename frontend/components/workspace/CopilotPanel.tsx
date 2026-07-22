'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { CopilotMessage, TriageResponse } from '@/lib/types';
import { Send, Bot, User, Loader2, Sparkles, RotateCcw, BookOpen, Info } from 'lucide-react';

interface Props {
  patientId: string | null;
  consultationId: string | null;
  triageResult: TriageResponse | null;
}

const SUGGESTED_PROMPTS = [
  { text: 'What symptoms were detected?',          icon: '🔍' },
  { text: 'Why was this priority assigned?',        icon: '❓' },
  { text: 'Has this patient had similar issues before?', icon: '📋' },
  { text: 'Summarize previous visits.',             icon: '📅' },
  { text: 'What is the recommended next action?',  icon: '🏥' },
  { text: 'Are there any drug interactions to flag?', icon: '💊' },
];

export default function CopilotPanel({ patientId, consultationId, triageResult }: Props) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sources, setSources]   = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (consultationId && triageResult) {
      const priority = triageResult.priority;
      const confidence = Math.round((triageResult.confidence ?? 0) * 100);
      setMessages([{
        role: 'assistant',
        content: `Analysis complete. **${priority === 'P1' ? '🚨 P1 Emergency' : priority === 'P2' ? '⚠️ P2 Urgent' : '✅ P3 Non-Urgent'}** — ${confidence}% confidence.\n\nI've reviewed the consultation transcript, extracted symptoms, and generated SOAP notes. How can I assist with this case?`,
      }]);
    }
  }, [consultationId]);

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || !patientId) return;

    const userMsg: CopilotMessage = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setSources([]);

    try {
      const res = await api.post('/copilot/chat', {
        patient_id: patientId,
        consultation_id: consultationId,
        message: msg,
        history: messages.slice(-6),
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

  return (
    <div className="h-full flex flex-col" style={{ background: 'white' }}>

      {/* Header */}
      <div className="panel-header flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-action))' }}
          >
            <Sparkles size={14} color="white" />
          </div>
          <div>
            <h4>AI Doctor Copilot</h4>
            <div className="flex items-center gap-1.5">
              <span className="dot-success" />
              <span className="text-xs" style={{ color: 'var(--color-success)' }}>Gemini 2.5 Flash</span>
            </div>
          </div>
        </div>
        {hasContent && (
          <button
            onClick={() => setMessages([])}
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            <RotateCcw size={13} /> Clear
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Empty state with suggested prompts */}
        {!hasContent && (
          <div className="flex flex-col items-center pt-4 pb-2">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)', border: '1px solid #BFDBFE' }}
            >
              <Sparkles size={24} style={{ color: 'var(--color-action)' }} />
            </div>
            <h4 className="text-center mb-1">AI Doctor Copilot</h4>
            <p className="text-xs text-center mb-6 max-w-[200px]" style={{ color: 'var(--text-muted)' }}>
              {patientId
                ? 'Ask me anything about this consultation, patient history, or clinical guidelines.'
                : 'Select a patient to enable the AI copilot.'}
            </p>

            {patientId && (
              <div className="w-full space-y-1.5">
                <p className="label-xs text-center mb-3">Suggested prompts</p>
                {SUGGESTED_PROMPTS.map(({ text, icon }) => (
                  <motion.button
                    key={text}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => sendMessage(text)}
                    disabled={loading}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-sm transition-all"
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span>{icon}</span>
                    <span>{text}</span>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <ChatBubble message={msg} />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-2.5"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-action))' }}
            >
              <Sparkles size={12} color="white" />
            </div>
            <div
              className="rounded-2xl px-4 py-3"
              style={{ background: '#F8FAFC', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map(j => (
                  <motion.div
                    key={j}
                    className="w-2 h-2 rounded-full"
                    style={{ background: 'var(--text-muted)' }}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity, delay: j * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Citation sources */}
        {sources.length > 0 && !loading && (
          <div className="flex items-start gap-2">
            <BookOpen size={12} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
            <div className="flex flex-wrap gap-1.5">
              {sources.map((s, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: '#EFF6FF', color: 'var(--color-primary)', border: '1px solid #BFDBFE' }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Suggested quick prompts after response */}
        {hasContent && messages.length <= 2 && patientId && !loading && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {SUGGESTED_PROMPTS.slice(0, 3).map(({ text, icon }) => (
              <button
                key={text}
                onClick={() => sendMessage(text)}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={{ background: '#F1F5F9', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                {icon} {text.length > 25 ? text.slice(0, 25) + '…' : text}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Disclaimer */}
      {hasContent && (
        <div className="px-4 py-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-start gap-1.5">
            <Info size={10} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              AI-generated. Always verify against clinical judgment.
            </p>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        {!patientId && (
          <p className="text-xs text-center mb-2" style={{ color: 'var(--text-muted)' }}>
            Select a patient to enable the copilot
          </p>
        )}
        <div
          className="flex items-end gap-2 rounded-2xl p-2"
          style={{
            border: `1.5px solid ${input ? 'var(--color-action)' : 'var(--border)'}`,
            background: 'white',
            boxShadow: input ? '0 0 0 3px rgba(42,125,225,0.1)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <input
            id="copilot-input"
            ref={inputRef}
            className="flex-1 outline-none text-sm bg-transparent px-2 py-1"
            style={{ color: 'var(--text-primary)', minHeight: '24px' }}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={patientId ? 'Ask a clinical question…' : 'Select a patient first…'}
            disabled={!patientId || loading}
          />
          <button
            id="copilot-send"
            onClick={() => sendMessage()}
            disabled={!input.trim() || !patientId || loading}
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: input.trim() && patientId ? 'var(--color-action)' : '#F1F5F9',
              color: input.trim() && patientId ? 'white' : 'var(--text-muted)',
            }}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Chat Bubble ──────────────────────────────────────────────────────────── */
function ChatBubble({ message }: { message: CopilotMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: isUser
            ? '#EFF6FF'
            : 'linear-gradient(135deg, var(--color-primary), var(--color-action))',
        }}
      >
        {isUser
          ? <User size={13} style={{ color: 'var(--color-action)' }} />
          : <Sparkles size={13} color="white" />
        }
      </div>

      {/* Bubble */}
      <div
        className="max-w-[84%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
        style={{
          background: isUser ? '#EFF6FF' : '#F8FAFC',
          border: `1px solid ${isUser ? '#BFDBFE' : 'var(--border)'}`,
          color: 'var(--text-secondary)',
          borderRadius: isUser ? '18px 6px 18px 18px' : '6px 18px 18px 18px',
        }}
      >
        <MessageMarkdown content={message.content} />
      </div>
    </div>
  );
}

/* ── Simple markdown renderer ─────────────────────────────────────────────── */
function MessageMarkdown({ content }: { content: string }) {
  const parts = content.split(/\*\*(.*?)\*\*/g);
  return (
    <span>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{part}</strong>
          : part.split('\n').map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {line}
              </span>
            ))
      )}
    </span>
  );
}

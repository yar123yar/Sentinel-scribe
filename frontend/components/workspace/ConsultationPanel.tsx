'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { TriageResponse } from '@/lib/types';
import { getSeverityChipClass, getPriorityColor, getPriorityBg, getPriorityLabel } from '@/lib/utils';
import {
  FileText, Upload, Zap, AlertTriangle, ChevronDown, ChevronUp,
  Edit3, Save, RotateCcw, Info, Activity, Loader2, CheckCircle,
  Siren, Phone, ArrowRight, ClipboardList, BookOpen, Stethoscope
} from 'lucide-react';

interface Props {
  patientId: string | null;
  patientName: string | null;
  onTriageComplete: (result: TriageResponse, consultationId: string) => void;
}

const SAMPLE_P1 = `Patient is a 54-year-old male presenting with severe chest pain radiating to the left arm for the past 45 minutes. He describes the pain as crushing, rated 9 out of 10. He has a history of coronary artery disease. He is also experiencing shortness of breath and diaphoresis. He took aspirin at home before coming in. On examination, he appears pale, anxious, and diaphoretic. BP 150/90, HR 105.`;

const SAMPLE_P3 = `A 25-year-old female teacher presents with a 3-day history of sore throat, mild fever of 37.8°C, and fatigue. She reports difficulty swallowing. No rash. No recent travel. She works in a school and several colleagues have been unwell with similar symptoms recently.`;

type Section = 'transcript' | 'symptoms' | 'triage' | 'soap';

export default function ConsultationPanel({ patientId, patientName, onTriageComplete }: Props) {
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<TriageResponse | null>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Set<Section>>(new Set(['transcript']));
  const [soapEditing, setSoapEditing] = useState(false);
  const [soapDraft, setSoapDraft]     = useState<Record<string, string>>({});
  const [pipelineSteps, setPipelineSteps] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleSection = (s: Section) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const openAll = () => setOpenSections(new Set(['transcript', 'symptoms', 'triage', 'soap']));

  const handleAnalyze = async () => {
    if (!patientId || !transcript.trim()) return;
    setLoading(true);
    setPipelineSteps([]);
    setResult(null);
    try {
      const steps = ['Cleaning transcript…', 'Detecting red flags…', 'Extracting symptoms…', 'Querying Qdrant RAG…', 'Classifying triage…', 'Generating SOAP notes…', 'Saving to memory…'];
      let i = 0;
      const interval = setInterval(() => {
        if (i < steps.length) { setPipelineSteps(p => [...p, steps[i]]); i++; }
        else clearInterval(interval);
      }, 600);

      const conRes = await api.post('/consultations', {
        patient_id: patientId,
        transcript,
        chief_complaint: transcript.slice(0, 60),
      });
      const cId = conRes.data.id;
      setConsultationId(cId);

      const triageRes = await api.post('/triage', {
        consultation_id: cId,
        transcript,
        patient_id: patientId,
      });

      clearInterval(interval);
      setPipelineSteps(steps);
      setResult(triageRes.data);
      setSoapDraft(triageRes.data.soap_note || {});
      openAll();
      onTriageComplete(triageRes.data, cId);
    } catch (e) {
      console.error(e);
      alert('Analysis failed. Ensure backend is running and a patient is selected.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setTranscript('');
    setConsultationId(null);
    setPipelineSteps([]);
    setSoapEditing(false);
    setOpenSections(new Set(['transcript']));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setTranscript(ev.target?.result as string);
    reader.readAsText(file);
  };

  const isEmergency = result?.priority === 'P1';

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-page)' }}>

      {/* ── Panel Header ──────────────────────────────────────── */}
      <div
        className="panel-header flex-shrink-0"
        style={{ background: 'white', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: '#EFF6FF' }}>
            <ClipboardList size={15} style={{ color: 'var(--color-action)' }} />
          </div>
          <div>
            <h4>Consultation Workflow</h4>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {patientName ? `Patient: ${patientName}` : 'Select a patient to begin'}
            </p>
          </div>
        </div>
        {result && (
          <button onClick={handleReset} className="btn btn-ghost btn-sm flex items-center gap-1.5">
            <RotateCcw size={13} /> New
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── Emergency Banner ───────────────────────────────── */}
        <AnimatePresence>
          {isEmergency && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="emergency-banner flex-shrink-0"
            >
              <Siren size={18} className="flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-sm">🚨 P1 EMERGENCY — Immediate Intervention Required</p>
                <p className="text-white/80 text-xs mt-0.5">
                  {result?.red_flags?.join(' · ') || 'Critical red flags detected'}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
                  <Phone size={12} /> Alert Team
                </button>
                <button className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
                  Escalate <ArrowRight size={12} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-4 space-y-3">

          {/* ── Section 1: Transcript ─────────────────────────── */}
          <CollapsibleSection
            title="Consultation Transcript"
            icon={FileText}
            open={openSections.has('transcript')}
            onToggle={() => toggleSection('transcript')}
          >
            <div className="p-4">
              <textarea
                id="transcript-input"
                className="input textarea mb-3"
                rows={7}
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                placeholder="Paste or type the consultation transcript here…"
              />
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="btn btn-secondary btn-sm"
                >
                  <Upload size={13} /> Upload file
                </button>
                <input ref={fileRef} type="file" accept=".txt,.doc,.docx" className="hidden" onChange={handleFile} />
                <button
                  onClick={() => setTranscript(SAMPLE_P1)}
                  className="btn btn-sm"
                  style={{ background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }}
                >
                  <AlertTriangle size={12} /> Sample P1 Case
                </button>
                <button
                  onClick={() => setTranscript(SAMPLE_P3)}
                  className="btn btn-sm"
                  style={{ background: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' }}
                >
                  <Stethoscope size={12} /> Sample P3 Case
                </button>
              </div>

              {/* Pipeline progress */}
              {loading && (
                <div className="rounded-xl p-4 mb-4"
                  style={{ background: '#F8FAFC', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-action)' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                      Running AI Pipeline…
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {pipelineSteps.map((step, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <CheckCircle size={11} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                        {step}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <button
                id="analyze-btn"
                onClick={handleAnalyze}
                disabled={!transcript.trim() || !patientId || loading}
                className="btn btn-primary w-full"
              >
                {loading ? (
                  <><Loader2 size={15} className="animate-spin" /> Analyzing…</>
                ) : (
                  <><Zap size={15} /> Analyze & Triage Patient</>
                )}
              </button>

              {!patientId && (
                <div className="mt-3 flex items-center gap-2 p-3 rounded-xl text-xs"
                  style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
                  <Info size={13} /> Please select a patient from the left panel first.
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* ── Section 2: Symptoms ───────────────────────────── */}
          {result && (
            <CollapsibleSection
              title={`Detected Symptoms (${result.symptoms.length})`}
              icon={Activity}
              open={openSections.has('symptoms')}
              onToggle={() => toggleSection('symptoms')}
              badge={result.red_flags.length > 0 ? { text: `${result.red_flags.length} Red Flag${result.red_flags.length > 1 ? 's' : ''}`, color: '#DC2626', bg: '#FEE2E2' } : undefined}
            >
              <div className="p-4">
                {/* Red flags */}
                {result.red_flags.length > 0 && (
                  <div className="flex items-start gap-3 p-3.5 rounded-xl mb-4"
                    style={{ background: '#FFF5F5', border: '1px solid #FECACA' }}>
                    <AlertTriangle size={15} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p className="text-sm font-semibold mb-1.5" style={{ color: '#B91C1C' }}>
                        Red Flag Symptoms Detected
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.red_flags.map(f => (
                          <span key={f} className="chip chip-severe">{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Symptom chips */}
                <div className="flex flex-wrap gap-2">
                  {result.symptoms.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <div className={getSeverityChipClass(s.severity)}>
                        <span className="font-medium capitalize">{s.name}</span>
                        {s.duration && s.duration !== 'unknown' && (
                          <span className="opacity-60">· {s.duration}</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* ── Section 3: Triage Result ──────────────────────── */}
          {result && (
            <CollapsibleSection
              title="Triage Classification"
              icon={Stethoscope}
              open={openSections.has('triage')}
              onToggle={() => toggleSection('triage')}
            >
              <div className="p-4">
                {/* Priority card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-5 mb-4"
                  style={{
                    background: getPriorityBg(result.priority),
                    border: `1.5px solid ${getPriorityColor(result.priority)}30`,
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="label-xs" style={{ color: getPriorityColor(result.priority) }}>
                        Triage Priority
                      </span>
                      <h2 className="text-2xl font-bold mt-0.5" style={{ color: getPriorityColor(result.priority) }}>
                        {getPriorityLabel(result.priority)}
                      </h2>
                    </div>
                    <div className="text-right">
                      <p className="label-xs mb-0.5">Confidence</p>
                      <p className="text-3xl font-bold" style={{ color: getPriorityColor(result.priority) }}>
                        {Math.round(result.confidence * 100)}%
                      </p>
                    </div>
                  </div>
                  <div className="confidence-track">
                    <motion.div
                      className="confidence-fill"
                      style={{ background: getPriorityColor(result.priority) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${result.confidence * 100}%` }}
                      transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </motion.div>

                {/* Reasoning */}
                <p className="label-xs mb-2.5">Clinical Reasoning</p>
                <div className="space-y-2 mb-4">
                  {result.reasoning.map((r, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-2.5 p-3 rounded-xl"
                      style={{ background: '#F8FAFC', border: '1px solid var(--border)' }}
                    >
                      <CheckCircle size={13} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 1 }} />
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{r}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Guideline references */}
                {result.guideline_matches.length > 0 && (
                  <>
                    <p className="label-xs mb-2.5">Guideline References</p>
                    <div className="space-y-1.5">
                      {result.guideline_matches.map((g, i) => (
                        <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg"
                          style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                          <BookOpen size={12} style={{ color: 'var(--color-action)', flexShrink: 0 }} />
                          <p className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>{g}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* ── Section 4: SOAP Notes ─────────────────────────── */}
          {result?.soap_note && (
            <CollapsibleSection
              title="SOAP Notes"
              icon={FileText}
              open={openSections.has('soap')}
              onToggle={() => toggleSection('soap')}
              action={
                <button
                  onClick={() => setSoapEditing(!soapEditing)}
                  className="btn btn-ghost btn-sm flex items-center gap-1.5"
                >
                  {soapEditing ? <><Save size={13} /> Done</> : <><Edit3 size={13} /> Edit</>}
                </button>
              }
            >
              <div className="p-4 space-y-3">
                {(['subjective', 'objective', 'assessment', 'plan'] as const).map(field => (
                  <SOAPSection
                    key={field}
                    field={field}
                    value={soapDraft[field] ?? result.soap_note?.[field] ?? ''}
                    editing={soapEditing}
                    onChange={v => setSoapDraft(prev => ({ ...prev, [field]: v }))}
                  />
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Collapsible Section ──────────────────────────────────────────────────── */
function CollapsibleSection({
  title, icon: Icon, open, onToggle, children, badge, action
}: {
  title: string;
  icon: React.ElementType;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: { text: string; color: string; bg: string };
  action?: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="section-header w-full"
        style={{ background: open ? 'white' : '#FAFBFC' }}
      >
        <div className="flex items-center gap-2.5">
          <Icon size={14} style={{ color: 'var(--color-action)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</span>
          {badge && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: badge.bg, color: badge.color }}
            >
              {badge.text}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
          {open ? <ChevronUp size={15} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={15} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── SOAP Section ──────────────────────────────────────────────────────────── */
const SOAP_META: Record<string, { label: string; short: string; color: string; bg: string }> = {
  subjective:  { label: 'Subjective', short: 'S', color: '#2A7DE1', bg: '#EFF6FF' },
  objective:   { label: 'Objective',  short: 'O', color: '#8B5CF6', bg: '#F5F3FF' },
  assessment:  { label: 'Assessment', short: 'A', color: '#F59E0B', bg: '#FFFBEB' },
  plan:        { label: 'Plan',       short: 'P', color: '#0E9F6E', bg: '#F0FDF9' },
};

function SOAPSection({ field, value, editing, onChange }: {
  field: string; value: string; editing: boolean; onChange: (v: string) => void;
}) {
  const meta = SOAP_META[field];
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: meta.bg }}>
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: meta.color }}
        >
          {meta.short}
        </div>
        <span className="text-sm font-semibold" style={{ color: meta.color }}>{meta.label}</span>
      </div>
      {editing ? (
        <textarea
          className="w-full p-3.5 text-sm resize-none outline-none"
          style={{ minHeight: '100px', color: 'var(--text-secondary)', fontFamily: 'inherit', border: 'none', background: 'white' }}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      ) : (
        <div className="px-4 py-3.5">
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
            {value || <span style={{ color: 'var(--text-muted)' }}>Not yet generated</span>}
          </p>
        </div>
      )}
    </div>
  );
}

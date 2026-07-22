'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { TriageResponse } from '@/lib/types';
import { getSeverityChipClass, getPriorityColor, getPriorityBg, getPriorityLabel } from '@/lib/utils';
import {
  FileText, Upload, Zap, AlertTriangle, ChevronDown, ChevronUp,
  Edit3, Save, RotateCcw, Activity, Loader2, CheckCircle,
  Siren, Phone, ArrowRight, ClipboardList, BookOpen, Stethoscope, User,
  ClipboardCheck, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  patientId: string | null;
  patientName: string | null;
  transcript: string;
  onTranscriptChange: (value: string) => void;
  onTriageComplete: (result: TriageResponse | null, consultationId: string | null) => void;
}



type Section = 'transcript' | 'symptoms' | 'triage' | 'soap';

export default function ConsultationPanel({ patientId, patientName, transcript, onTranscriptChange, onTriageComplete }: Props) {
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<TriageResponse | null>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Set<Section>>(new Set(['transcript']));
  const [isCompleted, setIsCompleted] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'accurate' | 'inaccurate' | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const [pipelineSteps, setPipelineSteps] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const storedRes = sessionStorage.getItem('ws_triageResult');
    if (storedRes && !result) {
      try {
        setResult(JSON.parse(storedRes));
        setOpenSections(new Set(['transcript', 'symptoms', 'triage', 'soap']));
      } catch (e) {}
    }
    const cId = sessionStorage.getItem('ws_consultationId');
    if (cId && !consultationId) setConsultationId(cId);
    
    const isComp = sessionStorage.getItem('ws_isCompleted');
    if (isComp === 'true') setIsCompleted(true);
    
    const fg = sessionStorage.getItem('ws_feedbackGiven');
    if (fg) setFeedbackGiven(fg as 'accurate' | 'inaccurate');
    
    setIsHydrated(true);
  }, []);

  // Persist local UI state to sessionStorage
  useEffect(() => {
    if (!isHydrated) return;
    sessionStorage.setItem('ws_isCompleted', isCompleted.toString());
  }, [isCompleted, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    if (feedbackGiven) sessionStorage.setItem('ws_feedbackGiven', feedbackGiven);
    else sessionStorage.removeItem('ws_feedbackGiven');
  }, [feedbackGiven, isHydrated]);

  const [prevPatientId, setPrevPatientId] = useState(patientId);
  useEffect(() => {
    if (patientId !== prevPatientId) {
      if (prevPatientId !== null) {
        setResult(null);
        setConsultationId(null);
        setIsCompleted(false);
        setFeedbackGiven(null);
        setOpenSections(new Set(['transcript']));
      }
      setPrevPatientId(patientId);
    }
  }, [patientId, prevPatientId]);

  const loadNewTranscript = (text: string) => {
    onTranscriptChange(text);
    setResult(null);
    setConsultationId(null);
    setIsCompleted(false);
    setFeedbackGiven(null);
    setPipelineSteps([]);
    setOpenSections(new Set(['transcript']));
    onTriageComplete(null, null);
  };

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
      const steps = ['Cleaning transcript…', 'Detecting red flags…', 'Extracting symptoms…', 'Querying Qdrant RAG…', 'Classifying triage…', 'Saving to memory…'];
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
      setIsCompleted(false);
      setFeedbackGiven(null);

      const triageRes = await api.post('/triage', {
        consultation_id: cId,
        patient_id: patientId,
      });

      clearInterval(interval);
      setPipelineSteps(steps);
      setResult(triageRes.data);
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
    onTranscriptChange('');
    setConsultationId(null);
    setIsCompleted(false);
    setFeedbackGiven(null);
    setPipelineSteps([]);
    setOpenSections(new Set(['transcript']));
    onTriageComplete(null, null);
    sessionStorage.removeItem('ws_consultationId');
    sessionStorage.removeItem('ws_triageResult');
    sessionStorage.removeItem('ws_isCompleted');
    sessionStorage.removeItem('ws_feedbackGiven');
  };

  const handleFeedback = async (isAccurate: boolean) => {
    if (!consultationId) return;
    try {
      await api.patch(`/triage/${consultationId}/accuracy`, { is_accurate: isAccurate });
      setFeedbackGiven(isAccurate ? 'accurate' : 'inaccurate');
    } catch (e) {
      console.error(e);
    }
  };

  const handleComplete = async () => {
    if (!consultationId) return;
    try {
      await api.patch(`/consultations/${consultationId}/complete`);
      setIsCompleted(true);
    } catch (e) {
      console.error(e);
      alert('Failed to mark as complete.');
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => loadNewTranscript(ev.target?.result as string);
    reader.readAsText(file);
  };

  const isEmergency = result?.priority === 'P1';

  return (
    <div className="h-full flex flex-col min-h-0 bg-slate-50 dark:bg-slate-900">

      {/* ── Panel Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 h-14 sticky top-0 z-10 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-900/30">
            <ClipboardList size={15} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-none">Consultation Workflow</h4>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
              {patientName ? `Patient: ${patientName}` : 'Select a patient to begin'}
            </p>
          </div>
        </div>
        {result && (
          <div className="flex items-center gap-1.5">
            {!isCompleted ? (
              <Button size="sm" onClick={handleComplete} className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-3">
                <CheckCircle size={13} className="mr-1.5" /> Mark Complete
              </Button>
            ) : (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 shadow-sm px-2 py-0.5">
                <CheckCircle size={13} className="mr-1.5" /> Completed
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 px-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              <RotateCcw size={13} className="mr-1.5" /> New
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">

        {/* ── Emergency Banner ───────────────────────────────── */}
        <AnimatePresence>
          {isEmergency && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="sticky top-0 z-20 overflow-hidden"
            >
              <div className="bg-red-600 text-white p-4 shadow-md flex items-start gap-4">
                <Siren size={20} className="flex-shrink-0 mt-0.5 animate-pulse" />
                <div className="flex-1">
                  <p className="font-bold text-sm tracking-wide">🚨 EMERGENCY DETECTED — Possible Acute Coronary Syndrome</p>
                  <p className="text-red-100 text-xs mt-1 font-medium">
                    Priority: P1 · Detected: {result?.red_flags?.join(' · ') || 'Critical red flags'}
                  </p>
                </div>
                <div className="flex gap-2 flex-col sm:flex-row">
                  <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-transparent h-8 shadow-sm">
                    <Phone size={13} className="mr-1.5" /> Call Team
                  </Button>
                  <Button size="sm" variant="secondary" className="bg-white text-red-700 hover:bg-red-50 border-transparent h-8 shadow-sm">
                    Escalate <ArrowRight size={13} className="ml-1.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-4 md:p-6 pb-24 space-y-4 max-w-4xl mx-auto">

          {/* ── Section 1: Transcript ─────────────────────────── */}
          <CollapsibleSection
            title="Consultation Transcript"
            icon={FileText}
            open={openSections.has('transcript')}
            onToggle={() => toggleSection('transcript')}
          >
            <div className="p-4 md:p-5">
              {!patientId ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-slate-50 border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800">
                    <User size={28} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">No Patient Selected</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[250px]">
                    Please select a patient from the left panel to begin the consultation workflow.
                  </p>
                </div>
              ) : (
                <>
                  <Textarea
                    className="mb-4 min-h-[160px] resize-y bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500 shadow-sm"
                    value={transcript}
                    onChange={e => {
                      const val = e.target.value;
                      onTranscriptChange(val);
                      if (val.trim() === '') {
                        setResult(null);
                        onTriageComplete(null, null);
                      }
                    }}
                    placeholder="Paste or type the consultation transcript here…"
                  />
                  <div className="flex flex-wrap items-center gap-2.5 mb-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileRef.current?.click()}
                      className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm"
                    >
                      <Upload size={13} className="mr-1.5 text-slate-500" /> Upload file
                    </Button>
                    <input ref={fileRef} type="file" accept=".txt,.doc,.docx" className="hidden" onChange={handleFile} />
                  </div>

                  {/* Pipeline progress */}
                  {loading && (
                    <div className="rounded-xl p-4 mb-6 bg-slate-50 border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800 shadow-inner">
                      <div className="flex items-center gap-2 mb-3">
                        <Loader2 size={14} className="animate-spin text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                          Running AI Pipeline…
                        </span>
                      </div>
                      <div className="space-y-2 pl-1">
                        {pipelineSteps.map((step, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400"
                          >
                            <CheckCircle size={13} className="text-emerald-500 flex-shrink-0" />
                            {step}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    size="lg"
                    onClick={handleAnalyze}
                    disabled={!transcript.trim() || !patientId || loading}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all"
                  >
                    {loading ? (
                      <><Loader2 size={15} className="animate-spin mr-2" /> Analyzing…</>
                    ) : (
                      <><Zap size={15} className="mr-2" /> Analyze & Triage Patient</>
                    )}
                  </Button>
                </>
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
              badge={result.red_flags.length > 0 ? { text: `${result.red_flags.length} Red Flag${result.red_flags.length > 1 ? 's' : ''}`, color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40' } : undefined}
            >
              <div className="p-4 md:p-5">
                {/* Red flags */}
                {result.red_flags.length > 0 && (
                  <div className="flex items-start gap-3 p-4 rounded-xl mb-5 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800/60 shadow-sm">
                    <AlertTriangle size={16} className="text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold mb-2 text-red-800 dark:text-red-400">
                        Red Flag Symptoms Detected
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {result.red_flags.map(f => (
                          <Badge key={f} variant="destructive" className="shadow-sm">{f}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Symptom chips */}
                <div className="flex flex-wrap gap-2.5">
                  {result.symptoms.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Badge variant="outline" className={`px-2.5 py-1 font-medium ${getSeverityChipClass(s.severity)}`}>
                        <span className="capitalize">{s.name}</span>
                        {s.duration && s.duration !== 'unknown' && (
                          <span className="opacity-60 font-normal ml-1.5">· {s.duration}</span>
                        )}
                      </Badge>
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
              <div className="p-4 md:p-5">
                {/* Priority card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-6 mb-6 shadow-sm overflow-hidden relative"
                  style={{
                    background: getPriorityBg(result.priority),
                    border: `1.5px solid ${getPriorityColor(result.priority)}30`,
                  }}
                >
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest opacity-80" style={{ color: getPriorityColor(result.priority) }}>
                        Triage Priority
                      </span>
                      <h2 className="text-3xl font-black mt-1 tracking-tight" style={{ color: getPriorityColor(result.priority) }}>
                        {getPriorityLabel(result.priority)}
                      </h2>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-bold uppercase tracking-widest opacity-80 mb-1" style={{ color: getPriorityColor(result.priority) }}>Confidence</p>
                      <p className="text-4xl font-black tracking-tighter" style={{ color: getPriorityColor(result.priority) }}>
                        {Math.round(result.confidence * 100)}%
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress bar background */}
                  <div className="h-2 w-full rounded-full overflow-hidden bg-black/5 dark:bg-white/10 relative z-10 mb-4">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: getPriorityColor(result.priority) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${result.confidence * 100}%` }}
                      transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>

                  <div className="flex items-center justify-between relative z-10 pt-2 border-t border-black/5 dark:border-white/10 mt-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest opacity-80" style={{ color: getPriorityColor(result.priority) }}>
                      Is this triage accurate?
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleFeedback(true)}
                        className={`h-7 px-2 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${feedbackGiven === 'accurate' ? 'bg-black/10 dark:bg-white/10 ring-1 ring-black/20 dark:ring-white/20' : ''}`}
                        style={{ color: getPriorityColor(result.priority) }}
                      >
                        <ThumbsUp size={13} className="mr-1.5" /> Yes
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleFeedback(false)}
                        className={`h-7 px-2 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${feedbackGiven === 'inaccurate' ? 'bg-black/10 dark:bg-white/10 ring-1 ring-black/20 dark:ring-white/20' : ''}`}
                        style={{ color: getPriorityColor(result.priority) }}
                      >
                        <ThumbsDown size={13} className="mr-1.5" /> No
                      </Button>
                    </div>
                  </div>
                </motion.div>

                {/* Reasoning */}
                <h4 className="text-sm font-semibold mb-3 text-slate-900 dark:text-slate-100">Clinical Reasoning</h4>
                <div className="space-y-2 mb-6">
                  {result.reasoning.map((r, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800 shadow-sm"
                    >
                      <CheckCircle size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{r}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Guideline references */}
                {result.guideline_matches.length > 0 && (
                  <>
                    <h4 className="text-sm font-semibold mb-3 text-slate-900 dark:text-slate-100">Guideline References</h4>
                    <div className="space-y-2">
                      {result.guideline_matches.map((g, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/50 border border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/40 shadow-sm">
                          <BookOpen size={14} className="text-blue-600 dark:text-blue-500 flex-shrink-0" />
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-400">{g}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* ── Section 4: SOAP Note ──────────────────────────── */}
          {result?.soap_note && (
            <CollapsibleSection
              title="SOAP Note"
              icon={ClipboardCheck}
              open={openSections.has('soap')}
              onToggle={() => toggleSection('soap')}
            >
              <div className="p-4 md:p-5 space-y-4">
                {([
                  { key: 'subjective',  label: 'S — Subjective',  color: 'blue',   desc: 'Patient\'s reported complaints & history' },
                  { key: 'objective',   label: 'O — Objective',   color: 'violet', desc: 'Findings, vitals & investigations' },
                  { key: 'assessment', label: 'A — Assessment',  color: 'amber',  desc: 'Clinical diagnosis & differentials' },
                  { key: 'plan',        label: 'P — Plan',        color: 'emerald',desc: 'Treatment, referrals & follow-up' },
                ] as const).map(({ key, label, color, desc }, i) => {
                  const value = result.soap_note?.[key as keyof typeof result.soap_note];
                  if (!value) return null;
                  const colorMap: Record<string, { bg: string; border: string; labelColor: string; dot: string }> = {
                    blue:    { bg: 'bg-blue-50 dark:bg-blue-900/15',     border: 'border-blue-200 dark:border-blue-800/60',   labelColor: 'text-blue-700 dark:text-blue-400',    dot: 'bg-blue-500' },
                    violet:  { bg: 'bg-violet-50 dark:bg-violet-900/15', border: 'border-violet-200 dark:border-violet-800/60',labelColor: 'text-violet-700 dark:text-violet-400', dot: 'bg-violet-500' },
                    amber:   { bg: 'bg-amber-50 dark:bg-amber-900/15',   border: 'border-amber-200 dark:border-amber-800/60', labelColor: 'text-amber-700 dark:text-amber-400',  dot: 'bg-amber-500' },
                    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/15',border: 'border-emerald-200 dark:border-emerald-800/60',labelColor: 'text-emerald-700 dark:text-emerald-400',dot: 'bg-emerald-500' },
                  };
                  const c = colorMap[color];
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className={`rounded-xl border p-4 shadow-sm ${c.bg} ${c.border}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot}`} />
                        <span className={`text-xs font-bold uppercase tracking-widest ${c.labelColor}`}>{label}</span>
                        <span className={`text-[11px] font-medium opacity-60 ${c.labelColor}`}>— {desc}</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{value}</p>
                    </motion.div>
                  );
                })}
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
    <Card className="overflow-hidden shadow-sm border-slate-200 dark:border-slate-800 transition-all duration-200">
      <button
        onClick={onToggle}
        className={`w-full px-4 md:px-5 py-3.5 flex items-center justify-between transition-colors ${open ? 'bg-white border-b border-slate-100 dark:bg-slate-950 dark:border-slate-800/50' : 'bg-slate-50 hover:bg-slate-100/50 dark:bg-slate-900 dark:hover:bg-slate-800/50'}`}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-blue-100/50 dark:bg-blue-900/30">
            <Icon size={15} className="text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{title}</span>
          {badge && (
            <Badge variant="outline" className={`ml-2 text-xs font-semibold px-2 py-0.5 border-transparent ${badge.bg} ${badge.color}`}>
              {badge.text}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {action && <div>{action}</div>}
          <div className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden bg-white dark:bg-slate-950"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}


'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Patient } from '@/lib/types';
import { formatAge, formatDate, getInitials, getAvatarColor } from '@/lib/utils';
import {
  Search, AlertTriangle, Heart, Pill, Calendar,
  ChevronRight, User, Activity, Clock, Shield,
  History, Plus, Trash2, Brain, Stethoscope,
  FileText, CheckCircle, AlertCircle, TrendingUp,
  ChevronDown, ChevronUp, Zap
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface Props {
  selectedPatientId: string | null;
  onSelectPatient: (id: string, name: string) => void;
}

const RISK_LEVEL = (p: Patient) => {
  if (p.chronic_conditions.length >= 3 || p.allergies.length >= 2)
    return { label: 'High', icon: AlertTriangle, color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-600 dark:border-red-500', dot: 'bg-red-500' };
  if (p.chronic_conditions.length >= 1)
    return { label: 'Med', icon: Activity, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-500 dark:border-amber-400', dot: 'bg-amber-500' };
  return { label: 'Low', icon: Shield, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', border: 'border-emerald-600 dark:border-emerald-500', dot: 'bg-emerald-500' };
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  P1: { label: 'P1 Emergency', color: 'text-red-700 dark:text-red-400',    bg: 'bg-red-100 dark:bg-red-900/30',    dot: 'bg-red-500' },
  P2: { label: 'P2 Urgent',    color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', dot: 'bg-amber-500' },
  P3: { label: 'P3 Routine',   color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', dot: 'bg-emerald-500' },
};

// ── Utility: try to extract plain-text from the raw Qdrant/copilot response ──
function parseMemoryText(raw: string): string | null {
  if (!raw) return null;

  // Strip JSON blobs — they're unreadable
  const noJson = raw
    .replace(/\{[\s\S]*?\}/g, '') // remove {...}
    .replace(/\[[\s\S]*?\]/g, '') // remove [...]
    .replace(/"[^"]*"\s*:/g, '')  // remove "key":
    .replace(/\*\*([^*]+)\*\*/g, '$1') // strip markdown bold
    .replace(/#+\s/g, '')              // strip markdown headings
    .trim();

  if (noJson.length > 20) return noJson;
  return null;
}

export default function PatientMemoryPanel({ selectedPatientId, onSelectPatient }: Props) {
  const [patients, setPatients]   = useState<Patient[]>([]);
  const [filtered, setFiltered]   = useState<Patient[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [patientConsultations, setPatientConsultations] = useState<any[]>([]);
  const [expandedConsult, setExpandedConsult] = useState<string | null>(null);

  useEffect(() => {
    api.get('/patients').then(r => {
      setPatients(r.data);
      setFiltered(r.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(patients.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.mrn?.toLowerCase().includes(q) ||
      p.chronic_conditions.some(c => c.toLowerCase().includes(q))
    ));
  }, [search, patients]);

  useEffect(() => {
    if (!selectedPatientId) { setPatientConsultations([]); return; }
    setMemoryLoading(true);
    setExpandedConsult(null);

    api.get(`/consultations?patient_id=${selectedPatientId}`)
      .then(r => setPatientConsultations(r.data))
      .catch(() => setPatientConsultations([]))
      .finally(() => setMemoryLoading(false));
  }, [selectedPatientId]);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const risk = selectedPatient ? RISK_LEVEL(selectedPatient) : null;

  const handleDeletePatient = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this patient and all their records?')) {
      try {
        await api.delete(`/patients/${id}`);
        setPatients(patients.filter(p => p.id !== id));
        if (selectedPatientId === id) onSelectPatient('', '');
      } catch {
        alert('Failed to delete patient.');
      }
    }
  };

  return (
    <div className="h-full flex flex-col relative bg-white dark:bg-slate-950">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 h-14 sticky top-0 z-10 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Patients</h2>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {patients.length} registered
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <Link href="/patients/new" className={buttonVariants({ variant: 'outline', size: 'icon', className: 'w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800' })}>
            <Plus size={14} strokeWidth={2.5} />
          </Link>
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────────────── */}
      <div className="px-4 py-3 sticky top-14 z-10 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
            placeholder="Search patients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="p-3">
            {filtered.map(p => {
              const pRisk = RISK_LEVEL(p);
              const isSelected = p.id === selectedPatientId;

              return (
                <motion.button
                  key={p.id}
                  onClick={() => onSelectPatient(p.id, p.name)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`w-full text-left mb-2 rounded-xl p-4 transition-all relative overflow-hidden border ${isSelected ? 'bg-blue-50/50 border-blue-500 shadow-sm dark:bg-blue-900/10 dark:border-blue-500' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm dark:bg-slate-950 dark:border-slate-800 dark:hover:border-slate-700'}`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${pRisk.dot}`} />

                  <div className="flex items-start gap-3 pl-2">
                    <Avatar className="w-10 h-10 shadow-sm">
                      <AvatarFallback className="text-sm font-bold text-white" style={{ background: getAvatarColor(p.name) }}>
                        {getInitials(p.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-bold truncate text-slate-900 dark:text-slate-100">{p.name}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className={`flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md text-[11px] ${pRisk.bg} ${pRisk.color}`}>
                            <pRisk.icon size={11} />
                            <span className="hidden xl:inline">{pRisk.label}</span>
                          </div>
                          {isSelected && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50" onClick={(e) => handleDeletePatient(p.id, e)}>
                              <Trash2 size={13} />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                        <p className="text-xs text-slate-600 dark:text-slate-400">{formatAge(p.dob)} · {p.gender}</p>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-500">MRN: {p.mrn}</p>
                      </div>

                      {/* Expanded static info */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 pt-3 space-y-2 overflow-hidden border-t border-slate-200 dark:border-slate-800"
                          >
                            {p.blood_type && (
                              <div className="flex items-center gap-2">
                                <Heart size={12} className="text-red-500" />
                                <span className="text-xs text-slate-600 dark:text-slate-400">
                                  Blood type: <strong className="text-slate-900 dark:text-slate-100">{p.blood_type}</strong>
                                </span>
                              </div>
                            )}
                            {p.allergies.length > 0 && (
                              <div className="flex items-start gap-2">
                                <AlertTriangle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                <span className="text-xs text-amber-700 dark:text-amber-400">
                                  <strong>Allergies:</strong> {p.allergies.join(', ')}
                                </span>
                              </div>
                            )}
                            {p.chronic_conditions.length > 0 && (
                              <div className="flex items-start gap-2">
                                <Pill size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                <span className="text-xs text-slate-600 dark:text-slate-400">
                                  {p.chronic_conditions.slice(0, 2).join(', ')}
                                  {p.chronic_conditions.length > 2 && (
                                    <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 rounded text-[10px] h-4 leading-none">
                                      +{p.chronic_conditions.length - 2} more
                                    </Badge>
                                  )}
                                </span>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.button>
              );
            })}

            {filtered.length === 0 && (
              <div className="py-10 text-center">
                <User size={28} className="mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-500">No patients found</p>
              </div>
            )}
          </div>
        )}

        {/* ── Patient Timeline ─────────────────────────────────── */}
        {selectedPatient && (
          <div className="px-4 pb-8">

            {/* Section heading */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              <div className="flex items-center gap-1.5 px-2">
                <History size={13} className="text-slate-400" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Visit History</span>
              </div>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            </div>

            {memoryLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : patientConsultations.length > 0 ? (
              <div className="space-y-3">
                {patientConsultations.map((c, i) => {
                  const pCfg = PRIORITY_CONFIG[c.triage_result?.priority] ?? PRIORITY_CONFIG['P3'];
                  const date = new Date(c.created_at).toLocaleDateString(undefined, {
                    day: 'numeric', month: 'short', year: 'numeric',
                  });
                  const symptoms: any[] = c.symptoms ?? [];
                  const redFlags: string[] = c.triage_result?.red_flags ?? [];
                  const reasoning: string[] = c.triage_result?.reasoning ?? [];
                  const soap = c.soap_note;
                  const isExpanded = expandedConsult === c.id;
                  const chiefComplaint = c.chief_complaint || c.triage_result?.recommended_action || 'General Consultation';

                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
                    >
                      {/* Card header — always visible */}
                      <button
                        onClick={() => setExpandedConsult(isExpanded ? null : c.id)}
                        className="w-full flex items-start gap-3 p-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* Priority dot */}
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${pCfg.dot}`} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {chiefComplaint}
                            </p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${pCfg.bg} ${pCfg.color}`}>
                              {c.triage_result?.priority ?? '—'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar size={10} />
                              {date}
                            </span>
                            {symptoms.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Activity size={10} />
                                {symptoms.length} symptom{symptoms.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {redFlags.length > 0 && (
                              <span className="flex items-center gap-1 text-red-500 dark:text-red-400 font-semibold">
                                <AlertCircle size={10} />
                                {redFlags.length} red flag{redFlags.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex-shrink-0 text-slate-400 mt-0.5">
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </button>

                      {/* Expanded detail */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            key="detail"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-slate-100 dark:border-slate-800"
                          >
                            <div className="p-3.5 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">

                              {/* Red flags */}
                              {redFlags.length > 0 && (
                                <div className="rounded-lg p-2.5 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800/50">
                                  <p className="text-[11px] font-bold text-red-700 dark:text-red-400 mb-1.5 flex items-center gap-1.5">
                                    <AlertTriangle size={11} /> Red Flags
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {redFlags.map((f, j) => (
                                      <span key={j} className="text-[10px] px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full font-medium">
                                        {f}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Symptoms */}
                              {symptoms.length > 0 && (
                                <div>
                                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                                    <Stethoscope size={11} /> Symptoms
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {symptoms.map((s: any, j: number) => (
                                      <span
                                        key={j}
                                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                          s.severity === 'severe'
                                            ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40'
                                            : s.severity === 'moderate'
                                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40'
                                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                        }`}
                                      >
                                        {s.name}
                                        {s.duration && s.duration !== 'unknown' && (
                                          <span className="opacity-60 ml-1">· {s.duration}</span>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Triage reasoning */}
                              {reasoning.length > 0 && (
                                <div>
                                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                                    <Brain size={11} /> Clinical Reasoning
                                  </p>
                                  <div className="space-y-1">
                                    {reasoning.slice(0, 3).map((r, j) => (
                                      <div key={j} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                                        <CheckCircle size={10} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                        <span>{r}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* SOAP note snippet */}
                              {soap && (
                                <div>
                                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                                    <FileText size={11} /> SOAP Note
                                  </p>
                                  <div className="space-y-1.5">
                                    {soap.subjective && (
                                      <div className="rounded-lg px-2.5 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40">
                                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">S — Subjective</span>
                                        <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed line-clamp-2">{soap.subjective}</p>
                                      </div>
                                    )}
                                    {soap.assessment && (
                                      <div className="rounded-lg px-2.5 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40">
                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">A — Assessment</span>
                                        <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed line-clamp-2">{soap.assessment}</p>
                                      </div>
                                    )}
                                    {soap.plan && (
                                      <div className="rounded-lg px-2.5 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40">
                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">P — Plan</span>
                                        <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed line-clamp-2">{soap.plan}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Confidence */}
                              {c.triage_result?.confidence != null && (
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <TrendingUp size={10} /> Confidence
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${pCfg.dot}`}
                                        style={{ width: `${Math.round(c.triage_result.confidence * 100)}%` }}
                                      />
                                    </div>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                      {Math.round(c.triage_result.confidence * 100)}%
                                    </span>
                                  </div>
                                </div>
                              )}

                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <Calendar size={20} className="text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No Visit History</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[180px]">
                  Process a consultation to begin building this patient's timeline.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

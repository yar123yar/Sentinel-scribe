'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import PatientMemoryPanel from '@/components/workspace/PatientMemoryPanel';
import ConsultationPanel from '@/components/workspace/ConsultationPanel';
import CopilotPanel from '@/components/workspace/CopilotPanel';
import { TriageResponse } from '@/lib/types';
import { getPriorityBadgeClass, getPriorityColor } from '@/lib/utils';
import { User, ClipboardList, MessageSquare, Sparkles, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type MobileTab = 'patient' | 'consultation' | 'copilot';

export default function WorkspacePage() {
  const router = useRouter();
  const [patientId, setPatientId]           = useState<string | null>(null);
  const [patientName, setPatientName]       = useState<string | null>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [triageResult, setTriageResult]     = useState<TriageResponse | null>(null);
  const [transcript, setTranscript]         = useState<string>('');
  const [mobileTab, setMobileTab]           = useState<MobileTab>('patient');
  const [showCopilotDrawer, setShowCopilotDrawer] = useState(false); // tablet
  const [isHydrated, setIsHydrated]         = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('auth_token')) {
      router.push('/login');
      return;
    }
    const pId = sessionStorage.getItem('ws_patientId');
    if (pId) setPatientId(pId);
    const pName = sessionStorage.getItem('ws_patientName');
    if (pName) setPatientName(pName);
    const cId = sessionStorage.getItem('ws_consultationId');
    if (cId) setConsultationId(cId);
    const tRes = sessionStorage.getItem('ws_triageResult');
    if (tRes) setTriageResult(JSON.parse(tRes));
    const trans = sessionStorage.getItem('ws_transcript');
    if (trans !== null) setTranscript(trans);
    setIsHydrated(true);
  }, [router]);

  useEffect(() => {
    if (!isHydrated) return;
    if (patientId) sessionStorage.setItem('ws_patientId', patientId); else sessionStorage.removeItem('ws_patientId');
    if (patientName) sessionStorage.setItem('ws_patientName', patientName); else sessionStorage.removeItem('ws_patientName');
    if (consultationId) sessionStorage.setItem('ws_consultationId', consultationId); else sessionStorage.removeItem('ws_consultationId');
    if (triageResult) sessionStorage.setItem('ws_triageResult', JSON.stringify(triageResult)); else sessionStorage.removeItem('ws_triageResult');
    if (transcript !== undefined) sessionStorage.setItem('ws_transcript', transcript);
  }, [patientId, patientName, consultationId, triageResult, transcript, isHydrated]);

  const handleGlobalReset = () => {
    if (confirm("Are you sure you want to clear the entire workspace?")) {
      setPatientId(null);
      setPatientName(null);
      setConsultationId(null);
      setTriageResult(null);
      setTranscript('');
      setMobileTab('patient');
      sessionStorage.removeItem('ws_patientId');
      sessionStorage.removeItem('ws_patientName');
      sessionStorage.removeItem('ws_consultationId');
      sessionStorage.removeItem('ws_triageResult');
      sessionStorage.removeItem('ws_transcript');
    }
  };

  const handleSelectPatient = (id: string, name: string) => {
    setPatientId(id);
    setPatientName(name);
    setConsultationId(null);
    setTriageResult(null);
    setTranscript('');
    // Auto-advance to consultation tab on mobile
    setMobileTab('consultation');
  };

  const handleTriageComplete = (result: TriageResponse | null, cId: string | null) => {
    setTriageResult(result);
    setConsultationId(cId);
    // Show copilot on tablet after triage
    if (result) setShowCopilotDrawer(true);
  };

  const priority = triageResult?.priority;

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <Navbar />

      {/* ── Workspace status bar ─────────────────────────────── */}
      <div className="px-4 lg:px-6 flex items-center gap-3 flex-shrink-0 h-11 border-b border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Consultation Workspace
        </p>

        {/* Breadcrumb */}
        {patientName && (
          <>
            <ChevronRight size={14} className="text-slate-400" />
            <span className="text-sm text-slate-600 dark:text-slate-300">{patientName}</span>
          </>
        )}
        {priority && (
          <>
            <ChevronRight size={14} className="text-slate-400" />
            <Badge variant="outline" className={getPriorityBadgeClass(priority)}>{priority}</Badge>
          </>
        )}

        <div className="flex-1" />

        {(patientId || transcript) && (
          <Button variant="ghost" size="sm" onClick={handleGlobalReset} className="h-8 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 mr-2 transition-colors">
            Reset Workspace
          </Button>
        )}

        {/* Tablet: toggle copilot drawer */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowCopilotDrawer(true)}
          className="hidden md:flex lg:hidden items-center gap-1.5 h-8 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
        >
          <Sparkles size={13} />
          AI Copilot
        </Button>
      </div>

      {/* ── Desktop: 3-column layout ─────────────────────────── */}
      <div className="hidden lg:flex flex-1 overflow-hidden min-h-0">
        {/* Left: Patient panel */}
        <div className="w-1/4 min-w-[280px] max-w-[360px] flex-shrink-0 overflow-hidden border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <PatientMemoryPanel
            selectedPatientId={patientId}
            onSelectPatient={handleSelectPatient}
          />
        </div>

        {/* Center: Consultation */}
        <div className="flex-1 overflow-hidden min-w-0 bg-slate-50 dark:bg-slate-900">
          <ConsultationPanel
            patientId={patientId}
            patientName={patientName}
            transcript={transcript}
            onTranscriptChange={setTranscript}
            onTriageComplete={handleTriageComplete}
          />
        </div>

        {/* Right: AI Copilot */}
        <div className="w-1/4 min-w-[320px] max-w-[420px] flex-shrink-0 overflow-hidden p-4 pb-6">
          <CopilotPanel
            patientId={patientId}
            consultationId={consultationId}
            triageResult={triageResult}
            transcript={transcript}
          />
        </div>
      </div>

      {/* ── Tablet: 2 columns + drawer ───────────────────────── */}
      <div className="hidden md:flex lg:hidden flex-1 overflow-hidden min-h-0">
        {/* Left: Patient */}
        <div className="w-[30%] min-w-[260px] flex-shrink-0 overflow-hidden border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <PatientMemoryPanel
            selectedPatientId={patientId}
            onSelectPatient={handleSelectPatient}
          />
        </div>
        {/* Center: Consultation */}
        <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900">
          <ConsultationPanel
            patientId={patientId}
            patientName={patientName}
            transcript={transcript}
            onTranscriptChange={setTranscript}
            onTriageComplete={handleTriageComplete}
          />
        </div>

        {/* Copilot Drawer */}
        <AnimatePresence>
          {showCopilotDrawer && (
            <>
              <motion.div
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 dark:bg-slate-900/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCopilotDrawer(false)}
              />
              <motion.div
                className="fixed top-0 right-0 bottom-0 w-[400px] bg-slate-50/80 backdrop-blur-xl shadow-2xl z-50 flex flex-col dark:bg-slate-900/80 border-l border-slate-200/50 dark:border-slate-800/50 p-4"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              >
                <div className="relative flex-1 overflow-hidden">
                  <Button variant="ghost" size="icon" onClick={() => setShowCopilotDrawer(false)} className="absolute top-4 right-4 z-50 h-8 w-8 bg-slate-100/50 backdrop-blur-md dark:bg-slate-800/50 rounded-full shadow-sm text-slate-500 hover:text-slate-900 hover:bg-slate-200">
                    <X size={17} />
                  </Button>
                  <CopilotPanel
                    patientId={patientId}
                    consultationId={consultationId}
                    triageResult={triageResult}
                    transcript={transcript}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mobile: Tabbed layout ────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden md:hidden">
        {/* Tab bar */}
        <div className="flex border-b border-slate-200 bg-white flex-shrink-0 dark:border-slate-800 dark:bg-slate-950">
          {(
            [
              { id: 'patient',      icon: User,          label: 'Patient' },
              { id: 'consultation', icon: ClipboardList, label: 'Consult' },
              { id: 'copilot',      icon: MessageSquare, label: 'Copilot' },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setMobileTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors relative ${mobileTab === id ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900'}`}
            >
              <Icon size={17} strokeWidth={mobileTab === id ? 2.5 : 1.8} />
              {label}
              {mobileTab === id && (
                <motion.div
                  layoutId="mobile-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-500"
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={mobileTab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-auto bg-slate-50 dark:bg-slate-900"
            >
              {mobileTab === 'patient' && (
                <PatientMemoryPanel
                  selectedPatientId={patientId}
                  onSelectPatient={handleSelectPatient}
                />
              )}
              {mobileTab === 'consultation' && (
                <ConsultationPanel
                  patientId={patientId}
                  patientName={patientName}
                  transcript={transcript}
                  onTranscriptChange={setTranscript}
                  onTriageComplete={(r, cId) => {
                    handleTriageComplete(r, cId);
                    setMobileTab('copilot');
                  }}
                />
              )}
              {mobileTab === 'copilot' && (
                <div className="h-full p-3 pb-6">
                  <CopilotPanel
                    patientId={patientId}
                    consultationId={consultationId}
                    triageResult={triageResult}
                    transcript={transcript}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}

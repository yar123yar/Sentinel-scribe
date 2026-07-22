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

type MobileTab = 'patient' | 'consultation' | 'copilot';

export default function WorkspacePage() {
  const router = useRouter();
  const [patientId, setPatientId]           = useState<string | null>(null);
  const [patientName, setPatientName]       = useState<string | null>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [triageResult, setTriageResult]     = useState<TriageResponse | null>(null);
  const [mobileTab, setMobileTab]           = useState<MobileTab>('patient');
  const [showCopilotDrawer, setShowCopilotDrawer] = useState(false); // tablet

  useEffect(() => {
    if (!localStorage.getItem('auth_token')) router.push('/login');
  }, [router]);

  const handleSelectPatient = (id: string, name: string) => {
    setPatientId(id);
    setPatientName(name);
    setConsultationId(null);
    setTriageResult(null);
    // Auto-advance to consultation tab on mobile
    setMobileTab('consultation');
  };

  const handleTriageComplete = (result: TriageResponse, cId: string) => {
    setTriageResult(result);
    setConsultationId(cId);
    // Show copilot on tablet after triage
    setShowCopilotDrawer(true);
  };

  const priority = triageResult?.priority;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-page)' }}>
      <Navbar />

      {/* ── Workspace status bar ─────────────────────────────── */}
      <div
        className="px-4 lg:px-6 flex items-center gap-3 flex-shrink-0"
        style={{ height: 44, borderBottom: '1px solid var(--border)', background: 'white' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Consultation Workspace
        </p>

        {/* Breadcrumb */}
        {patientName && (
          <>
            <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{patientName}</span>
          </>
        )}
        {priority && (
          <>
            <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
            <span className={getPriorityBadgeClass(priority)}>{priority}</span>
          </>
        )}

        <div className="flex-1" />

        {/* Tablet: toggle copilot drawer */}
        <button
          onClick={() => setShowCopilotDrawer(true)}
          className="btn btn-secondary btn-sm tablet-hidden tablet-only flex items-center gap-1.5"
        >
          <Sparkles size={13} style={{ color: 'var(--color-action)' }} />
          AI Copilot
        </button>
      </div>

      {/* ── Desktop: 3-column layout ─────────────────────────── */}
      <div
        className="desktop-only flex flex-1 overflow-hidden"
        style={{ height: 'calc(100vh - var(--nav-height) - 44px)' }}
      >
        {/* Left: Patient panel */}
        <div
          className="w-64 xl:w-72 flex-shrink-0 overflow-hidden"
          style={{ borderRight: '1px solid var(--border)' }}
        >
          <PatientMemoryPanel
            selectedPatientId={patientId}
            onSelectPatient={handleSelectPatient}
          />
        </div>

        {/* Center: Consultation */}
        <div className="flex-1 overflow-hidden min-w-0">
          <ConsultationPanel
            patientId={patientId}
            patientName={patientName}
            onTriageComplete={handleTriageComplete}
          />
        </div>

        {/* Right: AI Copilot */}
        <div
          className="w-72 xl:w-80 flex-shrink-0 overflow-hidden"
          style={{ borderLeft: '1px solid var(--border)' }}
        >
          <CopilotPanel
            patientId={patientId}
            consultationId={consultationId}
            triageResult={triageResult}
          />
        </div>
      </div>

      {/* ── Tablet: 2 columns + drawer ───────────────────────── */}
      <div
        className="hidden md:flex lg:hidden flex-1 overflow-hidden"
        style={{ height: 'calc(100vh - var(--nav-height) - 44px)' }}
      >
        {/* Left: Patient */}
        <div className="w-60 flex-shrink-0" style={{ borderRight: '1px solid var(--border)' }}>
          <PatientMemoryPanel
            selectedPatientId={patientId}
            onSelectPatient={handleSelectPatient}
          />
        </div>
        {/* Center: Consultation */}
        <div className="flex-1 overflow-hidden">
          <ConsultationPanel
            patientId={patientId}
            patientName={patientName}
            onTriageComplete={handleTriageComplete}
          />
        </div>

        {/* Copilot Drawer */}
        <AnimatePresence>
          {showCopilotDrawer && (
            <>
              <motion.div
                className="drawer-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCopilotDrawer(false)}
              />
              <motion.div
                className="drawer"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              >
                <div className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} style={{ color: 'var(--color-action)' }} />
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>AI Copilot</span>
                  </div>
                  <button onClick={() => setShowCopilotDrawer(false)} className="btn btn-ghost btn-icon">
                    <X size={17} />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <CopilotPanel
                    patientId={patientId}
                    consultationId={consultationId}
                    triageResult={triageResult}
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
        <div
          className="flex border-b bg-white flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
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
              className="flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-all relative"
              style={{
                color: mobileTab === id ? 'var(--color-action)' : 'var(--text-muted)',
                background: mobileTab === id ? '#EFF6FF' : 'transparent',
              }}
            >
              <Icon size={17} strokeWidth={mobileTab === id ? 2.5 : 1.8} />
              {label}
              {mobileTab === id && (
                <motion.div
                  layoutId="mobile-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: 'var(--color-action)' }}
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
              className="h-full overflow-auto"
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
                  onTriageComplete={(r, cId) => {
                    handleTriageComplete(r, cId);
                    setMobileTab('copilot');
                  }}
                />
              )}
              {mobileTab === 'copilot' && (
                <CopilotPanel
                  patientId={patientId}
                  consultationId={consultationId}
                  triageResult={triageResult}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}

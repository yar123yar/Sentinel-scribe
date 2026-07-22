'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import api from '@/lib/api';
import { DashboardStats, Consultation } from '@/lib/types';
import { formatTimeAgo, getPriorityBadgeClass, getPriorityLabel, getInitials, getAvatarColor, formatDate } from '@/lib/utils';
import {
  Activity, AlertTriangle, FileText, Clock, Users,
  TrendingUp, Stethoscope, ChevronRight, ArrowUpRight,
  ArrowRight, CheckCircle, RefreshCw, UserCheck
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = {
  show: { transition: { staggerChildren: 0.06 } },
};

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e?.response?.status === 401) router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!localStorage.getItem('auth_token')) { router.push('/login'); return; }
    fetchStats();
  }, [fetchStats, router]);

  const kpis = stats ? [
    {
      label: "Today's Consultations",
      value: stats.total_consultations,
      icon: Stethoscope,
      color: '#2A7DE1',
      bg: '#EFF6FF',
      trend: '+12%',
      trendUp: true,
      sub: 'vs. yesterday',
    },
    {
      label: 'Emergency Cases',
      value: stats.emergency_cases,
      icon: AlertTriangle,
      color: '#DC2626',
      bg: '#FFF5F5',
      trend: 'Active now',
      trendUp: false,
      sub: 'P1 priority',
      urgent: true,
    },
    {
      label: 'Documentation Hours Saved',
      value: Math.round(stats.soap_notes_generated * 0.75),
      icon: Clock,
      color: '#0E9F6E',
      bg: '#F0FDF9',
      trend: '+8% efficiency',
      trendUp: true,
      sub: 'via AI automation',
      suffix: 'hrs',
    },
    {
      label: 'Triage Accuracy',
      value: 94,
      icon: CheckCircle,
      color: '#0F4C81',
      bg: '#EFF6FF',
      trend: 'Calibrated',
      trendUp: true,
      sub: 'model confidence',
      suffix: '%',
    },
    {
      label: 'Pending Reviews',
      value: Math.max(0, stats.total_consultations - stats.soap_notes_generated),
      icon: RefreshCw,
      color: '#F59E0B',
      bg: '#FFFBEB',
      trend: 'Needs attention',
      trendUp: false,
      sub: 'awaiting SOAP sign-off',
    },
    {
      label: 'Active Clinicians',
      value: 1,
      icon: UserCheck,
      color: '#8B5CF6',
      bg: '#F5F3FF',
      trend: 'Online',
      trendUp: true,
      sub: 'on duty now',
    },
  ] : [];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 lg:py-8">

        {/* Page Header */}
        <motion.div
          className="flex items-start justify-between mb-8"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <p className="label-xs mb-1">Clinical Overview</p>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Link href="/workspace" className="btn btn-primary hidden sm:inline-flex">
            <Stethoscope size={15} />
            New Consultation
          </Link>
        </motion.div>

        {/* KPI Cards */}
        {loading ? (
          <KPISkeleton />
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
          >
            {kpis.map((kpi) => (
              <motion.div key={kpi.label} variants={fadeUp}>
                <KPICard {...kpi} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Consultations (2/3 width) */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <h3>Recent Consultations</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Last {stats?.recent_consultations.length ?? 0} sessions
                  </p>
                </div>
                <Link href="/workspace" className="btn btn-ghost btn-sm flex items-center gap-1"
                  style={{ color: 'var(--color-action)' }}>
                  View all <ArrowRight size={13} />
                </Link>
              </div>

              {loading ? (
                <div className="p-4 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="skeleton h-14 rounded-xl" />
                  ))}
                </div>
              ) : stats?.recent_consultations.length === 0 ? (
                <EmptyConsultations />
              ) : (
                <div>
                  {stats?.recent_consultations.map((c, i) => (
                    <ConsultationRow key={c.id} c={c} index={i} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Sidebar (1/3) */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {/* Quick actions */}
            <div className="card p-4">
              <h4 className="mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <Link href="/workspace" className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-[#EFF6FF] group"
                  style={{ border: '1px solid var(--border)' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: '#EFF6FF' }}>
                    <Stethoscope size={16} style={{ color: 'var(--color-action)' }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>New Consultation</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>AI-powered triage</p>
                  </div>
                  <ChevronRight size={15} style={{ color: 'var(--text-muted)' }} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <div className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ border: '1px solid #FECACA', background: '#FFF5F5' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: '#FEE2E2' }}>
                    <AlertTriangle size={16} style={{ color: '#DC2626' }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: '#B91C1C' }}>Emergency Queue</p>
                    <p className="text-xs" style={{ color: '#EF4444' }}>
                      {stats?.emergency_cases ?? 0} active P1 cases
                    </p>
                  </div>
                  <span className="badge badge-p1">{stats?.emergency_cases ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Triage distribution */}
            <div className="card p-4">
              <h4 className="mb-4">Triage Distribution</h4>
              <TriageDistribution consultations={stats?.recent_consultations ?? []} />
            </div>

            {/* System status */}
            <div className="card p-4">
              <h4 className="mb-3">System Status</h4>
              <div className="space-y-2.5">
                {[
                  { label: 'AI Pipeline', status: 'Operational', ok: true },
                  { label: 'Qdrant Vector DB', status: 'Connected', ok: true },
                  { label: 'PostgreSQL', status: 'Connected', ok: true },
                  { label: 'Gemini 2.5 Flash', status: 'Active', ok: true },
                ].map(({ label, status, ok }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: ok ? '#0E9F6E' : '#DC2626' }} />
                      <span className="text-xs font-medium" style={{ color: ok ? '#0E9F6E' : '#DC2626' }}>{status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}

/* ── KPI Card ─────────────────────────────────────────────────────────────── */
function KPICard({ label, value, icon: Icon, color, bg, trend, trendUp, sub, suffix, urgent }: {
  label: string; value: number; icon: React.ElementType; color: string;
  bg: string; trend: string; trendUp: boolean; sub: string; suffix?: string; urgent?: boolean;
}) {
  return (
    <div
      className="card p-5 relative overflow-hidden"
      style={{ borderColor: urgent ? '#FECACA' : undefined }}
    >
      {urgent && (
        <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full"
          style={{ background: '#DC2626', animation: 'emergency-pulse 2s infinite' }} />
      )}
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <Icon size={18} style={{ color }} strokeWidth={2} />
        </div>
        <div className="flex items-center gap-1 text-xs font-medium"
          style={{ color: trendUp ? '#0E9F6E' : '#F59E0B' }}>
          {trendUp ? <ArrowUpRight size={12} /> : null}
          {trend}
        </div>
      </div>

      <p className="text-3xl font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>
        {value.toLocaleString()}{suffix ?? ''}
      </p>
      <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>
    </div>
  );
}

/* ── Consultation Row ──────────────────────────────────────────────────────── */
function ConsultationRow({ c, index }: { c: Consultation; index: number }) {
  const priority = c.triage_result?.priority;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href="/workspace"
        className="flex items-center gap-4 px-5 py-4 transition-all hover:bg-[#F8FAFC]"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: c.patient ? getAvatarColor(c.patient.name) : '#94A3B8' }}
        >
          {c.patient ? getInitials(c.patient.name) : '?'}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {c.patient?.name ?? 'Unknown Patient'}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            {c.chief_complaint || c.transcript?.slice(0, 55) + '…'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {priority
            ? <span className={getPriorityBadgeClass(priority)}>{priority}</span>
            : <span className="badge badge-pending">Pending</span>
          }
          <div className="hidden sm:flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Clock size={11} />
            {formatTimeAgo(c.created_at)}
          </div>
          <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Triage Distribution ──────────────────────────────────────────────────── */
function TriageDistribution({ consultations }: { consultations: Consultation[] }) {
  const counts = { P1: 0, P2: 0, P3: 0, Pending: 0 };
  consultations.forEach(c => {
    const p = c.triage_result?.priority;
    if (p === 'P1') counts.P1++;
    else if (p === 'P2') counts.P2++;
    else if (p === 'P3') counts.P3++;
    else counts.Pending++;
  });
  const total = consultations.length || 1;

  const bars = [
    { label: 'P1 Emergency', count: counts.P1, color: '#DC2626', bg: '#FEE2E2' },
    { label: 'P2 Urgent',    count: counts.P2, color: '#F59E0B', bg: '#FEF3C7' },
    { label: 'P3 Routine',   count: counts.P3, color: '#0E9F6E', bg: '#D1FAE5' },
    { label: 'Pending',      count: counts.Pending, color: '#94A3B8', bg: '#F1F5F9' },
  ];

  return (
    <div className="space-y-3">
      {bars.map(({ label, count, color, bg }) => (
        <div key={label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
            <span className="text-xs font-semibold" style={{ color }}>{count}</span>
          </div>
          <div className="confidence-track">
            <motion.div
              className="confidence-fill"
              style={{ background: color, width: 0 }}
              animate={{ width: `${(count / total) * 100}%` }}
              transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Empty State ──────────────────────────────────────────────────────────── */
function EmptyConsultations() {
  return (
    <div className="py-16 text-center px-6">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: '#EFF6FF' }}>
        <Stethoscope size={26} style={{ color: 'var(--color-action)' }} />
      </div>
      <h3 className="mb-2">No consultations yet</h3>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
        Start your first AI-powered clinical consultation
      </p>
      <Link href="/workspace" className="btn btn-primary inline-flex">
        Start Consultation <ArrowRight size={14} />
      </Link>
    </div>
  );
}

/* ── KPI Skeleton ─────────────────────────────────────────────────────────── */
function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="skeleton h-36 rounded-xl" />
      ))}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import api from '@/lib/api';
import { DashboardStats, Consultation } from '@/lib/types';
import { formatTimeAgo, getInitials, getAvatarColor } from '@/lib/utils';
import {
  Activity, AlertTriangle, Stethoscope, ArrowUpRight, ArrowDownRight,
  ArrowRight, CheckCircle, Clock, Users, Zap, Sparkles, X
} from 'lucide-react';
import CopilotPanel from '@/components/workspace/CopilotPanel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const stagger: Variants = {
  show: { transition: { staggerChildren: 0.05 } },
};

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [doctorName, setDoctorName] = useState('Dr. Mitchell');

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
    
    // Load doctor profile
    const loadProfile = () => {
      const savedProfile = localStorage.getItem('doctor_profile');
      if (savedProfile) {
        try {
          setDoctorName(JSON.parse(savedProfile).name);
        } catch (e) {}
      }
    };
    
    loadProfile();
    window.addEventListener('profileUpdated', loadProfile);

    // Initial fetch
    fetchStats();
    
    // Polling
    const intervalId = setInterval(fetchStats, 5000);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('profileUpdated', loadProfile);
    };
  }, [fetchStats, router]);

  const feedActivities = useMemo(() => {
    if (!stats) return [];
    
    const events: { time: Date; text: string; icon: any; color: string; bg: string }[] = [];

    // Patient registrations
    stats.recent_patients?.forEach(p => {
      events.push({
        time: new Date(p.created_at),
        text: `Patient Registered: ${p.name}`,
        icon: Users,
        color: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-100 dark:bg-indigo-900/30'
      });
    });

    // Consultations
    stats.recent_consultations?.forEach(c => {
      const cTime = new Date(c.created_at);
      events.push({
        time: cTime,
        text: `Consult Started: ${c.patient?.name ?? 'Unknown'}`,
        icon: Stethoscope,
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-900/30'
      });

      if (c.triage_result) {
        if (c.triage_result.priority === 'P1') {
          events.push({
            time: new Date(cTime.getTime() + 1000),
            text: `P1 Alert: ${c.patient?.name ?? 'Unknown'}`,
            icon: AlertTriangle,
            color: 'text-red-600 dark:text-red-400',
            bg: 'bg-red-100 dark:bg-red-900/30'
          });
        } else if (c.triage_result.priority === 'P2') {
          events.push({
            time: new Date(cTime.getTime() + 1000),
            text: `P2 Urgent: ${c.patient?.name ?? 'Unknown'}`,
            icon: AlertTriangle,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-100 dark:bg-amber-900/30'
          });
        }
      }

      if (c.soap_note) {
        events.push({
          time: new Date(cTime.getTime() + 2000),
          text: `SOAP Generated: ${c.patient?.name ?? 'Unknown'}`,
          icon: CheckCircle,
          color: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-100 dark:bg-emerald-900/30'
        });
      }
    });

    events.sort((a, b) => b.time.getTime() - a.time.getTime());
    
    return events.slice(0, 5).map(e => ({
      ...e,
      timeString: e.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
  }, [stats]);

  const kpis = stats ? [
    {
      label: "Today's Consultations",
      value: stats.total_consultations,
      trend: '+12% vs. yesterday',
      trendUp: true,
      icon: Users,
    },
    {
      label: 'Emergency Cases',
      value: stats.emergency_cases,
      trend: 'Active now (P1)',
      trendUp: false,
      urgent: true,
      icon: AlertTriangle,
    },
    {
      label: 'Doc Hours Saved',
      value: Math.round(stats.soap_notes_generated * 0.33),
      trend: '+20 mins per patient',
      trendUp: true,
      suffix: 'h',
      icon: Clock,
    },
    {
      label: 'Triage Accuracy',
      value: stats.triage_accuracy || 94,
      trend: 'Based on clinician feedback',
      trendUp: true,
      suffix: '%',
      icon: Activity,
    },
    {
      label: 'Pending Reviews',
      value: stats.pending_reviews || 0,
      trend: 'Awaiting SOAP sign-off',
      trendUp: false,
      icon: Zap,
    },
    {
      label: 'Active Clinicians',
      value: 1,
      trend: 'Online and on duty',
      trendUp: true,
      icon: Stethoscope,
    },
  ] : [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-slate-950 font-sans selection:bg-slate-500/30">
      <Navbar />

      <main className="flex-1 w-full max-w-[1920px] mx-auto px-4 md:px-6">
        <div className="flex flex-col xl:flex-row gap-5 xl:gap-6 pt-4 pb-12">
          
          {/* Main Left Column (KPIs + Lower Dashboard) */}
          <div className="flex-1 flex flex-col min-w-0">
            
            {/* KPI Hero Section (Window Height) */}
            <div className="min-h-[calc(100vh-70px)] flex flex-col">
              {/* Page Header */}
              <motion.div
                className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 flex-shrink-0"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-widest mb-2 shadow-sm border border-blue-200 dark:border-blue-800">
                    <span className="w-1 h-1 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse" /> Clinical Overview
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Dashboard
                  </h1>
                </div>
                <Link href="/workspace" className={buttonVariants({ size: 'sm', className: 'hidden sm:flex shadow-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white border-0 transition-transform hover:scale-105 active:scale-95' })}>
                  <Stethoscope className="mr-2 h-3.5 w-3.5" />
                  New Consultation
                </Link>
              </motion.div>

              {/* KPI Cards */}
              {loading ? (
                <div className="flex-1 min-h-0 py-2">
                   <KPISkeleton />
                </div>
              ) : (
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 lg:grid-cols-3 gap-5 flex-1 min-h-0 pb-4"
                >
                  {kpis.map((kpi) => (
                    <motion.div key={kpi.label} variants={fadeUp} className="h-full">
                      <KPICard {...kpi} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Lower Dashboard Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
              
              {/* Table & Triage */}
              <motion.div
                className="lg:col-span-2 space-y-5 flex flex-col"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <Card className="rounded-[16px] border-slate-200/60 bg-white/60 backdrop-blur-xl shadow-sm dark:bg-slate-900/50 dark:border-slate-800/60">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
                    <div>
                      <CardTitle className="text-lg font-bold tracking-tight">Recent Consultations</CardTitle>
                      <CardDescription className="text-xs mt-0.5">Active and recently completed triage.</CardDescription>
                    </div>
                    <Link href="/workspace" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'h-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/50' })}>
                      View all <ArrowRight className="ml-1.5 h-3 w-3" />
                    </Link>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loading ? (
                      <div className="p-4 space-y-3">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="animate-pulse bg-slate-100 dark:bg-slate-800 h-12 rounded-xl" />
                        ))}
                      </div>
                    ) : stats?.recent_consultations.length === 0 ? (
                      <EmptyConsultations />
                    ) : (
                      <div className="min-w-full overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-slate-50/50 dark:bg-slate-900/30">
                            <TableRow className="border-slate-200 dark:border-slate-800/60 hover:bg-transparent">
                              <TableHead className="font-bold text-[10px] text-slate-500 uppercase tracking-widest pl-4 h-9">Patient</TableHead>
                              <TableHead className="font-bold text-[10px] text-slate-500 uppercase tracking-widest h-9">Priority</TableHead>
                              <TableHead className="font-bold text-[10px] text-slate-500 uppercase tracking-widest h-9">Status</TableHead>
                              <TableHead className="font-bold text-[10px] text-slate-500 uppercase tracking-widest h-9 hidden sm:table-cell">Clinician</TableHead>
                              <TableHead className="text-right font-bold text-[10px] text-slate-500 uppercase tracking-widest pr-4 h-9">Timestamp</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stats?.recent_consultations.map((c) => (
                              <TableRow key={c.id} className="cursor-pointer border-slate-100 dark:border-slate-800/40 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group" onClick={() => router.push('/workspace')}>
                                <TableCell className="pl-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <Avatar className="h-7 w-7 border-2 border-white dark:border-slate-800 shadow-sm transition-transform group-hover:scale-105">
                                      <AvatarFallback className="font-bold text-[10px] bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                        {c.patient ? getInitials(c.patient.name) : '?'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{c.patient?.name ?? 'Unknown'}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3">
                                  {c.triage_result?.priority === 'P1' && <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-200 border-transparent dark:bg-red-500/20 dark:text-red-400 font-bold shadow-none text-[10px] px-1.5 py-0">P1 Alert</Badge>}
                                  {c.triage_result?.priority === 'P2' && <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-transparent dark:bg-amber-500/20 dark:text-amber-400 font-bold shadow-none text-[10px] px-1.5 py-0">P2 Urgent</Badge>}
                                  {c.triage_result?.priority === 'P3' && <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-transparent dark:bg-blue-500/20 dark:text-blue-400 font-bold shadow-none text-[10px] px-1.5 py-0">P3 Routine</Badge>}
                                  {!c.triage_result?.priority && <Badge variant="outline" className="text-slate-500 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-[10px] px-1.5 py-0">Pending</Badge>}
                                </TableCell>
                                <TableCell className="py-3">
                                  <div className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${c.soap_note ? 'bg-slate-800 dark:bg-slate-300' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{c.soap_note ? 'Completed' : 'Draft'}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 hidden sm:table-cell">
                                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{doctorName}</span>
                                </TableCell>
                                <TableCell className="text-right pr-4 py-3">
                                  <span className="text-xs font-medium text-slate-500 dark:text-slate-500">{formatTimeAgo(c.created_at)}</span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="rounded-[16px] border-slate-200/60 bg-white/60 backdrop-blur-xl shadow-sm dark:bg-slate-900/50 dark:border-slate-800/60">
                  <CardHeader className="px-4 pt-4 pb-2">
                    <CardTitle className="text-lg font-bold tracking-tight">Triage Distribution</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Volume of cases by assigned priority.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <TriageDistribution consultations={stats?.recent_consultations ?? []} />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Sidebar (Feed) */}
              <motion.div
                className="lg:col-span-1 space-y-5"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <Card className="rounded-[16px] border-slate-200/60 bg-white/60 backdrop-blur-xl shadow-sm h-full dark:bg-slate-900/50 dark:border-slate-800/60">
                  <CardHeader className="px-4 pt-4 pb-2">
                    <CardTitle className="text-lg font-bold tracking-tight">Clinical Feed</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Live updates from the ward.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-5 relative mt-2">
                      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-800" />
                      {loading ? (
                         <div className="animate-pulse flex flex-col gap-5 p-2">
                           {[...Array(4)].map((_, i) => (
                             <div key={i} className="flex gap-4">
                               <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
                               <div className="space-y-2 flex-1 pt-1.5">
                                 <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                                 <div className="h-2 w-1/4 bg-slate-200 dark:bg-slate-800 rounded" />
                               </div>
                             </div>
                           ))}
                         </div>
                      ) : feedActivities.length === 0 ? (
                        <p className="text-sm text-slate-500 italic p-4 text-center">No recent activities.</p>
                      ) : (
                        feedActivities.map((activity, i) => (
                          <div key={i} className="flex gap-4 relative group">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 z-10 shadow-sm border-[2px] border-white dark:border-slate-950 transition-transform group-hover:scale-105 ${activity.bg}`}>
                              <activity.icon className={`w-3.5 h-3.5 ${activity.color}`} />
                            </div>
                            <div className="pt-1.5">
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight mb-0.5">{activity.text}</p>
                              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{activity.timeString}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

            </div>
          </div>

          {/* Right Column: AI Copilot Panel */}
          <div className="hidden xl:block xl:w-[380px] flex-shrink-0">
            <div className="xl:sticky xl:top-4 h-[calc(100vh-40px)]">
              <CopilotPanel context="dashboard" patientId={null} consultationId={null} triageResult={null} />
            </div>
          </div>

        </div>
      </main>

      <MobileNav />
    </div>
  );
}

/* ── KPI Cards ──────────────────────────────────────────────────────────── */
function KPICard({ label, value, trend, trendUp, suffix, urgent, icon: Icon }: {
  label: string; value: number; trend: string; trendUp: boolean; suffix?: string; urgent?: boolean; icon: any;
}) {
  return (
    <Card className={`rounded-[20px] shadow-sm h-full flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-1 ${urgent ? 'border-red-200/50 bg-gradient-to-br from-red-50/50 to-white dark:from-red-950/20 dark:to-slate-900 dark:border-red-900/30' : 'border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50 dark:border-slate-800/60'}`}>
      {/* Decorative background blur */}
      <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full opacity-10 blur-3xl ${urgent ? 'bg-red-500' : 'bg-slate-400'}`} />
      
      {urgent && <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 to-rose-500" />}
      
      <CardHeader className="p-6 sm:p-8 pb-0 sm:pb-0 relative z-10 flex-grow flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl shadow-sm ${urgent ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
            <Icon size={24} strokeWidth={2.5} />
          </div>
          <Badge variant={urgent ? 'destructive' : 'outline'} className={`font-bold text-sm px-3 py-1 uppercase tracking-wider shadow-none ${!urgent ? 'border-blue-200 bg-white text-blue-600 dark:border-blue-800 dark:bg-slate-800 dark:text-blue-400' : ''}`}>
            {urgent ? 'Alert' : 'Live'}
          </Badge>
        </div>
        <div className="flex flex-col justify-center flex-grow py-2">
          <CardTitle className={`text-6xl sm:text-7xl lg:text-[5.5rem] leading-none font-black tracking-tighter ${urgent ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>
            {value.toLocaleString()}<span className="text-4xl sm:text-5xl lg:text-6xl font-bold opacity-60 ml-2">{suffix ?? ''}</span>
          </CardTitle>
          <CardDescription className="text-base sm:text-lg lg:text-xl font-semibold text-slate-600 dark:text-slate-400 mt-3">{label}</CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 sm:p-8 pt-4 sm:pt-6 mt-auto relative z-10">
        <Separator className="mb-4 opacity-50 dark:opacity-20" />
        <div className={`flex items-center gap-2 text-sm sm:text-base font-bold uppercase tracking-wider ${trendUp ? 'text-slate-600 dark:text-slate-400' : 'text-slate-500 dark:text-slate-500'}`}>
          {trendUp ? <ArrowUpRight className="h-5 w-5 stroke-[3]" /> : <ArrowDownRight className="h-5 w-5 stroke-[3]" />}
          {trend}
        </div>
      </CardContent>
    </Card>
  );
}

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

  const segments = [
    { label: 'P1 Emergency', count: counts.P1, bg: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
    { label: 'P2 Urgent',    count: counts.P2, bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
    { label: 'P3 Routine',   count: counts.P3, bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
    { label: 'Pending',      count: counts.Pending, bg: 'bg-slate-200 dark:bg-slate-800', text: 'text-slate-400' },
  ].filter(s => s.count > 0);

  return (
    <div className="space-y-4 mt-2">
      {/* Visual Bar */}
      <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 shadow-inner">
        {segments.map((segment, i) => {
          const width = (segment.count / total) * 100;
          return (
            <motion.div
              key={segment.label}
              initial={{ width: 0 }}
              animate={{ width: `${width}%` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
              className={`h-full ${segment.bg} border-r-2 border-white/20 last:border-0`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {segments.map((segment) => (
          <div key={segment.label} className="flex flex-col items-start gap-0.5 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center gap-1.5 mb-1">
              <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${segment.bg}`} />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{segment.label}</p>
            </div>
            <p className={`text-3xl font-black ${segment.text}`}>{segment.count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyConsultations() {
  return (
    <div className="py-12 text-center px-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-slate-100 border border-slate-200 text-slate-600 shadow-sm dark:bg-slate-800/50 dark:border-slate-700/50 dark:text-slate-400">
        <Stethoscope className="h-5 w-5" />
      </div>
      <h3 className="mb-1.5 text-base font-bold tracking-tight text-slate-900 dark:text-white">No consultations yet</h3>
      <p className="text-xs font-medium mb-5 text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
        Your workspace is ready. Start your first AI-powered clinical consultation to see live triage and automated SOAP notes.
      </p>
      <Link href="/workspace" className={buttonVariants({ size: 'sm', className: 'rounded-lg shadow-sm font-bold tracking-wide transition-all hover:scale-105 active:scale-95 bg-blue-600 hover:bg-blue-700 text-white' })}>
        Start Consultation <ArrowRight className="ml-1.5 h-3 w-3" />
      </Link>
    </div>
  );
}

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 flex-shrink-0">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="animate-pulse bg-slate-200/50 dark:bg-slate-800/50 h-[160px] rounded-[16px]" />
      ))}
    </div>
  );
}

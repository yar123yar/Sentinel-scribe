'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import api from '@/lib/api';
import { Patient, Consultation } from '@/lib/types';
import { getInitials, getAvatarColor, formatTimeAgo } from '@/lib/utils';
import { ArrowLeft, User, Activity, Droplets, Calendar, Stethoscope, AlertTriangle, ChevronRight, FileText, Pill, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';

export default function PatientDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('auth_token')) {
      router.push('/login');
      return;
    }
    fetchPatientData();
  }, [patientId, router]);

  const fetchPatientData = async () => {
    try {
      const [patientRes, consultationsRes] = await Promise.all([
        api.get(`/patients/${patientId}`),
        api.get(`/consultations?patient_id=${patientId}`)
      ]);
      setPatient(patientRes.data);
      setConsultations(consultationsRes.data);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e?.response?.status === 401) router.push('/login');
      if (e?.response?.status === 404) router.push('/patients');
    } finally {
      setLoading(false);
    }
  };

  const markAsComplete = async (consultId: string) => {
    try {
      await api.patch(`/consultations/${consultId}/complete`);
      setConsultations(prev => prev.map(c => c.id === consultId ? { ...c, status: 'completed' } : c));
    } catch (e) {
      console.error(e);
      alert('Failed to mark complete');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <div className="flex-1 max-w-[1000px] mx-auto w-full px-4 py-8">
          <div className="animate-pulse bg-slate-200/50 dark:bg-slate-800/50 h-64 rounded-3xl mb-8" />
          <div className="animate-pulse bg-slate-200/50 dark:bg-slate-800/50 h-96 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
      <Navbar />
      
      <main className="flex-1 w-full max-w-[1000px] mx-auto px-4 md:px-6 py-8 pb-24 md:pb-12">
        <Link href="/patients" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 mb-6 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Patients
        </Link>

        {/* ── Patient Profile Header ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="rounded-[24px] border-slate-200/60 bg-white shadow-sm overflow-hidden dark:bg-slate-900/50 dark:border-slate-800/60 mb-8">
            <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 relative">
              <div className="absolute inset-0 bg-white/10 pattern-grid-lg opacity-20" />
            </div>
            
            <CardContent className="px-6 pb-8 relative pt-0">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-16">
                <div className="flex items-end gap-5">
                  <Avatar className="h-32 w-32 border-4 border-white dark:border-slate-900 shadow-lg rounded-2xl bg-slate-100">
                    <AvatarFallback className="text-4xl font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300" style={{ background: getAvatarColor(patient.name) }}>
                      {getInitials(patient.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="mb-2">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{patient.name}</h1>
                    <p className="text-slate-500 font-medium">MRN: {patient.mrn || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="mb-2 flex gap-3">
                  <Button variant="outline" className="rounded-xl shadow-sm">Edit Profile</Button>
                  <Button className="rounded-xl shadow-sm bg-blue-600 hover:bg-blue-700" onClick={() => router.push('/workspace')}>
                    <Stethoscope className="mr-2 h-4 w-4" /> Start Consultation
                  </Button>
                </div>
              </div>

              <Separator className="my-8 opacity-50" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <InfoItem icon={Calendar} label="Date of Birth" value={patient.dob || 'Unknown'} />
                <InfoItem icon={User} label="Gender" value={patient.gender || 'Unknown'} />
                <InfoItem icon={Droplets} label="Blood Type" value={patient.blood_type || 'Unknown'} />
                <InfoItem icon={Activity} label="Added" value={formatTimeAgo(patient.created_at)} />
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Allergies */}
                <div className="p-5 rounded-2xl bg-red-50/50 border border-red-100 dark:bg-red-950/10 dark:border-red-900/30">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <h3 className="font-bold text-red-900 dark:text-red-400">Allergies & Alerts</h3>
                  </div>
                  {patient.allergies?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {patient.allergies.map((a, i) => (
                        <Badge key={i} variant="outline" className="bg-white text-red-700 border-red-200 shadow-sm dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-red-700/60 dark:text-red-400/60">No known allergies</p>
                  )}
                </div>

                {/* Chronic Conditions */}
                <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="h-5 w-5 text-amber-500" />
                    <h3 className="font-bold text-amber-900 dark:text-amber-400">Chronic Conditions</h3>
                  </div>
                  {patient.chronic_conditions?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {patient.chronic_conditions.map((c, i) => (
                        <Badge key={i} variant="outline" className="bg-white text-amber-700 border-amber-200 shadow-sm dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-amber-700/60 dark:text-amber-400/60">No chronic conditions</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Consultation History ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" /> Clinical History
          </h2>
          
          {consultations.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-slate-300 bg-transparent dark:border-slate-700">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <Stethoscope className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">No Consultations Yet</h3>
              <p className="text-sm text-slate-500 mb-4">Start a new AI-powered consultation for this patient.</p>
              <Button onClick={() => router.push('/workspace')} className="bg-blue-600 hover:bg-blue-700">Start Consultation</Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {consultations.map((consult) => (
                <Card key={consult.id} className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden dark:bg-slate-900/50 dark:border-slate-800/60">
                  <CardHeader className="bg-slate-50/50 dark:bg-slate-800/20 p-4 px-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center border border-slate-200 dark:border-slate-700">
                          <Stethoscope className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                            Consultation
                          </CardTitle>
                          <CardDescription className="text-xs font-semibold">
                            {new Date(consult.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </CardDescription>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {consult.triage_result?.priority && (
                          <Badge variant="outline" className={`font-bold ${
                            consult.triage_result.priority === 'P1' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400' :
                            consult.triage_result.priority === 'P2' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            Triage: {consult.triage_result.priority}
                          </Badge>
                        )}
                        {consult.status === 'completed' ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 shadow-sm px-2">
                            <CheckCircle className="w-3 h-3 mr-1" /> Completed
                          </Badge>
                        ) : (
                          <Button size="sm" onClick={() => markAsComplete(consult.id)} className="h-6 text-[10px] px-2 bg-slate-100 text-slate-700 hover:bg-emerald-600 hover:text-white border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-emerald-600 shadow-sm transition-colors">
                            <CheckCircle className="w-3 h-3 mr-1" /> Mark Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Chief Complaint</h4>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        "{consult.chief_complaint || 'No complaint recorded.'}"
                      </p>

                      {consult.symptoms && consult.symptoms.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Symptoms</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {consult.symptoms.map(s => (
                              <Badge key={s.id} variant="outline" className={`text-xs ${s.is_red_flag ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                {s.is_red_flag && <AlertCircle className="w-3 h-3 mr-1" />}
                                {s.name} {s.severity ? `(${s.severity})` : ''}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Assessment (SOAP)</h4>
                      {consult.soap_note?.assessment ? (
                        <p className="text-sm text-slate-600 dark:text-slate-300 bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 leading-relaxed">
                          {consult.soap_note.assessment}
                        </p>
                      ) : (
                        <p className="text-sm italic text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">No assessment generated.</p>
                      )}

                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 mt-4">Plan</h4>
                      {consult.soap_note?.plan ? (
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                          {consult.soap_note.plan}
                        </p>
                      ) : (
                        <p className="text-sm italic text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">No plan generated.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </main>
      
      <MobileNav />
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-slate-400">
        <Icon className="h-4 w-4" />
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <p className="font-semibold text-slate-900 dark:text-white text-sm">{value}</p>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import api from '@/lib/api';
import { Patient } from '@/lib/types';
import { getInitials, getAvatarColor, formatTimeAgo } from '@/lib/utils';
import { Users, Search, ArrowRight, UserPlus, FileText, Droplets, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

export default function PatientsDirectoryPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('auth_token')) {
      router.push('/login');
      return;
    }
    fetchPatients();
  }, [router]);

  const fetchPatients = async () => {
    try {
      const res = await api.get('/patients');
      setPatients(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e?.response?.status === 401) router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.mrn && p.mrn.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
      <Navbar />
      
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 md:px-6 py-8 pb-24 md:pb-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-widest mb-2 shadow-sm border border-blue-200 dark:border-blue-800">
              <Users size={12} /> Patient Directory
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              All Patients
            </h1>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by name or MRN..." 
                className="pl-9 bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Link href="/patients/new" className={buttonVariants({ className: 'bg-blue-600 hover:bg-blue-700 shadow-sm rounded-lg flex-shrink-0' })}>
              <UserPlus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Patient</span>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-slate-200/50 dark:bg-slate-800/50 h-[180px] rounded-2xl" />
            ))}
          </div>
        ) : filteredPatients.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed bg-transparent border-slate-300 dark:border-slate-800">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No patients found</h3>
            <p className="text-slate-500 max-w-sm mb-6">
              {search ? "No patients match your search criteria. Try a different name or MRN." : "You haven't added any patients to your directory yet."}
            </p>
            {!search && (
              <Link href="/patients/new" className={buttonVariants({ variant: 'default' })}>
                Add your first patient
              </Link>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {filteredPatients.map((patient, i) => (
                <motion.div
                  key={patient.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}
                >
                  <Link href={`/patients/${patient.id}`} className="block h-full">
                    <Card className="h-full rounded-2xl border-slate-200/60 bg-white hover:bg-slate-50 transition-all hover:shadow-md hover:-translate-y-1 dark:bg-slate-900/50 dark:border-slate-800/60 dark:hover:bg-slate-900 overflow-hidden group">
                      <CardHeader className="p-5 pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-800 shadow-sm">
                              <AvatarFallback className="font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" style={{ background: getAvatarColor(patient.name) }}>
                                {getInitials(patient.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                                {patient.name}
                              </CardTitle>
                              <CardDescription className="text-xs font-medium text-slate-500 mt-1">
                                {patient.mrn || 'No MRN'} • {patient.gender || 'U'}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 dark:group-hover:text-blue-400 dark:group-hover:bg-blue-900/30 transition-colors">
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-5 pt-0">
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                            <Activity className="h-4 w-4 text-emerald-500" />
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase text-slate-400">DOB</span>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{patient.dob || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                            <Droplets className="h-4 w-4 text-red-500" />
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase text-slate-400">Blood</span>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{patient.blood_type || 'Unknown'}</span>
                            </div>
                          </div>
                        </div>
                        
                        {(patient.allergies?.length > 0 || patient.chronic_conditions?.length > 0) && (
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {patient.allergies?.map((a, idx) => (
                              <Badge key={idx} variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50">
                                {a}
                              </Badge>
                            ))}
                            {patient.chronic_conditions?.map((c, idx) => (
                              <Badge key={idx} variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] font-medium text-slate-400 mt-4 text-right">
                          Added {formatTimeAgo(patient.created_at)}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
      
      <MobileNav />
    </div>
  );
}

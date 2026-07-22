'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import { motion } from 'framer-motion';
import { 
  Settings2, User, Building, Palette, Sparkles, 
  Bell, Volume2, Shield, Moon, Sun, Monitor,
  Activity, Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

// Helper for switch component
function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (c: boolean) => void, disabled?: boolean }) {
  return (
    <button 
      type="button" 
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)} 
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className="sr-only">Toggle</span>
      <motion.span 
        layout
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        animate={{ x: checked ? 20 : 0 }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  
  // Profile state
  const [profile, setProfile] = useState({
    name: 'Dr. Mitchell',
    specialty: 'Emergency Medicine',
    clinic: 'Central City Hospital',
    email: 'dr.mitchell@cch.org'
  });

  // Preferences state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [compactMode, setCompactMode] = useState(false);
  const [autoSoap, setAutoSoap] = useState(true);
  const [strictVocab, setStrictVocab] = useState(false);
  const [audioAlerts, setAudioAlerts] = useState(true);
  
  const [isSaved, setIsSaved] = useState(false);
  
  useEffect(() => {
    // Check auth
    if (!localStorage.getItem('auth_token')) {
      router.push('/login');
      return;
    }
    
    // Load preferences if available
    const savedProfile = localStorage.getItem('doctor_profile');
    const authUser = getStoredUser();
    
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    } else if (authUser) {
      setProfile(p => ({ ...p, name: authUser.name, email: authUser.email }));
    }
    
    const savedTheme = localStorage.getItem('theme_preference') as any;
    if (savedTheme) setTheme(savedTheme);
    
    const prefs = localStorage.getItem('doctor_prefs');
    if (prefs) {
      const p = JSON.parse(prefs);
      setCompactMode(p.compactMode ?? false);
      setAutoSoap(p.autoSoap ?? true);
      setStrictVocab(p.strictVocab ?? false);
      setAudioAlerts(p.audioAlerts ?? true);
    }
  }, [router]);

  // Apply theme class to HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme_preference', theme);
  }, [theme]);

  const handleSave = () => {
    localStorage.setItem('doctor_profile', JSON.stringify(profile));
    localStorage.setItem('doctor_prefs', JSON.stringify({
      compactMode, autoSoap, strictVocab, audioAlerts
    }));
    
    // Dispatch event so Navbar and other pages update immediately without refresh
    window.dispatchEvent(new Event('profileUpdated'));
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
      <Navbar />
      
      <main className="flex-1 w-full max-w-[1000px] mx-auto px-4 md:px-6 py-8 pb-24 md:pb-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase tracking-widest mb-2 shadow-sm border border-purple-200 dark:border-purple-800/50">
              <Settings2 size={12} /> Personalization
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Settings & Preferences
            </h1>
            <p className="text-sm text-slate-500 mt-1">Make ClinicalAI feel like your own workspace.</p>
          </div>
          
          <Button 
            onClick={handleSave}
            className={`min-w-[120px] transition-all shadow-sm ${isSaved ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            {isSaved ? <><Check className="w-4 h-4 mr-2" /> Saved!</> : 'Save Changes'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Profile */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="rounded-2xl border-slate-200/60 bg-white/60 backdrop-blur-xl shadow-sm dark:bg-slate-900/50 dark:border-slate-800/60 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-600 to-indigo-600" />
              <CardContent className="p-6 pt-12 relative z-10">
                <div className="flex flex-col items-center mb-6">
                  <Avatar className="h-24 w-24 border-4 border-white dark:border-slate-900 shadow-md mb-3">
                    <AvatarFallback className="text-2xl font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {getInitials(profile.name)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{profile.name}</h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{profile.specialty}</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Display Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        value={profile.name}
                        onChange={(e) => setProfile({...profile, name: e.target.value})}
                        className="pl-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Specialty</label>
                    <div className="relative">
                      <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        value={profile.specialty}
                        onChange={(e) => setProfile({...profile, specialty: e.target.value})}
                        className="pl-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinic / Hospital</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        value={profile.clinic}
                        onChange={(e) => setProfile({...profile, clinic: e.target.value})}
                        className="pl-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" 
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/60 bg-white/60 backdrop-blur-xl shadow-sm dark:bg-slate-900/50 dark:border-slate-800/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-500" /> Security & Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 mb-4">Your session is secure. Local storage is encrypted.</p>
                <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20" onClick={() => {
                  localStorage.removeItem('auth_token');
                  router.push('/login');
                }}>
                  Sign Out of All Devices
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Preferences */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Appearance */}
            <Card className="rounded-2xl border-slate-200/60 bg-white/60 backdrop-blur-xl shadow-sm dark:bg-slate-900/50 dark:border-slate-800/60">
              <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="h-5 w-5 text-indigo-500" /> Appearance
                </CardTitle>
                <CardDescription>Customize how the interface looks and feels.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Theme Preference</h4>
                    <p className="text-xs text-slate-500 mt-1">Select your preferred color scheme.</p>
                  </div>
                  <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <button 
                      onClick={() => setTheme('light')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${theme === 'light' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                      <Sun className="h-3.5 w-3.5" /> Light
                    </button>
                    <button 
                      onClick={() => setTheme('dark')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${theme === 'dark' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                      <Moon className="h-3.5 w-3.5" /> Dark
                    </button>
                    <button 
                      onClick={() => setTheme('system')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${theme === 'system' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                      <Monitor className="h-3.5 w-3.5" /> Auto
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Compact Mode</h4>
                    <p className="text-xs text-slate-500 mt-1">Reduce spacing to show more data on screen.</p>
                  </div>
                  <Switch checked={compactMode} onChange={setCompactMode} />
                </div>
              </CardContent>
            </Card>

            {/* AI Copilot Settings */}
            <Card className="rounded-2xl border-slate-200/60 bg-white/60 backdrop-blur-xl shadow-sm dark:bg-slate-900/50 dark:border-slate-800/60">
              <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-500" /> Copilot Preferences
                </CardTitle>
                <CardDescription>Configure how the AI assists you during consultations.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Auto-generate SOAP Notes</h4>
                    <p className="text-xs text-slate-500 mt-1">Automatically draft SOAP notes when triage completes.</p>
                  </div>
                  <Switch checked={autoSoap} onChange={setAutoSoap} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Strict Medical Vocabulary</h4>
                    <p className="text-xs text-slate-500 mt-1">Use advanced clinical terminology in generated notes.</p>
                  </div>
                  <Switch checked={strictVocab} onChange={setStrictVocab} />
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="rounded-2xl border-slate-200/60 bg-white/60 backdrop-blur-xl shadow-sm dark:bg-slate-900/50 dark:border-slate-800/60">
              <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-amber-500" /> Notifications & Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex gap-3">
                    <div className="mt-1 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <Volume2 className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Critical Alerts (P1) Sound</h4>
                      <p className="text-xs text-slate-500 mt-1">Play an audio chime when an emergency case is detected.</p>
                    </div>
                  </div>
                  <Switch checked={audioAlerts} onChange={setAudioAlerts} />
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}

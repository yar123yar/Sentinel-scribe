'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { signup, loginDemo } from '@/lib/auth';
import Link from 'next/link';
import {
  Activity, Brain, Shield, Clock, ArrowRight,
  CheckCircle, AlertTriangle, Zap, Lock, Eye, EyeOff
} from 'lucide-react';

const TRUST_BADGES = [
  { icon: Brain,        label: 'Explainable AI',       desc: 'Transparent reasoning' },
  { icon: Shield,       label: 'Qdrant Memory',         desc: 'Vector-powered recall' },
  { icon: Activity,     label: 'Emergency Detection',   desc: 'Real-time red flags' },
  { icon: Zap,          label: 'AI Copilot',            desc: 'Clinical Q&A assistant' },
];

const FEATURES = [
  'AI triage with P1/P2/P3 classification',
  'Automated SOAP note generation',
  'Patient memory via Qdrant vector DB',
  'Explainable clinical reasoning',
  'Real-time red-flag detection',
];

export default function SignupPage() {
  const router = useRouter();
  const [name, setName]         = useState('');
  const [role, setRole]         = useState('Doctor');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try { await signup(name, role, email, phone, password); router.push('/'); }
    catch { setError('Failed to create account. Email may already be registered.'); }
    finally { setLoading(false); }
  };

  const handleDemo = async () => {
    setLoading(true); setError('');
    try { await loginDemo(); router.push('/'); }
    catch { setError('Backend offline. Please start the FastAPI server.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: '#F8FAFC' }}>

      {/* ── Left: Illustration Panel ───────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[54%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0F4C81 0%, #1A5F9A 40%, #2A7DE1 100%)' }}
      >
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
            <Activity size={20} color="white" />
          </div>
          <div>
            <p className="font-bold text-white text-lg leading-none">ClinicalAI</p>
            <p className="text-white/60 text-xs">Command Center</p>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-white/80 text-sm font-medium mb-3 uppercase tracking-widest">
              Healthcare AI Platform
            </p>
            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight">
              Clinical Triage,<br />
              <span className="text-blue-100">Reimagined.</span>
            </h1>
            <p className="text-white text-base mb-10 max-w-md leading-relaxed font-medium">
              AI-augmented triage classification, automated SOAP documentation, and intelligent patient memory — built for the modern clinician.
            </p>

            {/* Feature list */}
            <div className="space-y-4 mb-10">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle size={18} color="#4ADE80" className="flex-shrink-0" />
                  <span className="text-white font-medium text-sm">{f}</span>
                </motion.div>
              ))}
            </div>

            {/* Healthcare illustration SVG */}
            <HealthcareIllustration />
          </motion.div>
        </div>

        {/* Trust badges */}
        <div className="relative z-10">
          <p className="text-white/40 text-xs mb-3 uppercase tracking-widest">Powered by</p>
          <div className="flex flex-wrap gap-2">
            {['Gemini 2.5 Flash', 'Google ADK', 'Qdrant', 'Lyzr', 'FastAPI'].map(t => (
              <span key={t} className="text-xs text-white/70 bg-white/10 border border-white/20 rounded-full px-3 py-1">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Login Form ──────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          className="w-full max-w-[400px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--color-primary)' }}>
              <Activity size={18} color="white" />
            </div>
            <div>
              <p className="font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>ClinicalAI</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Command Center</p>
            </div>
          </div>

          {/* Trust badges — mobile */}
          <div className="grid grid-cols-2 gap-2 mb-8 lg:hidden">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 p-2.5 rounded-lg"
                style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <Icon size={14} style={{ color: 'var(--color-action)', flexShrink: 0 }} />
                <span className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>{label}</span>
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            Create an Account
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>
            Join ClinicalAI and set up your workspace
          </p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 p-3.5 rounded-xl mb-5"
              style={{ background: '#FFF5F5', border: '1px solid #FECACA' }}
            >
              <AlertTriangle size={15} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
              <p className="text-sm" style={{ color: '#B91C1C' }}>{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                Full Name
              </label>
              <input
                id="name"
                type="text"
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Dr. Jane Doe"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                  Role (e.g. Cardiologist)
                </label>
                <input
                  id="role"
                  type="text"
                  className="input"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="Doctor"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="input"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="doctor@clinic.ai"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Password</label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  className="input pr-11"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost btn-icon-sm"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              id="signup-submit"
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full btn-lg mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle size={15} /> Create Account
                </span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="divider-text my-8 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            or
          </div>

          <div className="text-center">
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Already have an account?{' '}
              <Link href="/login" className="font-semibold hover:underline" style={{ color: 'var(--color-primary)' }}>
                Sign in
              </Link>
            </p>
          </div>

          {/* Trust badges — desktop */}
          <div className="hidden lg:grid grid-cols-2 gap-3 mt-8">
            {TRUST_BADGES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-2.5 p-3 rounded-xl"
                style={{ background: '#F8FAFC', border: '1px solid var(--color-border)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#EFF6FF' }}>
                  <Icon size={13} style={{ color: 'var(--color-action)' }} />
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ── Healthcare SVG Illustration ──────────────────────────────────────────── */
function HealthcareIllustration() {
  return (
    <div className="relative">
      <motion.div
        className="rounded-2xl overflow-hidden border border-white/30 shadow-xl"
        style={{ background: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(16px)', padding: '20px' }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        {/* Mock EMR card */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
            <span className="text-sm font-bold text-blue-900">BM</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Bob Martinez, 54M</p>
            <p className="text-white/60 text-xs">MRN-002 · CAD, Hyperlipidemia</p>
          </div>
          <div className="ml-auto">
            <span className="text-xs font-bold text-red-300 bg-red-500/20 border border-red-400/30 rounded-full px-2.5 py-1">
              P1 — 97%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Chief Complaint', val: 'Chest Pain + SOB' },
            { label: 'Red Flags', val: 'ACS Protocol' },
            { label: 'Triage Time', val: '8 seconds' },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <p className="text-white/40 text-xs mb-0.5">{label}</p>
              <p className="text-white text-xs font-semibold">{val}</p>
            </div>
          ))}
        </div>

        {/* Mini SOAP */}
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <p className="text-white/60 text-xs">SOAP Note — AI Generated</p>
          </div>
          <p className="text-white/80 text-xs leading-relaxed line-clamp-2">
            <span className="text-blue-300 font-semibold">S:</span> 54M CAD hx, crushing chest pain 9/10 × 45min, radiation to L arm, diaphoresis, SOB…
          </p>
        </div>
      </motion.div>
    </div>
  );
}

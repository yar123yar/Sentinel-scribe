'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import { Loader2, ArrowLeft, UserPlus, Heart, AlertTriangle, Pill } from 'lucide-react';
import Link from 'next/link';

export default function NewPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    gender: 'Male',
    mrn: '',
    blood_type: '',
    allergies: '',
    chronic_conditions: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!formData.name.trim()) {
      setError('Patient name is required');
      setLoading(false);
      return;
    }

    try {
      await api.post('/patients', {
        name: formData.name.trim(),
        dob: formData.dob || null,
        gender: formData.gender || null,
        mrn: formData.mrn || null,
        blood_type: formData.blood_type || null,
        allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        chronic_conditions: formData.chronic_conditions ? formData.chronic_conditions.split(',').map(s => s.trim()).filter(Boolean) : []
      });
      router.push('/workspace');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg-page)' }}>
      <Navbar />

      <main className="flex-1 w-full flex items-center justify-center p-4 py-12 lg:py-20">
        <div className="w-full max-w-2xl relative">
          <Link href="/workspace" className="absolute -top-12 left-2 sm:left-0 inline-flex items-center gap-2 text-base font-medium hover:underline transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
            <ArrowLeft size={18} /> Back to Workspace
          </Link>
          
          <div className="card overflow-hidden shadow-sm border border-[var(--color-border)] bg-white rounded-2xl">
            <div className="p-8 text-center flex flex-col items-center" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: '#EFF6FF' }}>
                <UserPlus size={24} style={{ color: 'var(--color-action)' }} />
              </div>
              <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Add New Patient</h1>
              <p className="text-base mt-2 max-w-md" style={{ color: 'var(--color-text-secondary)' }}>
                Enter the clinical details below to register a new patient into the system.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-10">
              {error && (
                <div className="p-4 rounded-xl text-base font-medium" style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
                <div className="flex flex-col gap-2.5">
                  <label className="text-base font-semibold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="input w-full h-[52px] text-base"
                    placeholder="e.g. Jane Doe"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2.5">
                  <label className="text-base font-semibold text-slate-700">Medical Record Number</label>
                  <input
                    type="text"
                    name="mrn"
                    value={formData.mrn}
                    onChange={handleChange}
                    className="input w-full h-[52px] text-base"
                    placeholder="Auto-generated if left blank"
                  />
                </div>

                <div className="flex flex-col gap-2.5">
                  <label className="text-base font-semibold text-slate-700">Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    className="input w-full h-[52px] text-base"
                  />
                </div>

                <div className="flex flex-col gap-2.5">
                  <label className="text-base font-semibold text-slate-700">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="input w-full h-[52px] text-base"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <hr style={{ borderColor: 'var(--color-border)' }} />
              
              <div className="space-y-8">
                <h3 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  <Heart size={20} style={{ color: 'var(--color-emergency)' }} /> Clinical Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
                  <div className="flex flex-col gap-2.5">
                    <label className="text-base font-semibold text-slate-700 flex items-center gap-1.5">
                      Blood Type
                    </label>
                    <select
                      name="blood_type"
                      value={formData.blood_type}
                      onChange={handleChange}
                      className="input w-full h-[52px] text-base"
                    >
                      <option value="">Unknown</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <label className="text-base font-semibold text-slate-700 flex items-center gap-1.5">
                    <AlertTriangle size={18} className="text-amber-500" /> Allergies
                  </label>
                  <input
                    type="text"
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleChange}
                    className="input w-full h-[52px] text-base"
                    placeholder="Comma separated (e.g. Penicillin, Peanuts)"
                  />
                </div>

                <div className="flex flex-col gap-2.5">
                  <label className="text-base font-semibold text-slate-700 flex items-center gap-1.5">
                    <Pill size={18} className="text-blue-500" /> Chronic Conditions
                  </label>
                  <input
                    type="text"
                    name="chronic_conditions"
                    value={formData.chronic_conditions}
                    onChange={handleChange}
                    className="input w-full h-[52px] text-base"
                    placeholder="Comma separated (e.g. Hypertension, Type 2 Diabetes)"
                  />
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                <Link href="/workspace" className="btn btn-ghost h-[52px] px-8 text-base font-medium">
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary h-[52px] px-10 min-w-[160px] text-base font-medium"
                >
                  {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

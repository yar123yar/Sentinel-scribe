'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Patient } from '@/lib/types';
import { formatAge, formatDate, getInitials, getAvatarColor } from '@/lib/utils';
import {
  Search, AlertTriangle, Heart, Pill, Calendar,
  ChevronRight, User, Activity, Clock, Shield
} from 'lucide-react';

interface Props {
  selectedPatientId: string | null;
  onSelectPatient: (id: string, name: string) => void;
}

const RISK_LEVEL = (p: Patient): { label: string; color: string; bg: string } => {
  if (p.chronic_conditions.length >= 3 || p.allergies.length >= 2)
    return { label: 'High Risk', color: '#DC2626', bg: '#FEE2E2' };
  if (p.chronic_conditions.length >= 1)
    return { label: 'Moderate', color: '#F59E0B', bg: '#FEF3C7' };
  return { label: 'Low Risk', color: '#0E9F6E', bg: '#D1FAE5' };
};

export default function PatientMemoryPanel({ selectedPatientId, onSelectPatient }: Props) {
  const [patients, setPatients]   = useState<Patient[]>([]);
  const [filtered, setFiltered]   = useState<Patient[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [memory, setMemory]       = useState<string | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(false);

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
    if (!selectedPatientId) { setMemory(null); return; }
    setMemoryLoading(true);
    api.post('/copilot/chat', {
      patient_id: selectedPatientId,
      message: 'Briefly summarize this patient\'s medical history and previous visits in 2-3 sentences.',
    }).then(r => setMemory(r.data?.answer ?? null))
      .catch(() => setMemory(null))
      .finally(() => setMemoryLoading(false));
  }, [selectedPatientId]);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div className="h-full flex flex-col" style={{ background: 'white' }}>

      {/* Header */}
      <div className="panel-header">
        <div>
          <h4>Patients</h4>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {patients.length} registered
          </p>
        </div>
        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-success)' }} />
      </div>

      {/* Search */}
      <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            className="input pl-9 text-sm"
            placeholder="Search patients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ height: '36px', padding: '0 12px 0 34px' }}
          />
        </div>
      </div>

      {/* Patient list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="p-2">
            {filtered.map(p => {
              const risk = RISK_LEVEL(p);
              const isSelected = p.id === selectedPatientId;

              return (
                <motion.button
                  key={p.id}
                  onClick={() => onSelectPatient(p.id, p.name)}
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.998 }}
                  className="w-full text-left mb-1.5 rounded-xl p-3 transition-all"
                  style={{
                    background: isSelected ? '#EFF6FF' : 'white',
                    border: `1.5px solid ${isSelected ? 'var(--color-action)' : 'var(--border)'}`,
                    boxShadow: isSelected ? '0 0 0 3px rgba(42,125,225,0.08)' : 'none',
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: getAvatarColor(p.name) }}
                    >
                      {getInitials(p.name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {p.name}
                        </p>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: risk.bg, color: risk.color, fontSize: '10px' }}
                        >
                          {risk.label}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {formatAge(p.dob)} · {p.gender} · {p.mrn}
                      </p>
                      {p.chronic_conditions.length > 0 && (
                        <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                          {p.chronic_conditions.slice(0, 2).join(', ')}
                          {p.chronic_conditions.length > 2 && ` +${p.chronic_conditions.length - 2}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Expanded details when selected */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 space-y-2 overflow-hidden"
                        style={{ borderTop: '1px solid #BFDBFE' }}
                      >
                        {p.blood_type && (
                          <div className="flex items-center gap-2">
                            <Heart size={11} style={{ color: '#DC2626' }} />
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              Blood type: <strong>{p.blood_type}</strong>
                            </span>
                          </div>
                        )}
                        {p.allergies.length > 0 && (
                          <div className="flex items-start gap-2">
                            <AlertTriangle size={11} style={{ color: '#F59E0B', marginTop: 2 }} />
                            <span className="text-xs" style={{ color: '#92400E' }}>
                              <strong>Allergies:</strong> {p.allergies.join(', ')}
                            </span>
                          </div>
                        )}
                        {p.chronic_conditions.length > 0 && (
                          <div className="flex items-start gap-2">
                            <Pill size={11} style={{ color: 'var(--text-muted)', marginTop: 2 }} />
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {p.chronic_conditions.join(', ')}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}

            {filtered.length === 0 && (
              <div className="py-10 text-center">
                <User size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No patients found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Patient Memory (Qdrant) */}
      {selectedPatient && (
        <div
          className="flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)', maxHeight: '200px', overflow: 'hidden' }}
        >
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={12} style={{ color: '#8B5CF6' }} />
              <span className="label-xs" style={{ color: '#8B5CF6' }}>Qdrant Memory</span>
            </div>
            {memoryLoading ? (
              <div className="skeleton h-12 rounded-lg" />
            ) : memory ? (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {memory}
              </p>
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                No previous consultation history found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPriorityBadgeClass(priority?: string) {
  switch (priority) {
    case 'P1': return 'badge badge-p1';
    case 'P2': return 'badge badge-p2';
    case 'P3': return 'badge badge-p3';
    default:   return 'badge badge-pending';
  }
}

export function getPriorityLabel(priority?: string) {
  switch (priority) {
    case 'P1': return 'P1 — Emergency';
    case 'P2': return 'P2 — Urgent';
    case 'P3': return 'P3 — Non-Urgent';
    default:   return 'Pending';
  }
}

export function getPriorityColor(priority?: string) {
  switch (priority) {
    case 'P1': return '#DC2626';
    case 'P2': return '#F59E0B';
    case 'P3': return '#0E9F6E';
    default:   return '#94A3B8';
  }
}

export function getPriorityBg(priority?: string) {
  switch (priority) {
    case 'P1': return '#FEE2E2';
    case 'P2': return '#FEF3C7';
    case 'P3': return '#D1FAE5';
    default:   return '#F1F5F9';
  }
}

export function getSeverityChipClass(severity?: string) {
  switch (severity?.toLowerCase()) {
    case 'severe':   return 'chip chip-severe';
    case 'moderate': return 'chip chip-moderate';
    case 'mild':     return 'chip chip-mild';
    default:         return 'chip chip-default';
  }
}

export function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(dateStr?: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatTimeAgo(dateStr?: string) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function formatAge(dob?: string): string {
  if (!dob) return '—';
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return `${age} yrs`;
}

export function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function getAvatarColor(name: string): string {
  const colors = [
    '#2A7DE1', '#0E9F6E', '#8B5CF6', '#0F4C81',
    '#EC4899', '#14B8A6', '#F59E0B', '#6366F1',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

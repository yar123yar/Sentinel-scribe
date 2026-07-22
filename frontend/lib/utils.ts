import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getAvatarColor(name: string) {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function getPriorityColor(priority: string | undefined) {
  if (priority === 'P1') return '#EF4444';
  if (priority === 'P2') return '#F59E0B';
  if (priority === 'P3') return '#10B981';
  return '#94A3B8';
}

export function getPriorityBg(priority: string | undefined) {
  if (priority === 'P1') return '#FEE2E2';
  if (priority === 'P2') return '#FEF3C7';
  if (priority === 'P3') return '#D1FAE5';
  return '#F1F5F9';
}

export function getPriorityLabel(priority: string | undefined) {
  if (priority === 'P1') return 'P1 Emergency';
  if (priority === 'P2') return 'P2 Urgent';
  if (priority === 'P3') return 'P3 Routine';
  return 'Pending';
}

export function getSeverityChipClass(severity: string) {
  const s = severity.toLowerCase();
  if (s === 'severe' || s === 'high') return 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400';
  if (s === 'moderate' || s === 'medium') return 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400';
  if (s === 'mild' || s === 'low') return 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400';
  return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300';
}

export function formatAge(dob: string | undefined): string {
  if (!dob) return '';
  const diff = Date.now() - new Date(dob).getTime();
  const age = new Date(diff).getUTCFullYear() - 1970;
  return age.toString();
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString();
}

export function getPriorityBadgeClass(priority: string | undefined): string {
  if (priority === 'P1') return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400';
  if (priority === 'P2') return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400';
  if (priority === 'P3') return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400';
  return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300';
}

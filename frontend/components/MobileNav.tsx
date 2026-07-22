'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Stethoscope, Users, MessageSquare, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/workspace', icon: Stethoscope,     label: 'Workspace' },
  { href: '/patients',  icon: Users,           label: 'Patients' },
  { href: '/settings',  icon: Settings,        label: 'Settings' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden flex items-center justify-between px-2 pb-safe border-t border-slate-200 bg-white/80 backdrop-blur-md sticky bottom-0 z-50 dark:bg-slate-950/80 dark:border-slate-800">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const active = pathname === href && (label === 'Dashboard' || label === 'Workspace');
        return (
          <Link
            key={label}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${active ? 'text-blue-600 dark:text-blue-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span className={`text-[10px] ${active ? 'font-semibold' : 'font-normal'}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Stethoscope, Users, MessageSquare, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/workspace', icon: Stethoscope,     label: 'Workspace' },
  { href: '/workspace', icon: Users,           label: 'Patients' },
  { href: '/workspace', icon: MessageSquare,   label: 'Copilot' },
  { href: '/workspace', icon: Settings,        label: 'Settings' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav mobile-only">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const active = pathname === href && (label === 'Dashboard' || label === 'Workspace');
        return (
          <Link
            key={label}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-all"
            style={{ color: active ? 'var(--color-action)' : 'var(--text-muted)' }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span style={{ fontSize: '10px', fontWeight: active ? 600 : 400 }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

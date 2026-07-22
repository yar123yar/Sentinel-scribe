'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Activity, LayoutDashboard, Stethoscope, Users,
  Settings, LogOut, Bell, ChevronDown, Menu
} from 'lucide-react';
import { logout, getStoredUser } from '@/lib/auth';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { href: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/workspace', icon: Stethoscope,     label: 'Workspace' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => { setUser(getStoredUser() as typeof user); }, []);

  const handleLogout = () => { logout(); router.push('/login'); };

  return (
    <header
      className="h-[60px] flex items-center justify-between px-4 lg:px-6 flex-shrink-0 sticky top-0 z-50"
      style={{
        background: 'white',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(15, 76, 129, 0.06)',
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--color-primary)' }}
        >
          <Activity size={16} color="white" strokeWidth={2.5} />
        </div>
        <div className="hidden sm:block">
          <p className="font-bold text-sm leading-none" style={{ color: 'var(--color-primary)' }}>
            ClinicalAI
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Command Center</p>
        </div>
      </Link>

      {/* Desktop navigation */}
      <nav className="hidden md:flex items-center gap-1">
        {NAV_LINKS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150"
              style={{
                color: active ? 'var(--color-action)' : 'var(--text-secondary)',
                background: active ? '#EFF6FF' : 'transparent',
              }}
            >
              <Icon size={15} strokeWidth={active ? 2.5 : 2} />
              {label}
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                  style={{ background: 'var(--color-action)' }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button
          className="btn btn-ghost btn-icon relative desktop-only"
          style={{ color: 'var(--text-muted)' }}
        >
          <Bell size={17} />
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full"
            style={{ background: 'var(--color-emergency)' }}
          />
        </button>

        {/* User menu */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all hover:bg-[#F1F5F9]"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: getAvatarColor(user.name) }}
              >
                {getInitials(user.name)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium leading-none" style={{ color: 'var(--text-primary)' }}>
                  {user.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {user.role}
                </p>
              </div>
              <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} className="desktop-only" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                <div
                  className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden z-40"
                  style={{ background: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
                >
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all hover:bg-[#FFF5F5]"
                      style={{ color: '#DC2626' }}
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

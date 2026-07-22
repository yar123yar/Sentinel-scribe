'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Activity, LayoutDashboard, Stethoscope, Users,
  Settings, LogOut, Bell, ChevronDown
} from 'lucide-react';
import { logout, getStoredUser } from '@/lib/auth';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const NAV_LINKS = [
  { href: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/workspace', icon: Stethoscope,     label: 'Workspace' },
  { href: '/patients',  icon: Users,           label: 'Patients' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);

  useEffect(() => { 
    const loadUser = () => {
      const stored = getStoredUser();
      const docProfile = localStorage.getItem('doctor_profile');
      if (docProfile && stored) {
        try {
          const dp = JSON.parse(docProfile);
          setUser({ ...stored, name: dp.name, role: dp.specialty || stored.role });
        } catch (e) {
          setUser(stored as any);
        }
      } else {
        setUser(stored as any);
      }
    };
    
    loadUser();
    window.addEventListener('profileUpdated', loadUser);
    return () => window.removeEventListener('profileUpdated', loadUser);
  }, []);

  const handleLogout = () => { logout(); router.push('/login'); };

  return (
    <header className="h-[60px] flex items-center justify-between px-4 lg:px-6 flex-shrink-0 sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm dark:bg-slate-950 dark:border-slate-800">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 text-white">
          <Activity size={16} strokeWidth={2.5} />
        </div>
        <div className="hidden sm:block">
          <p className="font-bold text-sm leading-none text-blue-700 dark:text-blue-500">
            ClinicalAI
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Command Center</p>
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
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${active ? 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'}`}
            >
              <Icon size={15} strokeWidth={active ? 2.5 : 2} />
              {label}
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-blue-600 dark:bg-blue-500"
                />
              )}
            </Link>
          );
        })}
        <Link href="/patients/new" className={buttonVariants({ size: 'sm', className: 'ml-2 hidden lg:inline-flex shadow-sm rounded-lg' })}>
          + New Patient
        </Link>
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <Button variant="ghost" size="icon" className="relative hidden md:flex text-slate-500">
          <Bell size={17} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
        </Button>

        {/* User menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger className={buttonVariants({ variant: 'ghost', className: 'h-auto p-1.5 px-2 flex items-center gap-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900' })}>
              <Avatar className="w-7 h-7">
                <AvatarFallback className="text-xs font-bold text-white" style={{ background: getAvatarColor(user.name) }}>
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium leading-none text-slate-900 dark:text-slate-100">
                  {user.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {user.role}
                </p>
              </div>
              <ChevronDown size={14} className="text-slate-500 hidden md:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

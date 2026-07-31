'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Settings,
  Globe,
  Users,
  ShieldCheck,
  LogOut,
  User,
  Menu,
  X,
  PlusCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { logoutAction } from '@/actions/auth.actions';
import { ToastProvider, useToast } from '@/components/ui/toast';
import { UserRole } from '@/lib/types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: {
    email: string;
    role: UserRole;
    workspaceName?: string | null;
  };
}

export function DashboardLayoutContent({ children, user }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;

  const superAdminNav = [
    { name: 'Dashboard', href: '/super-admin', icon: LayoutDashboard },
    { name: 'Admin Accounts', href: '/super-admin/admins', icon: Users },
    { name: 'Workspaces', href: '/super-admin/workspaces', icon: ShieldCheck },
    { name: 'Global Domains', href: '/super-admin/domains', icon: Globe },
  ];

  const adminNav = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Landing Pages', href: '/dashboard/landing-pages', icon: FileText },
    { name: 'Workspace Settings', href: '/dashboard/settings', icon: Settings },
    { name: 'Custom Domains', href: '/dashboard/domains', icon: Globe },
    { name: 'My Profile', href: '/dashboard/profile', icon: User },
  ];

  const navItems = isSuperAdmin ? superAdminNav : adminNav;

  const handleLogout = async () => {
    await logoutAction();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans selection:bg-emerald-500/20 selection:text-emerald-400">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950">
            WA
          </div>
          <span className="font-bold text-white tracking-tight">WA Gateway</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/80 flex flex-col justify-between p-4 transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2 pt-2">
            <Link href={isSuperAdmin ? '/super-admin' : '/dashboard'} className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                WA
              </div>
              <div>
                <span className="font-bold text-white tracking-tight text-lg block leading-none">
                  WA Gateway
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 mt-1 block">
                  {isSuperAdmin ? 'Super Admin' : 'SaaS Portal'}
                </span>
              </div>
            </Link>
          </div>

          {/* Tenant / Workspace Pill */}
          {!isSuperAdmin && user.workspaceName && (
            <div className="px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between">
              <div className="truncate">
                <span className="text-[11px] text-slate-400 uppercase font-semibold block tracking-wider">
                  Workspace
                </span>
                <span className="text-sm font-semibold text-white truncate block">
                  {user.workspaceName}
                </span>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/super-admin' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-emerald-400" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer Account & Logout */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="px-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="truncate flex-1">
              <p className="text-xs font-semibold text-white truncate">{user.email}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user.role.toLowerCase().replace('_', ' ')}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">{children}</div>
      </main>
    </div>
  );
}

export function DashboardLayout(props: DashboardLayoutProps) {
  return (
    <ToastProvider>
      <DashboardLayoutContent {...props} />
    </ToastProvider>
  );
}

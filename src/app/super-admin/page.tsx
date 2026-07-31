import { getSession } from '@/lib/auth';
import { getSuperAdminStatsAction, getAllWorkspacesAction } from '@/actions/super-admin.actions';
import { redirect } from 'next/navigation';
import {
  Users,
  Building2,
  FileText,
  CreditCard,
  Globe,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

export default async function SuperAdminDashboard() {
  const session = await getSession();

  if (!session || session.role !== 'SUPER_ADMIN') {
    redirect('/login');
  }

  const [stats, workspaces] = await Promise.all([
    getSuperAdminStatsAction(),
    getAllWorkspacesAction(),
  ]);

  return (
    <div className="space-y-8">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Super Admin Control Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Global SaaS Platform Overview, Workspaces, and Enterprise Accounts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/super-admin/admins"
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            <span>Manage Admins</span>
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Admin Accounts</span>
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-white">{stats.totalAdmins}</p>
          <p className="text-xs text-slate-500">Registered Customers</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Workspaces</span>
            <Building2 className="w-5 h-5 text-teal-400" />
          </div>
          <p className="text-3xl font-black text-white">{stats.totalWorkspaces}</p>
          <p className="text-xs text-slate-500">Active Tenant Enclaves</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Landing Pages</span>
            <FileText className="w-5 h-5 text-sky-400" />
          </div>
          <p className="text-3xl font-black text-white">{stats.totalLandingPages}</p>
          <p className="text-xs text-slate-500">Bridge Pages Active</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Subscriptions</span>
            <CreditCard className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-black text-white">{stats.activeSubscriptions}</p>
          <p className="text-xs text-emerald-400 font-semibold">$500 One-Time Licenses</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Custom Domains</span>
            <Globe className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-black text-white">{stats.totalDomains}</p>
          <p className="text-xs text-slate-500">White-label Domains</p>
        </div>
      </div>

      {/* Workspaces Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Active Customer Workspaces</h2>
            <p className="text-xs text-slate-400">Inspect workspaces, pages count, and manage subscriptions</p>
          </div>
          <Link
            href="/super-admin/workspaces"
            className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>View All Workspaces</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Workspace</th>
                <th className="px-4 py-3">Owner Email</th>
                <th className="px-4 py-3">Landing Pages</th>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 rounded-r-xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {workspaces.slice(0, 5).map((ws) => (
                <tr key={ws.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-4 font-semibold text-white flex items-center gap-3">
                    {ws.logoUrl ? (
                      <img src={ws.logoUrl} alt={ws.name} className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                        {ws.name.charAt(0)}
                      </div>
                    )}
                    <span>{ws.name}</span>
                  </td>
                  <td className="px-4 py-4 text-slate-400">{ws.user.email}</td>
                  <td className="px-4 py-4 font-medium text-white">{ws.landingPages.length} pages</td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        ws.subscription?.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {ws.subscription?.status || 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500">
                    {new Date(ws.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href="/super-admin/workspaces"
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

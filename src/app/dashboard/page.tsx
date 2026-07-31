import { getSession } from '@/lib/auth';
import { getAdminDashboardStatsAction, getLandingPagesAction } from '@/actions/landing-page.actions';
import { redirect } from 'next/navigation';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
  MousePointerClick,
  Plus,
  Globe,
  CreditCard,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role === 'SUPER_ADMIN' && !session.workspaceId) {
    redirect('/super-admin');
  }

  const [stats, landingPages] = await Promise.all([
    getAdminDashboardStatsAction(),
    getLandingPagesAction(),
  ]);

  return (
    <div className="space-y-8">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Meta Ads to WhatsApp Bridge Performance & Micro Landing Pages
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/landing-pages/new"
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Landing Page</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Landing Pages */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Landing Pages</span>
            <FileText className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-white">{stats.totalPages}</p>
          <p className="text-xs text-slate-500">Unlimited SaaS License</p>
        </div>

        {/* Active Pages */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Pages</span>
            <CheckCircle2 className="w-5 h-5 text-teal-400" />
          </div>
          <p className="text-3xl font-black text-white">{stats.activePages}</p>
          <p className="text-xs text-emerald-400 font-semibold">Live and converting</p>
        </div>

        {/* Inactive Pages */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Inactive Pages</span>
            <XCircle className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-black text-white">{stats.inactivePages}</p>
          <p className="text-xs text-slate-500">Drafts & Paused</p>
        </div>

        {/* Total Views */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Views</span>
            <Eye className="w-5 h-5 text-sky-400" />
          </div>
          <p className="text-3xl font-black text-white">{stats.totalViews.toLocaleString()}</p>
          <p className="text-xs text-slate-500">Meta Ad Traffic</p>
        </div>

        {/* WhatsApp Clicks */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">WhatsApp Clicks</span>
            <MousePointerClick className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-white">{stats.totalClicks.toLocaleString()}</p>
          <p className="text-xs text-emerald-400 font-semibold">
            {stats.totalViews > 0
              ? `${Math.round((stats.totalClicks / stats.totalViews) * 100)}% Conversion Rate`
              : 'High Intent Lead CTAs'}
          </p>
        </div>
      </div>

      {/* Subscription & Domain Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold block">Subscription Status</span>
              <span className="font-bold text-white text-base">
                {stats.subscription?.planName || 'Unlimited'} (${stats.subscription?.price || 500} {stats.subscription?.billingType || 'One Time'})
              </span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {stats.subscription?.status || 'ACTIVE'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold block">Primary Custom Domain</span>
              <span className="font-bold text-white text-base">{stats.primaryDomain}</span>
            </div>
          </div>
          <Link
            href="/dashboard/domains"
            className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>Manage</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Recent Landing Pages Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Recent Landing Pages</h2>
            <p className="text-xs text-slate-400">Quick view of active bridge landing pages</p>
          </div>
          <Link
            href="/dashboard/landing-pages"
            className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>View All ({stats.totalPages})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Page Name</th>
                <th className="px-4 py-3">URL Slug</th>
                <th className="px-4 py-3">WhatsApp Number</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Views</th>
                <th className="px-4 py-3">Clicks</th>
                <th className="px-4 py-3 rounded-r-xl text-right">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {landingPages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No landing pages created yet. Click "Create Landing Page" to start!
                  </td>
                </tr>
              ) : (
                landingPages.slice(0, 5).map((page) => (
                  <tr key={page.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-4 font-semibold text-white">{page.name}</td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-400">/p/{page.slug}</td>
                    <td className="px-4 py-4 text-xs text-slate-300">{page.whatsappNumber}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          page.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {page.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-300">{page.viewsCount}</td>
                    <td className="px-4 py-4 text-emerald-400 font-semibold">{page.clicksCount}</td>
                    <td className="px-4 py-4 text-right">
                      <a
                        href={`/p/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getAllLandingPagesForSuperAdminAction,
} from '@/actions/super-admin.actions';
import {
  toggleLandingPageStatusAction,
  deleteLandingPageAction,
} from '@/actions/landing-page.actions';
import { useToast } from '@/components/ui/toast';
import {
  FileText,
  Search,
  ExternalLink,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  MessageSquare,
  Building2,
} from 'lucide-react';

export default function SuperAdminLandingPagesPage() {
  const { toast } = useToast();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPages = async () => {
    setLoading(true);
    const data = await getAllLandingPagesForSuperAdminAction();
    setPages(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleToggleStatus = async (id: string) => {
    const res = await toggleLandingPageStatusAction(id);
    if (res.success) {
      toast(`Page status changed to ${res.status}`);
      fetchPages();
    } else {
      toast(res.error || 'Failed to toggle status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this landing page? This action cannot be undone.')) {
      return;
    }
    const res = await deleteLandingPageAction(id);
    if (res.success) {
      toast('Landing page deleted successfully');
      fetchPages();
    } else {
      toast(res.error || 'Failed to delete landing page', 'error');
    }
  };

  const filteredPages = pages.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.workspace?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.workspace?.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            All System Landing Pages
          </h1>
          <p className="text-sm text-slate-400">
            Global repository of landing pages created across all customer workspaces
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by page name, slug, owner email, or workspace..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Landing Pages Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Page Info</th>
                <th className="px-6 py-4">Owner / Workspace</th>
                <th className="px-6 py-4">WhatsApp CTA</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Analytics</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Loading landing pages...
                  </td>
                </tr>
              ) : filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No landing pages found.
                  </td>
                </tr>
              ) : (
                filteredPages.map((page) => (
                  <tr key={page.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {page.logoUrl ? (
                          <img src={page.logoUrl} alt={page.name} className="w-10 h-10 rounded-xl object-contain bg-white p-1 border border-slate-700" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                            {page.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-white leading-tight">{page.name}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">/p/{page.slug}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-semibold text-white text-xs">{page.workspace?.name || 'No Workspace'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{page.workspace?.user?.email || 'N/A'}</p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>+{page.whatsappNumber}</span>
                      </p>
                      <p className="text-xs text-slate-400 truncate max-w-[150px] mt-0.5">{page.buttonText}</p>
                    </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(page.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                          page.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {page.status === 'ACTIVE' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Draft</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="px-6 py-4 text-xs">
                      <p className="text-slate-300 font-semibold">{page.viewsCount || 0} Views</p>
                      <p className="text-emerald-400 font-semibold">{page.clicksCount || 0} Clicks</p>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/p/${page.slug}`}
                          target="_blank"
                          title="View Live Page"
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/dashboard/landing-pages/${page.id}/edit`}
                          title="Edit Page"
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(page.id)}
                          title="Delete Page"
                          className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

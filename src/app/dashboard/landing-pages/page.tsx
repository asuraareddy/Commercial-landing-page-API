'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getLandingPagesAction,
  deleteLandingPageAction,
  duplicateLandingPageAction,
  toggleLandingPageStatusAction,
} from '@/actions/landing-page.actions';
import { useToast } from '@/components/ui/toast';
import { Modal } from '@/components/ui/modal';
import { LandingPageTemplate } from '@/components/landing/landing-page-template';
import {
  Plus,
  Search,
  Copy,
  Edit,
  Trash2,
  ExternalLink,
  Eye,
  MousePointerClick,
  Power,
  Sparkles,
} from 'lucide-react';

export default function AdminLandingPagesListPage() {
  const { toast } = useToast();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Preview Modal
  const [previewPage, setPreviewPage] = useState<any | null>(null);

  const fetchPages = async () => {
    setLoading(true);
    const data = await getLandingPagesAction();
    setPages(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleToggleStatus = async (id: string) => {
    const res = await toggleLandingPageStatusAction(id);
    if (res.success) {
      toast(`Status updated to ${res.status}`);
      fetchPages();
    } else {
      toast(res.error || 'Failed to toggle status', 'error');
    }
  };

  const handleDuplicate = async (id: string) => {
    const res = await duplicateLandingPageAction(id);
    if (res.success) {
      toast('Landing page duplicated successfully!');
      fetchPages();
    } else {
      toast(res.error || 'Failed to duplicate page', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this landing page?')) return;
    const res = await deleteLandingPageAction(id);
    if (res.success) {
      toast('Landing page deleted');
      fetchPages();
    } else {
      toast(res.error || 'Failed to delete page', 'error');
    }
  };

  const filteredPages = pages.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.companyName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Landing Pages</h1>
          <p className="text-sm text-slate-400">Manage and monitor all Meta Ads WhatsApp bridge pages</p>
        </div>
        <Link
          href="/dashboard/landing-pages/new"
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Landing Page</span>
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, slug, or company..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Pages ({pages.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === 'INACTIVE'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Pages Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Page Details</th>
                <th className="px-6 py-4">WhatsApp & Meta Pixel</th>
                <th className="px-6 py-4">Traffic & Leads</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Loading landing pages...
                  </td>
                </tr>
              ) : filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No landing pages found.
                  </td>
                </tr>
              ) : (
                filteredPages.map((page) => (
                  <tr key={page.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {page.mediaUrl && page.mediaType === 'IMAGE' ? (
                          <img src={page.mediaUrl} alt={page.name} className="w-10 h-10 rounded-xl object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400">
                            {page.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-white block">{page.name}</span>
                          <span className="font-mono text-xs text-slate-400 block">/p/{page.slug}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 space-y-1">
                      <p className="text-xs font-medium text-slate-200">+{page.whatsappNumber}</p>
                      <p className="text-[11px] text-slate-500">
                        Pixel ID: {page.metaPixelId || 'Default Workspace Pixel'}
                      </p>
                    </td>

                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-sky-400" />
                          {page.viewsCount} views
                        </span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <MousePointerClick className="w-3.5 h-3.5 text-emerald-400" />
                          {page.clicksCount} clicks
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(page.id)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          page.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{page.status}</span>
                      </button>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPreviewPage(page)}
                          title="Quick Preview"
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={`/p/${page.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open Live URL"
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <Link
                          href={`/dashboard/landing-pages/${page.id}/edit`}
                          title="Edit Page"
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDuplicate(page.id)}
                          title="Duplicate Page"
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
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

      {/* Quick Live Preview Drawer Modal */}
      {previewPage && (
        <Modal
          isOpen={!!previewPage}
          onClose={() => setPreviewPage(null)}
          title={`Preview - ${previewPage.name}`}
          maxWidth="lg"
        >
          <div className="max-h-[80vh] overflow-y-auto rounded-xl border border-slate-800 bg-white">
            <LandingPageTemplate data={previewPage} isPreview={true} />
          </div>
        </Modal>
      )}
    </div>
  );
}

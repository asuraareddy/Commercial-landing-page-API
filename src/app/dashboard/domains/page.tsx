'use client';

import React, { useState, useEffect } from 'react';
import {
  getWorkspaceDomainsAction,
  addCustomDomainAction,
  setPrimaryDomainAction,
  deleteCustomDomainAction,
} from '@/actions/workspace.actions';
import { useToast } from '@/components/ui/toast';
import { Modal } from '@/components/ui/modal';
import { Globe, Plus, CheckCircle2, Trash2, Star, ShieldCheck, ArrowRight } from 'lucide-react';

export default function WorkspaceDomainsPage() {
  const { toast } = useToast();
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [domainInput, setDomainInput] = useState('');

  const fetchDomains = async () => {
    setLoading(true);
    const data = await getWorkspaceDomainsAction();
    setDomains(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await addCustomDomainAction(domainInput);
    if (res.success) {
      toast('Custom domain added successfully!');
      setIsAddOpen(false);
      setDomainInput('');
      fetchDomains();
    } else {
      toast(res.error || 'Failed to add domain', 'error');
    }
  };

  const handleSetPrimary = async (domainId: string) => {
    const res = await setPrimaryDomainAction(domainId);
    if (res.success) {
      toast('Primary domain updated!');
      fetchDomains();
    } else {
      toast(res.error || 'Failed to set primary domain', 'error');
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to remove this custom domain?')) return;
    const res = await deleteCustomDomainAction(domainId);
    if (res.success) {
      toast('Custom domain deleted');
      fetchDomains();
    } else {
      toast(res.error || 'Failed to delete domain', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Custom Domains</h1>
          <p className="text-sm text-slate-400">
            Connect white-label subdomains for branded Meta Ads bridge links (e.g. go.client.com)
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Domain</span>
        </button>
      </div>

      {/* DNS Configuration Guide Box */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          White-Label DNS Setup Instructions
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          To connect your custom domain, log in to your DNS provider (Cloudflare, GoDaddy, Namecheap) and add a CNAME record:
        </p>
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>Type: CNAME &nbsp;|&nbsp; Name: go (or chat) &nbsp;|&nbsp; Value: cname.wagateway.com</span>
          <span className="text-[10px] text-slate-500 font-sans font-semibold">SSL Auto-Provisioned</span>
        </div>
      </div>

      {/* Domains Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Domain Name</th>
                <th className="px-6 py-4">Primary Status</th>
                <th className="px-6 py-4">DNS Verification</th>
                <th className="px-6 py-4">Added Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading domains...</td>
                </tr>
              ) : domains.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No custom domains added yet. Click "Add Custom Domain" above.
                  </td>
                </tr>
              ) : (
                domains.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <span>{d.domainName}</span>
                    </td>
                    <td className="px-6 py-4">
                      {d.isPrimary ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          Primary Domain
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetPrimary(d.id)}
                          className="text-xs text-slate-400 hover:text-white underline font-medium"
                        >
                          Make Primary
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {d.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteDomain(d.id)}
                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Delete Domain"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Domain Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Custom White-Label Domain"
        description="Enter the domain or subdomain you wish to route to your landing pages."
      >
        <form onSubmit={handleAddDomain} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-slate-300">Domain Name</label>
            <input
              type="text"
              required
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="e.g. go.myclientagency.com"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none font-mono"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20"
            >
              Add Domain
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

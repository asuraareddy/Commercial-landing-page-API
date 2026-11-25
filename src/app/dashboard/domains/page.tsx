'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getWorkspaceDomainsAction,
  addCustomDomainAction,
  setPrimaryDomainAction,
  deleteCustomDomainAction,
  verifyWorkspaceDomainDnsAction,
} from '@/actions/workspace.actions';
import { DomainWithDnsView } from '@/lib/domain-service';
import { useToast } from '@/components/ui/toast';
import { Modal } from '@/components/ui/modal';
import { DnsConfigurationPanel } from '@/components/domains/dns-configuration-panel';
import {
  DomainStatusBadge,
  normalizeDomainConnectionStatus,
} from '@/components/domains/domain-status-badge';
import {
  Globe,
  Plus,
  Trash2,
  Star,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

export default function WorkspaceDomainsPage() {
  const { toast } = useToast();
  const [domains, setDomains] = useState<DomainWithDnsView[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [expandedDomainIds, setExpandedDomainIds] = useState<Record<string, boolean>>({});
  const [verifyingIds, setVerifyingIds] = useState<Record<string, boolean>>({});

  const fetchDomains = useCallback(async (preserveExpanded = true) => {
    const data = await getWorkspaceDomainsAction();
    setDomains(data);
    setLoading(false);
    setExpandedDomainIds((prev) => {
      const next: Record<string, boolean> = preserveExpanded ? { ...prev } : {};
      for (const d of data) {
        if (next[d.id] === undefined) {
          // Auto-expand all domains by default so users immediately see their DNS records & instructions
          next[d.id] = true;
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    fetchDomains(false);
  }, [fetchDomains]);

  // Automatic background propagation check for PENDING / FAILED domains every 30s
  useEffect(() => {
    const unverifiedDomains = domains.filter(
      (d) => normalizeDomainConnectionStatus(d.status) !== 'CONNECTED'
    );
    if (unverifiedDomains.length === 0) return;

    const interval = setInterval(async () => {
      let anyUpdated = false;
      for (const d of unverifiedDomains) {
        const res = await verifyWorkspaceDomainDnsAction(d.id);
        if (res.success && res.summary?.status === 'CONNECTED') {
          toast(`${d.domainName} DNS propagated and connected!`);
          anyUpdated = true;
        }
      }
      if (anyUpdated) {
        fetchDomains(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [domains, fetchDomains, toast]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await addCustomDomainAction(domainInput);
    setIsSubmitting(false);

    if (res.success && res.domain) {
      toast('Custom domain added! Configure the DNS records below to connect it.');
      setIsAddOpen(false);
      setDomainInput('');
      await fetchDomains(true);
      setExpandedDomainIds((prev) => ({ ...prev, [res.domain.id]: true }));
    } else {
      toast(res.error || 'Failed to add domain', 'error');
    }
  };

  const handleVerifyDns = async (domainId: string) => {
    setVerifyingIds((prev) => ({ ...prev, [domainId]: true }));
    const res = await verifyWorkspaceDomainDnsAction(domainId);
    setVerifyingIds((prev) => ({ ...prev, [domainId]: false }));

    if (res.success && res.summary) {
      if (res.summary.status === 'CONNECTED') {
        toast(`DNS verified! ${res.summary.domainName} is now Connected.`);
      } else if (res.summary.status === 'FAILED') {
        toast('DNS verification detected conflicting or incorrect records. See details below.', 'error');
      } else {
        toast('DNS records are still pending propagation. Check details below.', 'info');
      }
      await fetchDomains(true);
    } else {
      toast(res.error || 'Failed to verify DNS configuration', 'error');
    }
  };

  const handleSetPrimary = async (domainId: string) => {
    const res = await setPrimaryDomainAction(domainId);
    if (res.success) {
      toast('Primary domain updated!');
      fetchDomains(true);
    } else {
      toast(res.error || 'Failed to set primary domain', 'error');
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to remove this custom domain?')) return;
    const res = await deleteCustomDomainAction(domainId);
    if (res.success) {
      toast('Custom domain deleted');
      fetchDomains(true);
    } else {
      toast(res.error || 'Failed to delete domain', 'error');
    }
  };

  const connectedCount = domains.filter(
    (d) => normalizeDomainConnectionStatus(d.status) === 'CONNECTED'
  ).length;
  const pendingCount = domains.filter(
    (d) => normalizeDomainConnectionStatus(d.status) === 'PENDING'
  ).length;
  const failedCount = domains.filter(
    (d) => normalizeDomainConnectionStatus(d.status) === 'FAILED'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Custom Domains &amp; DNS Configuration
          </h1>
          <p className="text-sm text-slate-400">
            Connect white-label domains and verify live DNS propagation for your landing pages
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Domain</span>
        </button>
      </div>

      {/* Domain Status Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] uppercase font-semibold text-slate-400">Total Domains</span>
          <p className="text-2xl font-black text-white mt-1">{domains.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] uppercase font-semibold text-emerald-400">Connected</span>
          <p className="text-2xl font-black text-white mt-1">{connectedCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] uppercase font-semibold text-amber-400">Pending</span>
          <p className="text-2xl font-black text-white mt-1">{pendingCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] uppercase font-semibold text-rose-400">Failed</span>
          <p className="text-2xl font-black text-white mt-1">{failedCount}</p>
        </div>
      </div>

      {/* Domains Inventory & Independent DNS Config Panels */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm">
            Loading workspace domains and checking DNS records...
          </div>
        ) : domains.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
            <Globe className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-white">No custom domains connected yet</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Add a domain or subdomain (such as <code className="text-emerald-400">skybook.live</code> or <code className="text-emerald-400">go.yourbrand.com</code>) to automatically generate its required DNS records.
            </p>
          </div>
        ) : (
          domains.map((d) => {
            const isExpanded = expandedDomainIds[d.id] ?? true;
            const isVerifying = !!verifyingIds[d.id];

            return (
              <div
                key={d.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-all"
              >
                {/* Domain Summary Row */}
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3 flex-wrap">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <Globe className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-white text-base">{d.domainName}</span>
                        {d.isPrimary ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            Primary
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetPrimary(d.id)}
                            className="text-xs text-slate-400 hover:text-white underline font-medium"
                          >
                            Make Primary
                          </button>
                        )}
                        <DomainStatusBadge status={d.status} />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Added {new Date(d.createdAt).toLocaleDateString()} &middot;{' '}
                        {d._count?.landingPages ?? 0} landing page(s)
                      </p>
                    </div>
                  </div>

                  {/* Row Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleVerifyDns(d.id)}
                      disabled={isVerifying}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-xs font-semibold text-slate-200 transition-colors inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                      <span>{isVerifying ? 'Checking...' : 'Verify DNS'}</span>
                    </button>

                    <button
                      onClick={() =>
                        setExpandedDomainIds((prev) => ({
                          ...prev,
                          [d.id]: !isExpanded,
                        }))
                      }
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5 ${
                        isExpanded
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>{isExpanded ? 'Hide DNS Setup' : 'DNS Setup & Records'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => handleDeleteDomain(d.id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                      title="Delete Domain"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expandable Per-Domain DNS Configuration Panel */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-800/60">
                    <DnsConfigurationPanel
                      domain={d}
                      onVerify={handleVerifyDns}
                      isVerifying={isVerifying}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Domain Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Custom White-Label Domain"
        description="Enter the domain or subdomain you wish to connect. Required DNS records will be generated automatically."
      >
        <form onSubmit={handleAddDomain} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-slate-300">Domain Name</label>
            <input
              type="text"
              required
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="e.g. skybook.live or go.myclientagency.com"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none font-mono"
            />
            <p className="text-[11px] text-slate-400">
              Supports root/apex domains (skybook.live) and subdomains (go.client.com, chat.client.com).
            </p>
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
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20"
            >
              {isSubmitting ? 'Generating DNS...' : 'Add Domain'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

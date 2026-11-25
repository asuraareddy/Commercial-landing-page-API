'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getAllDomainsAction,
  createGlobalDomainAction,
  toggleGlobalDomainStatusAction,
  deleteGlobalDomainAction,
  getWorkspaceOptionsAction,
  verifyAnyDomainDnsAction,
} from '@/actions/super-admin.actions';
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
  Power,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react';

export default function SuperAdminDomainsPage() {
  const { toast } = useToast();
  const [domains, setDomains] = useState<DomainWithDnsView[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONNECTED' | 'PENDING' | 'FAILED'>('ALL');
  const [expandedDomainId, setExpandedDomainId] = useState<string | null>(null);
  const [verifyingIds, setVerifyingIds] = useState<Record<string, boolean>>({});

  // Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchDomains = useCallback(async (preserveExpanded = true) => {
    const [data, wsData] = await Promise.all([
      getAllDomainsAction(),
      getWorkspaceOptionsAction(),
    ]);
    setDomains(data);
    setWorkspaces(wsData);
    setLoading(false);
    if (!preserveExpanded && data.length > 0) {
      setExpandedDomainId(data[0].id);
    } else if (data.length > 0) {
      setExpandedDomainId((prev) => prev ?? data[0].id);
    }
  }, []);

  useEffect(() => {
    fetchDomains(false);
  }, [fetchDomains]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName.trim()) {
      toast('Domain name is required', 'error');
      return;
    }

    if (!selectedWorkspaceId) {
      toast('Please select a workspace for this domain', 'error');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('domainName', newDomainName);
    formData.append('workspaceId', selectedWorkspaceId);

    const res = await createGlobalDomainAction(formData);
    setSubmitting(false);

    if (res.success && res.domain) {
      toast('Global domain added! Inspect DNS records below.');
      setIsAddOpen(false);
      setNewDomainName('');
      setSelectedWorkspaceId('');
      await fetchDomains(true);
      setExpandedDomainId(res.domain.id);
    } else {
      toast(res.error || 'Failed to add domain', 'error');
    }
  };

  const handleVerifyDns = async (domainId: string) => {
    setVerifyingIds((prev) => ({ ...prev, [domainId]: true }));
    const res = await verifyAnyDomainDnsAction(domainId);
    setVerifyingIds((prev) => ({ ...prev, [domainId]: false }));

    if (res.success && res.summary) {
      if (res.summary.status === 'CONNECTED') {
        toast(`Verified: ${res.summary.domainName} is Connected.`);
      } else if (res.summary.status === 'FAILED') {
        toast(`${res.summary.domainName} has conflicting/incorrect DNS records.`, 'error');
      } else {
        toast(`${res.summary.domainName} is still Pending DNS propagation.`, 'info');
      }
      await fetchDomains(true);
    } else {
      toast(res.error || 'Failed to verify DNS configuration', 'error');
    }
  };

  const handleToggleStatus = async (id: string) => {
    const res = await toggleGlobalDomainStatusAction(id);
    if (res.success) {
      toast('Domain status updated');
      fetchDomains(true);
    } else {
      toast(res.error || 'Failed to toggle status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this domain from global inventory?')) {
      return;
    }

    const res = await deleteGlobalDomainAction(id);
    if (res.success) {
      toast('Global domain deleted');
      if (expandedDomainId === id) setExpandedDomainId(null);
      fetchDomains(true);
    } else {
      toast(res.error || 'Failed to delete domain', 'error');
    }
  };

  const filteredDomains = domains.filter((d) => {
    const normalized = normalizeDomainConnectionStatus(d.status);
    if (statusFilter !== 'ALL' && normalized !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      d.domainName.toLowerCase().includes(q) ||
      (d.workspace?.name || '').toLowerCase().includes(q) ||
      (d.workspace?.user?.email || '').toLowerCase().includes(q)
    );
  });

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
            Global Domains &amp; DNS Configuration
          </h1>
          <p className="text-sm text-slate-400">
            Manage custom domain inventory, inspect DNS records, and verify propagation across all client workspaces
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Global Domain</span>
        </button>
      </div>

      {/* Global Stats */}
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

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by domain, workspace, or owner email..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(['ALL', 'CONNECTED', 'PENDING', 'FAILED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === status
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {status === 'ALL'
                ? 'All'
                : status === 'CONNECTED'
                ? 'Connected'
                : status === 'PENDING'
                ? 'Pending'
                : 'Failed'}
            </button>
          ))}
        </div>
      </div>

      {/* Domains List with Expandable DNS Panels */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm">
            Loading global domain inventory and checking DNS status...
          </div>
        ) : filteredDomains.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm">
            No global domains found.
          </div>
        ) : (
          filteredDomains.map((domain) => {
            const isExpanded = expandedDomainId === domain.id;
            const isVerifying = !!verifyingIds[domain.id];

            return (
              <div
                key={domain.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
              >
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-bold text-white text-base">{domain.domainName}</span>
                      {domain.isPrimary ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Primary
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400">
                          Secondary
                        </span>
                      )}
                      <DomainStatusBadge status={domain.status} />
                    </div>
                    <p className="text-xs text-slate-400">
                      Workspace: <strong className="text-slate-200">{domain.workspace?.name || 'Global Pool'}</strong>
                      {domain.workspace?.user?.email && (
                        <>
                          {' '}
                          &middot; Owner: <span className="text-slate-300">{domain.workspace.user.email}</span>
                        </>
                      )}{' '}
                      &middot; {domain._count?.landingPages ?? 0} page(s) &middot; Added{' '}
                      {new Date(domain.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleVerifyDns(domain.id)}
                      disabled={isVerifying}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-xs font-semibold text-slate-200 transition-colors inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                      <span>{isVerifying ? 'Checking...' : 'Verify DNS'}</span>
                    </button>

                    <button
                      onClick={() => setExpandedDomainId(isExpanded ? null : domain.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5 ${
                        isExpanded
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>{isExpanded ? 'Hide DNS Details' : 'Inspect DNS Records'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => handleToggleStatus(domain.id)}
                      title="Toggle Domain Status"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      <Power className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(domain.id)}
                      title="Delete Domain"
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-800/60">
                    <DnsConfigurationPanel
                      domain={domain}
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
        title="Add Global Domain to Inventory"
        description="Register a new custom domain or CNAME endpoint for landing page routing."
      >
        <form onSubmit={handleAddDomain} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-slate-300">Domain Name *</label>
            <input
              type="text"
              required
              value={newDomainName}
              onChange={(e) => setNewDomainName(e.target.value)}
              placeholder="e.g. skybook.live or go.apexdigital.com"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-slate-300">Assign to Workspace *</label>
            <select
              required
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="" disabled>Select an admin/workspace</option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} ({ws.user?.email})
                </option>
              ))}
            </select>
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
              disabled={submitting}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20"
            >
              {submitting ? 'Adding...' : 'Add Domain'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

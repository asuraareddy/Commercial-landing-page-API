'use client';

import React, { useState, useEffect } from 'react';
import {
  getAllDomainsAction,
  createGlobalDomainAction,
  toggleGlobalDomainStatusAction,
  deleteGlobalDomainAction,
} from '@/actions/super-admin.actions';
import { useToast } from '@/components/ui/toast';
import { Modal } from '@/components/ui/modal';
import {
  Globe,
  Plus,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Power,
  Search,
} from 'lucide-react';

export default function SuperAdminDomainsPage() {
  const { toast } = useToast();
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDomains = async () => {
    setLoading(true);
    const data = await getAllDomainsAction();
    setDomains(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName.trim()) {
      toast('Domain name is required', 'error');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('domainName', newDomainName);

    const res = await createGlobalDomainAction(formData);
    setSubmitting(false);

    if (res.success) {
      toast('Global domain added successfully!');
      setIsAddOpen(false);
      setNewDomainName('');
      fetchDomains();
    } else {
      toast(res.error || 'Failed to add domain', 'error');
    }
  };

  const handleToggleStatus = async (id: string) => {
    const res = await toggleGlobalDomainStatusAction(id);
    if (res.success) {
      toast('Domain status updated');
      fetchDomains();
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
      fetchDomains();
    } else {
      toast(res.error || 'Failed to delete domain', 'error');
    }
  };

  const filteredDomains = domains.filter(
    (d) =>
      d.domainName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.workspace?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.workspace?.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Global Domains Inventory & Settings
          </h1>
          <p className="text-sm text-slate-400">
            Manage custom domain inventory and white-label routing endpoints for customer landing pages
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Global Domain</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search global domains..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Domains Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Domain Name</th>
                <th className="px-6 py-4">Assigned Workspace</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Loading global domain inventory...
                  </td>
                </tr>
              ) : filteredDomains.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No global domains registered.
                  </td>
                </tr>
              ) : (
                filteredDomains.map((domain) => (
                  <tr key={domain.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <span>{domain.domainName}</span>
                    </td>

                    <td className="px-6 py-4 text-slate-300">
                      <p className="font-semibold text-white text-xs">{domain.workspace?.name || 'Global Pool'}</p>
                      <p className="text-xs text-slate-500">{domain.workspace?.user?.email || 'System'}</p>
                    </td>

                    <td className="px-6 py-4">
                      {domain.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Pending / Disabled
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(domain.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(domain.id)}
                          title={domain.status === 'ACTIVE' ? 'Disable Domain' : 'Enable Domain'}
                          className={`p-2 rounded-lg transition-colors ${
                            domain.status === 'ACTIVE'
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(domain.id)}
                          title="Delete Domain"
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
              placeholder="e.g. go.apexdigital.com"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
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

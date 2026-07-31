'use client';

import React, { useState, useEffect } from 'react';
import {
  getAdminsAction,
  createAdminAction,
  toggleSuspendAdminAction,
  deleteAdminAction,
  resetAdminPasswordAction,
} from '@/actions/super-admin.actions';
import { UserRole } from '@/lib/types';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import {
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  Key,
  Trash2,
  Building2,
  Mail,
  Search,
} from 'lucide-react';

export default function SuperAdminAdminsPage() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

  // Form states
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createWsName, setCreateWsName] = useState('');

  const [newPassword, setNewPassword] = useState('');

  const fetchAdmins = async () => {
    setLoading(true);
    const data = await getAdminsAction();
    setAdmins(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('email', createEmail);
    formData.append('password', createPassword);
    formData.append('workspaceName', createWsName);

    const res = await createAdminAction(formData);
    if (res.success) {
      toast('New Admin account and workspace created successfully');
      setIsCreateOpen(false);
      setCreateEmail('');
      setCreatePassword('');
      setCreateWsName('');
      fetchAdmins();
    } else {
      toast(res.error || 'Failed to create admin', 'error');
    }
  };

  const handleToggleSuspend = async (adminId: string) => {
    const res = await toggleSuspendAdminAction(adminId);
    if (res.success) {
      toast(res.isSuspended ? 'Admin account suspended' : 'Admin account reactivated');
      fetchAdmins();
    } else {
      toast(res.error || 'Operation failed', 'error');
    }
  };

  const handleDelete = async (adminId: string) => {
    if (!confirm('Are you sure you want to delete this Admin and their Workspace? This cannot be undone.')) {
      return;
    }
    const res = await deleteAdminAction(adminId);
    if (res.success) {
      toast('Admin account deleted successfully');
      fetchAdmins();
    } else {
      toast(res.error || 'Failed to delete admin', 'error');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdminId) return;

    const res = await resetAdminPasswordAction(selectedAdminId, newPassword);
    if (res.success) {
      toast('Admin password reset successfully');
      setIsResetOpen(false);
      setNewPassword('');
      setSelectedAdminId(null);
    } else {
      toast(res.error || 'Failed to reset password', 'error');
    }
  };

  const filteredAdmins = admins.filter(
    (a) =>
      a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.workspace?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Admin Accounts</h1>
          <p className="text-sm text-slate-400">Manage tenant customers, workspace owners, and authentication</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create New Admin</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by email or workspace..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Admin Email</th>
                <th className="px-6 py-4">Workspace</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Landing Pages</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Loading admin accounts...
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No admin accounts found.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-emerald-400">
                        {admin.email.charAt(0).toUpperCase()}
                      </div>
                      <span>{admin.email}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-medium">
                      {admin.workspace?.name || 'No Workspace'}
                    </td>
                    <td className="px-6 py-4">
                      {admin.isSuspended ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {admin.workspace?._count?.landingPages || 0} pages
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedAdminId(admin.id);
                            setIsResetOpen(true);
                          }}
                          title="Reset Password"
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleSuspend(admin.id)}
                          title={admin.isSuspended ? 'Unsuspend Admin' : 'Suspend Admin'}
                          className={`p-2 rounded-lg transition-colors ${
                            admin.isSuspended
                              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                          }`}
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(admin.id)}
                          title="Delete Admin"
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

      {/* Create Admin Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Admin Account"
        description="Creates a new tenant user account and initializes their dedicated workspace."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-slate-300">Admin Email</label>
            <input
              type="email"
              required
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              placeholder="customer@company.com"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-slate-300">Initial Password</label>
            <input
              type="password"
              required
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-slate-300">Workspace / Brand Name</label>
            <input
              type="text"
              required
              value={createWsName}
              onChange={(e) => setCreateWsName(e.target.value)}
              placeholder="Acme Growth Agency"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        title="Reset Admin Password"
        description="Set a new password for this customer account."
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-slate-300">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsResetOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-sm font-bold"
            >
              Update Password
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { getCurrentUserAction } from '@/actions/auth.actions';
import { updateUserProfilePasswordAction } from '@/actions/workspace.actions';
import { useToast } from '@/components/ui/toast';
import { User, Lock, Key, ShieldCheck } from 'lucide-react';

export default function AdminProfilePage() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCurrentUserAction().then((session) => setUser(session));
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const res = await updateUserProfilePasswordAction(currentPassword, newPassword);
    setSaving(false);

    if (res.success) {
      toast('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } else {
      toast(res.error || 'Failed to update password', 'error');
    }
  };

  if (!user) return <div className="py-12 text-center text-slate-500">Loading user profile...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Admin Profile</h1>
        <p className="text-sm text-slate-400">Account credentials, role status, and security settings</p>
      </div>

      {/* Account Details Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-400" />
          Account Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 uppercase font-semibold">Email Address</span>
            <p className="text-sm font-bold text-white">{user.email}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 uppercase font-semibold">Role Privilege</span>
            <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              {user.role}
            </p>
          </div>
        </div>
      </div>

      {/* Password Reset Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-400" />
          Change Password
        </h3>

        <form onSubmit={handlePasswordReset} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-slate-300">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-slate-300">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

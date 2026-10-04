'use client';

import React, { useState, useEffect } from 'react';
import { getAllWorkspacesAction, updateSubscriptionDetailsAction } from '@/actions/super-admin.actions';
import { SubscriptionStatus } from '@/lib/types';
import { useToast } from '@/components/ui/toast';
import { Modal } from '@/components/ui/modal';
import { Building2, FileText, Globe, CreditCard, ChevronDown, CheckCircle2, XCircle, AlertTriangle, Settings } from 'lucide-react';

export default function SuperAdminWorkspacesPage() {
  const { toast } = useToast();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Subscription Modal State
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);
  
  const [subData, setSubData] = useState({
    planName: 'Unlimited',
    duration: 'One Time',
    price: 500,
    status: 'ACTIVE' as SubscriptionStatus,
    expiryDate: '',
  });

  const fetchWorkspaces = async () => {
    setLoading(true);
    const data = await getAllWorkspacesAction();
    setWorkspaces(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const openSubModal = (ws: any) => {
    setSelectedWsId(ws.id);
    
    // Check if the current expiry matches a predefined plan
    const currentBilling = ws.subscription?.billingType || 'One Time';
    
    setSubData({
      planName: ws.subscription?.planName || 'Unlimited',
      duration: currentBilling,
      price: ws.subscription?.price || 500,
      status: (ws.subscription?.status as SubscriptionStatus) || 'ACTIVE',
      expiryDate: ws.subscription?.expiryDate ? new Date(ws.subscription.expiryDate).toISOString().split('T')[0] : '',
    });
    
    setIsSubModalOpen(true);
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const duration = e.target.value;
    let newExpiry = '';
    
    if (duration !== 'One Time' && duration !== 'Custom') {
      const now = new Date();
      if (duration === '1 Week') now.setDate(now.getDate() + 7);
      else if (duration === '1 Month') now.setMonth(now.getMonth() + 1);
      else if (duration === '3 Months') now.setMonth(now.getMonth() + 3);
      else if (duration === '6 Months') now.setMonth(now.getMonth() + 6);
      else if (duration === '1 Year') now.setFullYear(now.getFullYear() + 1);
      
      newExpiry = now.toISOString().split('T')[0];
    } else if (duration === 'One Time') {
      newExpiry = ''; // Never expires
    } else {
      // Custom: Keep existing or empty
      newExpiry = subData.expiryDate;
    }
    
    setSubData({ ...subData, duration, expiryDate: newExpiry });
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWsId) return;
    
    setSubmitting(true);
    const res = await updateSubscriptionDetailsAction(selectedWsId, {
      ...subData,
      billingType: subData.duration,
    });
    
    if (res.success) {
      toast('Subscription updated successfully!');
      setIsSubModalOpen(false);
      fetchWorkspaces();
    } else {
      toast(res.error || 'Failed to update', 'error');
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Tenant Workspaces</h1>
        <p className="text-sm text-slate-400">View all customer workspaces, landing pages, and modify subscriptions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500">Loading workspaces...</div>
        ) : workspaces.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">No workspaces found.</div>
        ) : (
          workspaces.map((ws) => (
            <div
              key={ws.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 flex flex-col justify-between shadow-xl"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {ws.logoUrl ? (
                      <img src={ws.logoUrl} alt={ws.name} className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center">
                        {ws.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-white tracking-tight">{ws.name}</h3>
                      <p className="text-xs text-slate-400">{ws.user?.email}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      ws.subscription?.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : ws.subscription?.status === 'EXPIRED'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {ws.subscription?.status || 'INACTIVE'}
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Landing Pages</span>
                    <span className="text-lg font-bold text-white">{ws.landingPages?.length || 0}</span>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Custom Domains</span>
                    <span className="text-lg font-bold text-white">{ws.domains?.length || 0}</span>
                  </div>
                </div>

                {/* Subscription Info */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-semibold text-slate-400 block">Subscription Plan</span>
                  <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-800/30 text-slate-300">
                    <div>
                      <div className="font-semibold text-white">{ws.subscription?.planName || 'Unknown Plan'}</div>
                      <div className="text-[10px] text-slate-500">
                        {ws.subscription?.billingType === 'One Time' 
                          ? 'Never expires' 
                          : `Expires: ${ws.subscription?.expiryDate ? new Date(ws.subscription.expiryDate).toLocaleDateString() : 'N/A'}`}
                      </div>
                    </div>
                    <div className="font-bold text-emerald-400">
                      ${ws.subscription?.price || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
                <button
                  onClick={() => openSubModal(ws)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-white transition-colors flex items-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Manage Subscription
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        title="Manage Subscription"
        description="Update plan duration, limits, and status for this customer."
      >
        <form onSubmit={handleSaveSubscription} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-slate-300">Plan Name</label>
            <input
              type="text"
              value={subData.planName}
              onChange={(e) => setSubData({ ...subData, planName: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-slate-300">Plan Duration</label>
              <select
                value={subData.duration}
                onChange={handleDurationChange}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="One Time">One Time (No Expiry)</option>
                <option value="1 Week">1 Week</option>
                <option value="1 Month">1 Month</option>
                <option value="3 Months">3 Months</option>
                <option value="6 Months">6 Months</option>
                <option value="1 Year">1 Year</option>
                <option value="Custom">Custom Date</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-slate-300">Price ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={subData.price}
                onChange={(e) => setSubData({ ...subData, price: parseFloat(e.target.value) })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {subData.duration !== 'One Time' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-slate-300">Expiry Date</label>
              <input
                type="date"
                value={subData.expiryDate}
                onChange={(e) => setSubData({ ...subData, expiryDate: e.target.value, duration: 'Custom' })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-slate-300">Account Status</label>
            <select
              value={subData.status}
              onChange={(e) => setSubData({ ...subData, status: e.target.value as SubscriptionStatus })}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Expired or Cancelled accounts cannot create or publish landing pages.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg transition-all disabled:opacity-50 mt-4"
          >
            {submitting ? 'Saving...' : 'Save Subscription'}
          </button>
        </form>
      </Modal>
    </div>
  );
}

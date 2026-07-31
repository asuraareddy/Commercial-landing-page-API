'use client';

import React, { useState, useEffect } from 'react';
import { getAllWorkspacesAction, updateSubscriptionStatusAction } from '@/actions/super-admin.actions';
import { SubscriptionStatus } from '@/lib/types';
import { useToast } from '@/components/ui/toast';
import { Modal } from '@/components/ui/modal';
import { Building2, FileText, Globe, CreditCard, ChevronDown, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export default function SuperAdminWorkspacesPage() {
  const { toast } = useToast();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWs, setSelectedWs] = useState<any | null>(null);

  const fetchWorkspaces = async () => {
    setLoading(true);
    const data = await getAllWorkspacesAction();
    setWorkspaces(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleUpdateStatus = async (workspaceId: string, status: SubscriptionStatus) => {
    const res = await updateSubscriptionStatusAction(workspaceId, status);
    if (res.success) {
      toast(`Subscription status updated to ${status}`);
      fetchWorkspaces();
    } else {
      toast('Failed to update subscription', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Tenant Workspaces</h1>
        <p className="text-sm text-slate-400">View all customer workspaces, landing pages, and modify subscription status</p>
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

                {/* Landing Pages List */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-semibold text-slate-400 block">Pages Inventory</span>
                  {ws.landingPages?.slice(0, 3).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-slate-800/30 text-slate-300">
                      <span className="truncate">{p.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">/{p.slug}</span>
                    </div>
                  ))}
                  {ws.landingPages?.length > 3 && (
                    <p className="text-[11px] text-slate-500 text-center">+{ws.landingPages.length - 3} more pages</p>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-emerald-400">
                  ${ws.subscription?.price || 500} {ws.subscription?.billingType || 'One Time'}
                </span>
                
                <select
                  value={ws.subscription?.status || 'ACTIVE'}
                  onChange={(e) => handleUpdateStatus(ws.id, e.target.value as SubscriptionStatus)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="ACTIVE">Set Active</option>
                  <option value="EXPIRED">Set Expired</option>
                  <option value="CANCELLED">Set Cancelled</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

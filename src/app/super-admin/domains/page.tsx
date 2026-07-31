'use client';

import React, { useState, useEffect } from 'react';
import { getAllDomainsAction } from '@/actions/super-admin.actions';
import { Globe, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SuperAdminDomainsPage() {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllDomainsAction().then((data) => {
      setDomains(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Global Domains Inventory</h1>
        <p className="text-sm text-slate-400">All custom white-label domains registered across tenant workspaces</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Domain Name</th>
                <th className="px-6 py-4">Workspace</th>
                <th className="px-6 py-4">Owner Email</th>
                <th className="px-6 py-4">Primary</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Added Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading domains...</td>
                </tr>
              ) : domains.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No custom domains found.</td>
                </tr>
              ) : (
                domains.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <span>{d.domainName}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-semibold">{d.workspace?.name}</td>
                    <td className="px-6 py-4 text-slate-400">{d.workspace?.user?.email}</td>
                    <td className="px-6 py-4">
                      {d.isPrimary ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Primary Domain
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Secondary</span>
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

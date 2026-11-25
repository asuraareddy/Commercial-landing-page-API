'use client';

import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { DnsRecordStatus, DomainStatus } from '@/lib/types';

export function normalizeDomainConnectionStatus(status?: string | null): 'CONNECTED' | 'PENDING' | 'FAILED' {
  if (!status) return 'PENDING';
  if (
    status === DomainStatus.CONNECTED ||
    status === DomainStatus.ACTIVE ||
    status === DomainStatus.VERIFIED
  ) {
    return 'CONNECTED';
  }
  if (status === DomainStatus.FAILED) {
    return 'FAILED';
  }
  return 'PENDING';
}

export function DomainStatusBadge({ status }: { status?: string | null }) {
  const normalized = normalizeDomainConnectionStatus(status);

  if (normalized === 'CONNECTED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Connected</span>
      </span>
    );
  }

  if (normalized === 'FAILED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <XCircle className="w-3.5 h-3.5" />
        <span>Failed</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <Clock className="w-3.5 h-3.5" />
      <span>Pending</span>
    </span>
  );
}

export function DnsRecordStatusBadge({ status }: { status: DnsRecordStatus }) {
  switch (status) {
    case DnsRecordStatus.VERIFIED:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          <span>Verified</span>
        </span>
      );
    case DnsRecordStatus.INCORRECT:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle className="w-3 h-3" />
          <span>Incorrect</span>
        </span>
      );
    case DnsRecordStatus.MISSING:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-3 h-3" />
          <span>Missing</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
          <Clock className="w-3 h-3" />
          <span>Pending</span>
        </span>
      );
  }
}

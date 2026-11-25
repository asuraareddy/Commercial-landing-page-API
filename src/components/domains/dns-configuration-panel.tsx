'use client';

import React, { useState, useEffect } from 'react';
import {
  Check,
  Copy,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  BookOpen,
  Lock,
  Server,
} from 'lucide-react';
import { DomainWithDnsView } from '@/lib/domain-service';
import { DnsRecordCheck } from '@/lib/types';
import { useToast } from '@/components/ui/toast';
import {
  DnsRecordStatusBadge,
  DomainStatusBadge,
  normalizeDomainConnectionStatus,
} from './domain-status-badge';

type RegistrarKey = 'godaddy' | 'cloudflare' | 'namecheap' | 'other';

interface DnsConfigurationPanelProps {
  domain: DomainWithDnsView;
  onVerify: (domainId: string) => Promise<void>;
  isVerifying?: boolean;
}

export function DnsConfigurationPanel({
  domain,
  onVerify,
  isVerifying = false,
}: DnsConfigurationPanelProps) {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { dnsSummary } = domain;
  const [registrar, setRegistrar] = useState<RegistrarKey>(
    dnsSummary.detectedRegistrar || 'godaddy'
  );

  useEffect(() => {
    if (dnsSummary.detectedRegistrar) {
      setRegistrar(dnsSummary.detectedRegistrar);
    }
  }, [dnsSummary.detectedRegistrar]);

  const normalizedStatus = normalizeDomainConnectionStatus(dnsSummary.status);
  const providerLabel = dnsSummary.detectedProviderName || 'Your Domain Registrar';

  const handleCopy = async (text: string, key: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast(`${label} copied to clipboard`);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
    } catch {
      toast('Failed to copy to clipboard', 'error');
    }
  };

  const conflictingRecords = dnsSummary.records.filter(
    (r) => r.status === 'INCORRECT' && r.actualValues && r.actualValues.length > 0
  );

  const renderRegistrarSteps = (records: DnsRecordCheck[]) => {
    const requiredRecords = records.filter((r) => r.required);
    const primaryRecord = requiredRecords[0];

    switch (registrar) {
      case 'godaddy':
        return (
          <ol className="space-y-2.5 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
            <li>
              Log in to <strong className="text-white">GoDaddy</strong> &rarr;{' '}
              <strong className="text-white">My Products</strong> &rarr;{' '}
              <strong className="text-white">Domains</strong> &rarr; click{' '}
              <strong className="text-white">DNS</strong> next to{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400">
                {dnsSummary.zoneName}
              </code>
              .
            </li>
            {conflictingRecords.length > 0 ? (
              <li>
                <strong className="text-rose-300">
                  Remove Conflicting Records Currently in GoDaddy:
                </strong>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-rose-200">
                  {conflictingRecords.map((cr) => (
                    <li key={cr.id}>
                      Delete (or edit) the existing <code>{cr.type}</code> record for{' '}
                      <code>{cr.name}</code> currently pointing to{' '}
                      <code className="text-rose-300 font-bold">
                        {cr.actualValues?.join(', ')}
                      </code>
                      {cr.conflictProvider ? ` (${cr.conflictProvider})` : ''}.
                    </li>
                  ))}
                </ul>
              </li>
            ) : (
              <li>
                If you see any default GoDaddy Airo / Parked <code>A</code> records on{' '}
                <code>@</code> (such as <code>76.223.105.230</code> or{' '}
                <code>13.248.243.5</code>), delete them first.
              </li>
            )}
            <li>
              <strong className="text-emerald-300">Add / Update These Records in GoDaddy:</strong>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-slate-200">
                {records.map((r) => (
                  <li key={r.id}>
                    Type: <strong className="text-white">{r.type}</strong> &nbsp;|&nbsp; Name:{' '}
                    <code className="text-emerald-400">{r.name}</code> &nbsp;|&nbsp; Value:{' '}
                    <code className="text-sky-300">{r.value}</code> &nbsp;|&nbsp; TTL:{' '}
                    <code>{r.ttl}s</code>
                  </li>
                ))}
              </ul>
            </li>
            <li>
              Click <strong className="text-white">Save</strong> in GoDaddy, then click{' '}
              <strong className="text-emerald-400">Verify DNS Configuration</strong> above. Once
              GoDaddy propagates, your domain status will automatically switch to{' '}
              <strong className="text-emerald-400">Connected</strong>.
            </li>
          </ol>
        );

      case 'cloudflare':
        return (
          <ol className="space-y-2.5 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
            <li>
              Log in to <strong className="text-white">Cloudflare</strong> and select{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400">
                {dnsSummary.zoneName}
              </code>{' '}
              &rarr; <strong className="text-white">DNS &rarr; Records</strong>.
            </li>
            {conflictingRecords.length > 0 && (
              <li>
                Delete or edit conflicting record(s):{' '}
                {conflictingRecords
                  .map((c) => `${c.type} "${c.name}" (${c.actualValues?.join(', ')})`)
                  .join('; ')}
                .
              </li>
            )}
            <li>
              Add each record from the table above (Type:{' '}
              <strong className="text-white">{primaryRecord?.type}</strong>, Name:{' '}
              <code className="text-emerald-400">{primaryRecord?.name}</code>, Target:{' '}
              <code className="text-sky-300">{primaryRecord?.value}</code>). Set Proxy status to{' '}
              <strong className="text-amber-300">DNS Only (grey cloud)</strong> during initial
              verification.
            </li>
            <li>
              Click <strong className="text-white">Save</strong>, then click{' '}
              <strong className="text-emerald-400">Verify DNS Configuration</strong> above.
            </li>
          </ol>
        );

      case 'namecheap':
        return (
          <ol className="space-y-2.5 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
            <li>
              Log in to <strong className="text-white">Namecheap</strong> &rarr;{' '}
              <strong className="text-white">Domain List</strong> &rarr; click{' '}
              <strong className="text-white">Manage</strong> next to{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400">
                {dnsSummary.zoneName}
              </code>{' '}
              &rarr; <strong className="text-white">Advanced DNS</strong>.
            </li>
            <li>
              Remove any conflicting or default Namecheap parking records, then add each record
              shown in the table above using the one-click Copy buttons.
            </li>
            <li>
              Save changes and click{' '}
              <strong className="text-emerald-400">Verify DNS Configuration</strong> above.
            </li>
          </ol>
        );

      case 'other':
        return (
          <ol className="space-y-2.5 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
            <li>
              Open the DNS Zone Editor for{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400">
                {dnsSummary.zoneName}
              </code>{' '}
              at <strong className="text-white">{providerLabel}</strong>.
            </li>
            <li>
              Remove any conflicting <code>A</code> or <code>CNAME</code> records shown in the{' '}
              <strong>Current Value in Your DNS</strong> column above.
            </li>
            <li>
              Add each record from the <strong>Required Value (Update To This)</strong> column
              above, save, and click{' '}
              <strong className="text-emerald-400">Verify DNS Configuration</strong>.
            </li>
          </ol>
        );
    }
  };

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-5">
      {/* Top Status & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Live DNS Configuration &amp; Diagnostics — {domain.domainName}</span>
            </h3>
            <DomainStatusBadge status={dnsSummary.status} />
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-900 text-slate-300 border border-slate-700">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>SSL: {dnsSummary.sslStatus}</span>
            </span>
            {dnsSummary.detectedProviderName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                <Server className="w-3 h-3 text-sky-400" />
                <span>Registrar: {dnsSummary.detectedProviderName}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Root Zone: <span className="font-mono text-slate-200">{dnsSummary.zoneName}</span>
            {dnsSummary.nameservers && dnsSummary.nameservers.length > 0 && (
              <>
                {' '}
                &middot; Nameservers:{' '}
                <span className="font-mono text-slate-300">
                  {dnsSummary.nameservers.join(', ')}
                </span>
              </>
            )}
            {dnsSummary.lastCheckedAt && (
              <>
                {' '}
                &middot; Last checked:{' '}
                <span className="text-slate-300">
                  {new Date(dnsSummary.lastCheckedAt).toLocaleTimeString()}
                </span>
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onVerify(domain.id)}
          disabled={isVerifying}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/15 transition-all inline-flex items-center gap-2 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
          <span>{isVerifying ? 'Checking Live DNS...' : 'Verify DNS Configuration'}</span>
        </button>
      </div>

      {/* Diagnostic Alert Banner */}
      {normalizedStatus === 'CONNECTED' ? (
        <div className="space-y-2.5">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-300">
                Domain Connected &amp; Routing Active
              </p>
              <p className="text-emerald-200/80 mt-0.5">
                All required DNS records are verified. Visitors to{' '}
                <strong className="text-white">
                  {dnsSummary.sslStatus === 'ACTIVE' ? 'https' : 'http'}://{domain.domainName}/&lt;slug&gt;
                </strong>{' '}
                are now routed directly to your active landing pages.
              </p>
            </div>
          </div>

          {dnsSummary.sslStatus !== 'ACTIVE' && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-300">
                  HTTPS / SSL Certificate Provisioning in Progress (HTTP is Live Now)
                </p>
                <p className="text-amber-200/90 leading-relaxed">
                  Your domain is already live over{' '}
                  <code className="text-white font-mono">http://{domain.domainName}</code>. Because DNS was recently updated, the edge network is currently issuing your HTTPS SSL certificate. To speed up HTTPS issuance immediately, ensure{' '}
                  <code className="text-white font-mono">{domain.domainName}</code> is added under{' '}
                  <strong className="text-white">Vercel Project &rarr; Settings &rarr; Domains</strong> and click{' '}
                  <strong className="text-white">Refresh</strong> next to the domain.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border text-xs ${
            normalizedStatus === 'FAILED'
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-200'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
          }`}
        >
          {normalizedStatus === 'FAILED' ? (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1.5">
            <p className="font-bold text-sm text-white">
              {normalizedStatus === 'FAILED'
                ? `Why ${domain.domainName} Is Not Showing Your Landing Page Yet:`
                : `Action Required in ${providerLabel} to Connect ${domain.domainName}:`}
            </p>
            {dnsSummary.warnings.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 opacity-95 leading-relaxed">
                {dnsSummary.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            ) : (
              <p className="opacity-90">
                Update the DNS records in {providerLabel} using the table below, then click Verify
                DNS Configuration.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Side-by-Side Current vs Required DNS Comparison Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-800/90 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-white">
            Required DNS Records (Compare Current Registrar Values vs Required Values)
          </span>
          <span className="text-[11px] text-slate-400">
            Click the copy icon next to any Host or Required Value
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/50 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Record Type</th>
                <th className="px-4 py-3">Host / Name</th>
                <th className="px-4 py-3">Current Value in {providerLabel} (Detected)</th>
                <th className="px-4 py-3">Required Value (Update To This)</th>
                <th className="px-4 py-3">TTL</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {dnsSummary.records.map((rec) => {
                const nameCopyKey = `${domain.id}-${rec.id}-name`;
                const valCopyKey = `${domain.id}-${rec.id}-val`;

                return (
                  <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Type */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-white w-fit">
                          {rec.type}
                        </span>
                        {rec.required ? (
                          <span className="text-[10px] text-emerald-400 font-semibold">
                            Required
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">
                            Recommended
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Host / Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono text-emerald-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 break-all font-bold">
                          {rec.name}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopy(rec.name, nameCopyKey, `${rec.type} Host/Name`)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0"
                          title="Copy Host / Name"
                        >
                          {copiedKey === nameCopyKey ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Current Value Detected in DNS */}
                    <td className="px-4 py-3.5">
                      {rec.status === 'VERIFIED' ? (
                        <div className="space-y-0.5">
                          <code className="font-mono text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-800/60 break-all inline-block">
                            {rec.actualValues?.join(', ') || rec.value}
                          </code>
                          <p className="text-[10px] text-emerald-400 font-medium">
                            Matches required value
                          </p>
                        </div>
                      ) : rec.actualValues && rec.actualValues.length > 0 ? (
                        <div className="space-y-1">
                          <code className="font-mono text-rose-300 bg-rose-950/50 px-2 py-1 rounded border border-rose-800/60 break-all inline-block">
                            {rec.actualValues.join(', ')}
                          </code>
                          {rec.conflictProvider ? (
                            <p className="text-[11px] text-rose-400 font-semibold">
                              ⚠️ Pointing to {rec.conflictProvider} — Delete/Replace in{' '}
                              {providerLabel}
                            </p>
                          ) : (
                            <p className="text-[11px] text-rose-400 font-medium">
                              ⚠️ Incorrect target — Replace with required value
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-amber-400 font-mono text-[11px]">
                          Not added in {providerLabel} yet
                        </span>
                      )}
                    </td>

                    {/* Required Value */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <code className="font-mono text-sky-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 break-all max-w-xs sm:max-w-sm font-bold">
                            {rec.value}
                          </code>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(rec.value, valCopyKey, `${rec.type} Required Value`)
                            }
                            className="px-2 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-white transition-colors shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold"
                            title="Copy Required Value"
                          >
                            {copiedKey === valCopyKey ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400">{rec.purpose}</p>
                      </div>
                    </td>

                    {/* TTL */}
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-400">
                      {rec.ttl}s
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <DnsRecordStatusBadge status={rec.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step-by-Step Registrar Instructions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Step-by-Step Instructions to Update DNS in {providerLabel}
            </span>
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'godaddy', label: 'GoDaddy' },
                { id: 'cloudflare', label: 'Cloudflare' },
                { id: 'namecheap', label: 'Namecheap' },
                { id: 'other', label: 'Other Registrars' },
              ] as const
            ).map((tab) => {
              const isDetected = dnsSummary.detectedRegistrar === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRegistrar(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    registrar === tab.id
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                  {isDetected ? ' (Detected)' : ''}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-1">{renderRegistrarSteps(dnsSummary.records)}</div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerAdminUserAction } from '@/actions/auth.actions';
import { CreditCard, ShieldCheck, CheckCircle2, Lock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PaymentSimulationPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulated card inputs
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('123');

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('wa_signup_draft');
      if (!saved) {
        router.push('/signup');
        return;
      }
      setDraft(JSON.parse(saved));
    } catch {
      router.push('/signup');
    }
  }, [router]);

  const handleCompletePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('businessName', draft.businessName);
    formData.append('fullName', draft.fullName);
    formData.append('email', draft.email);
    formData.append('phone', draft.phone);
    formData.append('password', draft.password);

    const res = await registerAdminUserAction(formData);
    setLoading(false);

    if (res.success) {
      sessionStorage.removeItem('wa_signup_draft');
      router.push('/login?registered=1');
    } else {
      setError(res.error || 'Payment processing failed. Please try again.');
    }
  };

  if (!draft) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading signup details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 font-sans selection:bg-emerald-500/20 selection:text-emerald-400">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg space-y-8"
      >
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black text-2xl shadow-xl shadow-emerald-500/20">
            WA
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Complete Subscription
          </h1>
          <p className="text-sm text-slate-400">
            Activate your WA Gateway unlimited license
          </p>
        </div>

        {/* Plan Summary Card */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                Unlimited SaaS License
              </span>
              <span className="text-lg font-bold text-white block mt-0.5">
                {draft.businessName}
              </span>
              <span className="text-xs text-slate-400 block">
                {draft.email}
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-400">$500</span>
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">One-Time</span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Unlimited Micro Landing Pages</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Unlimited Custom Domain Connections</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Meta Pixel & Analytics Integration</span>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium text-center">
              {error}
            </div>
          )}

          {/* Simulated Checkout Form */}
          <form onSubmit={handleCompletePayment} className="space-y-4 pt-2">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider block">
              Payment Details (Simulation Mode)
            </span>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Cardholder Name
              </label>
              <input
                type="text"
                readOnly
                value={draft.fullName}
                className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-slate-300 text-sm focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Card Number
              </label>
              <div className="relative">
                <CreditCard className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-800/80 border border-slate-700/60 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Expiry Date
                </label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700/60 rounded-xl text-white text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  CVC / CVV
                </label>
                <input
                  type="password"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700/60 rounded-xl text-white text-sm focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all text-sm mt-4 disabled:opacity-50"
            >
              {loading ? (
                'Processing Payment & Account Creation...'
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Pay $500 & Activate Account</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <Link href="/signup" className="text-xs text-slate-400 hover:text-white transition-colors">
              ← Edit Registration Details
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

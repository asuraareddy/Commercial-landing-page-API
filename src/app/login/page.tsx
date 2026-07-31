'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loginAction } from '@/actions/auth.actions';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    const res = await loginAction(formData);
    setLoading(false);

    if (res.success && res.redirectUrl) {
      const fromUrl = searchParams.get('from');
      router.push(fromUrl || res.redirectUrl);
      router.refresh();
    } else {
      setError(res.error || 'Invalid email or password');
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
      {registered && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium text-center">
          🎉 Account created successfully! Please log in with your email and password.
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full pl-11 pr-4 py-3 bg-slate-800/80 border border-slate-700/60 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-emerald-400 hover:underline font-medium"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-500" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-11 pr-4 py-3 bg-slate-800/80 border border-slate-700/60 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all text-sm disabled:opacity-50"
        >
          {loading ? (
            'Signing in...'
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="pt-4 border-t border-slate-800/80 text-center">
        <p className="text-xs text-slate-400">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-emerald-400 font-semibold hover:underline">
            Get Started
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 font-sans selection:bg-emerald-500/20 selection:text-emerald-400">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black text-2xl shadow-xl shadow-emerald-500/20">
            WA
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Sign In to WA Gateway
          </h1>
          <p className="text-sm text-slate-400">
            Enter your credentials to access your dashboard
          </p>
        </div>

        <Suspense fallback={<div className="p-8 text-center text-slate-400 bg-slate-900 rounded-3xl">Loading login form...</div>}>
          <LoginForm />
        </Suspense>
      </motion.div>
    </div>
  );
}

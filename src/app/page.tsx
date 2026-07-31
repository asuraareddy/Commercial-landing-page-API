import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, Globe, MessageSquare, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "WA Gateway - WhatsApp Landing Page & Bridge Platform",
  description: "Create high-converting micro landing pages connecting Meta Ads to WhatsApp.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-400">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              WA
            </div>
            <div>
              <span className="font-extrabold text-xl text-white tracking-tight block leading-none">
                WA Gateway
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block mt-1">
                WhatsApp SaaS Platform
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 font-semibold text-sm transition-all"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 border-b border-slate-800/60 bg-gradient-to-b from-slate-900/50 via-slate-950 to-slate-950 flex-grow flex items-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide">
            <Zap className="w-4 h-4" />
            <span>High-Converting WhatsApp Bridge SaaS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            Connect Meta Ads Directly to WhatsApp
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            WA Gateway helps businesses create white-label micro landing pages, manage custom domains, track Meta Pixel analytics, and instantly route leads to WhatsApp.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-extrabold text-base shadow-xl shadow-emerald-500/25 transition-all"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-200 font-bold text-base transition-all"
            >
              <span>Sign In to Your Account</span>
            </Link>
          </div>

          {/* Features Pill List */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 text-left">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Custom Domains</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect custom domain names with instant automatic SSL and custom landing page routing.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">WhatsApp Bridge</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pre-filled messages, company media, logos, and custom CTAs designed for maximum conversion.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Meta Pixel Analytics</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Track page views, click-through rates, and Meta Lead events automatically in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 bg-slate-950 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 WA Gateway. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-slate-300 transition-colors">
              Login
            </Link>
            <Link href="/signup" className="hover:text-slate-300 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

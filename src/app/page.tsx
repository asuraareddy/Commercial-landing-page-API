import { Metadata } from "next";
import Link from "next/link";
import { pagesConfig } from "@/config/pages";
import { WhatsAppBridge } from "@/components/WhatsAppBridge";
import { ShieldCheck, MessageSquare, LayoutDashboard, Settings, ArrowRight, ExternalLink, Sparkles, Layers } from "lucide-react";

const config = pagesConfig.page1;

export const metadata: Metadata = {
  title: "WA Gateway - Commercial WhatsApp Landing Page SaaS Platform",
  description: "High-performance micro landing pages and bridge management platform connecting Meta Ads to WhatsApp.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-400">
      {/* Global SaaS Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black flex items-center justify-center text-lg shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              WA
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-tight block leading-none">
                WA Gateway
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block">
                Commercial SaaS Platform
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              href="/dashboard"
              className="px-3.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-400" />
              <span>Customer Dashboard</span>
            </Link>
            <Link
              href="/super-admin"
              className="px-3.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Super Admin</span>
            </Link>
            <Link
              href="/admin"
              className="px-3.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
            >
              <Settings className="w-4 h-4 text-teal-400" />
              <span>Admin Config</span>
            </Link>
            <Link
              href="/p/summer-sale"
              className="px-3.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Landing Page Demo</span>
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-md shadow-emerald-500/20 transition-all"
            >
              <span>Sign In / Access SaaS</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-10 border-b border-slate-800/60 bg-gradient-to-b from-slate-900/60 via-slate-950 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Commercial WhatsApp Bridge & SaaS Portal</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight max-w-3xl mx-auto leading-tight">
            High-Performance WhatsApp Landing Page Platform
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Manage multi-tenant workspaces, white-label custom domains, Meta Pixel analytics, and high-converting WhatsApp bridges in one unified platform.
          </p>

          {/* Action Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto pt-6 text-left">
            <Link
              href="/login"
              className="p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all group shadow-xl"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors flex items-center justify-between">
                <span>Sign In Portal</span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Access Super Admin & Customer Admin accounts with quick credentials.
              </p>
            </Link>

            <Link
              href="/dashboard"
              className="p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-teal-500/50 transition-all group shadow-xl"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-3 group-hover:scale-110 transition-transform">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base group-hover:text-teal-400 transition-colors flex items-center justify-between">
                <span>Customer Dashboard</span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Create landing pages, connect custom domains, and track click analytics.
              </p>
            </Link>

            <Link
              href="/super-admin"
              className="p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition-all group shadow-xl"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base group-hover:text-purple-400 transition-colors flex items-center justify-between">
                <span>Super Admin</span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Manage clients, workspace subscriptions, custom domains, and platform admins.
              </p>
            </Link>

            <Link
              href="/p/summer-sale"
              className="p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all group shadow-xl"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                <ExternalLink className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition-colors flex items-center justify-between">
                <span>Live Landing Page</span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                View dynamic `/p/[slug]` custom domain landing page router in action.
              </p>
            </Link>
          </div>

          {/* Quick One-Click Demo Credentials Bar */}
          <div className="max-w-3xl mx-auto mt-6 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-300">
              <MessageSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span><strong>Demo Credentials:</strong> Super Admin (<code>admin@wagateway.com</code> / <code>admin123456</code>)</span>
            </div>
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold flex items-center gap-1 transition-colors flex-shrink-0"
            >
              <span>Go to Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Live Bridge Component Preview */}
      <section className="py-12 bg-white text-zinc-900 flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Live Preview
            </span>
            <h2 className="text-2xl font-bold text-zinc-900 mt-2">
              WhatsApp Bridge Component Demo
            </h2>
          </div>
          <WhatsAppBridge config={config} />
        </div>
      </section>
    </div>
  );
}

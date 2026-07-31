'use client';

import { motion } from 'framer-motion';
import { MessageSquare, ExternalLink, ShieldCheck } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/utils';
import { MetaPixel, trackWhatsAppClickEvent } from '@/components/analytics/meta-pixel';
import { trackPageViewAction, trackWhatsAppClickAction } from '@/actions/landing-page.actions';
import { useEffect } from 'react';

export interface LandingPageData {
  id?: string;
  name?: string;
  slug?: string;
  companyName: string;
  logoUrl?: string | null;
  mediaUrl?: string | null;
  mediaType: 'IMAGE' | 'VIDEO' | string;
  mediaWidth?: string;
  mediaHeight?: string;
  borderRadius?: string;
  shadow?: string;
  objectFit?: string;
  mediaPosition?: string;
  whatsappNumber: string;
  prefilledMessage?: string | null;
  buttonText: string;
  metaPixelId?: string | null;
  status?: string;
  workspace?: {
    defaultPixelId?: string | null;
    primaryColor?: string;
    buttonColor?: string;
  } | null;
}

interface LandingPageTemplateProps {
  data: LandingPageData;
  isPreview?: boolean;
}

export function LandingPageTemplate({ data, isPreview = false }: LandingPageTemplateProps) {
  const pixelId = data.metaPixelId || data.workspace?.defaultPixelId;
  const whatsappUrl = buildWhatsAppUrl(data.whatsappNumber, data.prefilledMessage);

  useEffect(() => {
    if (!isPreview && data.slug) {
      trackPageViewAction(data.slug);
    }
  }, [isPreview, data.slug]);

  const handleCtaClick = () => {
    if (!isPreview && data.slug) {
      trackWhatsAppClickAction(data.slug);
      trackWhatsAppClickEvent(pixelId);
    }
  };

  const isVideo =
    data.mediaType === 'VIDEO' ||
    !!data.mediaUrl?.match(/\.(mp4|webm|mov)($|\?)/i) ||
    data.mediaUrl?.startsWith('data:video');

  const getShadowClass = (s?: string) => {
    switch (s) {
      case 'none': return 'shadow-none';
      case 'sm': return 'shadow-sm';
      case 'md': return 'shadow-md';
      case 'lg': return 'shadow-xl shadow-black/5';
      case 'xl': return 'shadow-2xl shadow-emerald-950/10';
      default: return 'shadow-xl shadow-black/5';
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between items-center px-4 py-8 md:py-12 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {!isPreview && <MetaPixel pixelId={pixelId} />}

      {/* Main Centered Container */}
      <div className="w-full max-w-md mx-auto flex flex-col items-center text-center space-y-6 my-auto">
        
        {/* Company Logo */}
        {data.logoUrl ? (
          <motion.div
            key={`logo-${data.logoUrl}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden shadow-lg border border-slate-100 p-1 bg-white flex items-center justify-center"
          >
            <img
              src={data.logoUrl}
              alt={data.companyName}
              className="w-full h-full object-contain rounded-xl"
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-2xl shadow-lg"
          >
            {data.companyName?.charAt(0)?.toUpperCase() || 'W'}
          </motion.div>
        )}

        {/* Company Name */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-1"
        >
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            {data.companyName || 'Company Name'}
          </h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Verified WhatsApp Support
          </div>
        </motion.div>

        {/* Media Display (Image, GIF, or HTML5 Video) */}
        {data.mediaUrl && (
          <motion.div
            key={`media-${data.mediaUrl}-${data.mediaType}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full overflow-hidden transition-all duration-300"
            style={{
              width: data.mediaWidth || '100%',
              height: data.mediaHeight || '260px',
              borderRadius: data.borderRadius || '16px',
            }}
          >
            <div className={`w-full h-full overflow-hidden border border-slate-100 ${getShadowClass(data.shadow)}`}>
              {isVideo ? (
                <video
                  key={data.mediaUrl}
                  src={data.mediaUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls={false}
                  className="w-full h-full"
                  style={{ objectFit: (data.objectFit as any) || 'cover' }}
                />
              ) : (
                <img
                  key={data.mediaUrl}
                  src={data.mediaUrl}
                  alt={data.companyName}
                  className="w-full h-full"
                  style={{ objectFit: (data.objectFit as any) || 'cover' }}
                />
              )}
            </div>
          </motion.div>
        )}

        {/* Copy Messages */}
        <div className="space-y-2 px-2">
          <h2 className="text-lg md:text-xl font-semibold text-slate-800 tracking-tight">
            Thank you for your interest.
          </h2>
          <p className="text-sm md:text-base text-slate-500 font-normal leading-relaxed">
            Click below to continue your conversation on WhatsApp.
          </p>
        </div>

        {/* Large Green WhatsApp CTA Button */}
        <div className="w-full pt-2">
          <a
            href={isPreview ? '#' : whatsappUrl}
            target={isPreview ? '_self' : '_blank'}
            rel="noopener noreferrer"
            onClick={handleCtaClick}
            className="w-full group relative inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-semibold text-white bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.98] rounded-2xl shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/35 transition-all duration-200"
          >
            <MessageSquare className="w-6 h-6 fill-current text-white group-hover:scale-110 transition-transform duration-200" />
            <span>{data.buttonText || 'Continue to WhatsApp'}</span>
            <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </a>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          End-to-End Encrypted WhatsApp Chat
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="w-full text-center py-4 text-xs text-slate-400 font-medium">
        Powered by <span className="font-semibold text-slate-700">WA Gateway</span>
      </footer>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { createLandingPageAction, updateLandingPageAction } from '@/actions/landing-page.actions';
import { uploadMediaToSupabase } from '@/lib/supabase';
import { LandingPageTemplate, LandingPageData } from '@/components/landing/landing-page-template';
import { slugify } from '@/lib/utils';
import {
  Save,
  Upload,
  Eye,
  ArrowLeft,
  Sparkles,
  Image as ImageIcon,
  Video as VideoIcon,
  MessageSquare,
  Globe,
  Sliders,
} from 'lucide-react';
import Link from 'next/link';

interface LandingPageFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export function LandingPageForm({ initialData, isEdit = false }: LandingPageFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');

  const [formData, setFormData] = useState<LandingPageData>({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    companyName: initialData?.companyName || '',
    logoUrl: initialData?.logoUrl || '',
    mediaUrl: initialData?.mediaUrl || '',
    mediaType: initialData?.mediaType || 'IMAGE',
    mediaWidth: initialData?.mediaWidth || '100%',
    mediaHeight: initialData?.mediaHeight || '260px',
    borderRadius: initialData?.borderRadius || '16px',
    shadow: initialData?.shadow || 'lg',
    objectFit: initialData?.objectFit || 'cover',
    mediaPosition: initialData?.mediaPosition || 'center',
    whatsappNumber: initialData?.whatsappNumber || '',
    prefilledMessage: initialData?.prefilledMessage || '',
    buttonText: initialData?.buttonText || 'Continue to WhatsApp',
    metaPixelId: initialData?.metaPixelId || '',
    status: initialData?.status || 'ACTIVE',
  });

  const handleChange = (key: keyof LandingPageData, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'name' && (!prev.slug || !isEdit)) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'media'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'logo') setUploadingLogo(true);
    else setUploadingMedia(true);

    try {
      const buffer = await file.arrayBuffer();
      const folder = type === 'logo' ? 'logos' : 'media';
      const publicUrl = await uploadMediaToSupabase(buffer, file.name, file.type, folder);

      if (type === 'logo') {
        handleChange('logoUrl', publicUrl);
        toast('Logo uploaded successfully!');
      } else {
        handleChange('mediaUrl', publicUrl);
        if (file.type.includes('video')) {
          handleChange('mediaType', 'VIDEO');
        } else {
          handleChange('mediaType', 'IMAGE');
        }
        toast('Media uploaded successfully!');
      }
    } catch (err: any) {
      toast(err.message || 'Upload failed', 'error');
    } finally {
      setUploadingLogo(false);
      setUploadingMedia(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let res;
    if (isEdit && initialData?.id) {
      res = await updateLandingPageAction(initialData.id, formData);
    } else {
      res = await createLandingPageAction(formData);
    }

    setSubmitting(false);

    if (res.success) {
      toast(isEdit ? 'Landing page updated!' : 'Landing page created!');
      router.push('/dashboard/landing-pages');
      router.refresh();
    } else {
      toast(res.error || 'Failed to save landing page', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/landing-pages"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {isEdit ? `Edit: ${formData.name}` : 'Create Landing Page'}
            </h1>
            <p className="text-sm text-slate-400">Configure Meta Ads WhatsApp bridge micro page</p>
          </div>
        </div>

        {/* View Toggle Tabs for Mobile/Tablet */}
        <div className="flex items-center gap-2">
          <div className="flex lg:hidden bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                activeTab === 'form' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              Form
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                activeTab === 'preview' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              Preview
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Saving...' : 'Save Landing Page'}</span>
          </button>
        </div>
      </div>

      {/* Grid: Form on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Section */}
        <form
          onSubmit={handleSubmit}
          className={`lg:col-span-7 space-y-6 ${activeTab === 'preview' ? 'hidden lg:block' : 'block'}`}
        >
          {/* Section 1: Page & URL Config */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              General Page Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-slate-300">Internal Page Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Summer Promo Campaign"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-slate-300">URL Slug</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-mono text-slate-500">/p/</span>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => handleChange('slug', slugify(e.target.value))}
                    placeholder="summer-promo"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-slate-300">Company Name</label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                placeholder="Apex Digital Agency"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Media & Branding */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-teal-400" />
              Branding & Media Settings
            </h3>

            {/* Logo Upload */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-300">Company Logo</label>
              <div className="flex items-center gap-4">
                {formData.logoUrl && (
                  <img src={formData.logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-slate-700" />
                )}
                <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-white flex items-center gap-2 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingLogo ? 'Uploading...' : 'Upload Logo (PNG/JPG)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'logo')}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Main Media Upload (Image or Video) */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold uppercase text-slate-300">Main Media (Image or MP4 Video)</label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 rounded-xl text-xs font-semibold text-emerald-400 flex items-center gap-2 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>{uploadingMedia ? 'Uploading to Supabase...' : 'Upload Image or MP4 Video'}</span>
                  <input
                    type="file"
                    accept="image/*,video/mp4"
                    onChange={(e) => handleFileUpload(e, 'media')}
                    className="hidden"
                  />
                </label>
                {formData.mediaUrl && (
                  <span className="text-xs text-slate-400 truncate max-w-[200px]">{formData.mediaUrl}</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Uploaded files are stored directly in Supabase Storage. MP4 videos automatically autoplay, loop, and mute.
              </p>
            </div>

            {/* Media Formatting Controls */}
            <div className="pt-2 border-t border-slate-800 space-y-4">
              <h4 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Media Formatting Controls
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Media Type</label>
                  <select
                    value={formData.mediaType}
                    onChange={(e) => handleChange('mediaType', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="IMAGE">IMAGE</option>
                    <option value="VIDEO">VIDEO (MP4)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Height</label>
                  <input
                    type="text"
                    value={formData.mediaHeight}
                    onChange={(e) => handleChange('mediaHeight', e.target.value)}
                    placeholder="260px"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Border Radius</label>
                  <input
                    type="text"
                    value={formData.borderRadius}
                    onChange={(e) => handleChange('borderRadius', e.target.value)}
                    placeholder="16px"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Shadow</label>
                  <select
                    value={formData.shadow}
                    onChange={(e) => handleChange('shadow', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="none">None</option>
                    <option value="sm">Small</option>
                    <option value="md">Medium</option>
                    <option value="lg">Large</option>
                    <option value="xl">Extra Large</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Object Fit</label>
                  <select
                    value={formData.objectFit}
                    onChange={(e) => handleChange('objectFit', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="fill">Fill</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: WhatsApp & CTA */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              WhatsApp Destination & CTA Button
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-slate-300">WhatsApp Number</label>
                <input
                  type="text"
                  required
                  value={formData.whatsappNumber}
                  onChange={(e) => handleChange('whatsappNumber', e.target.value)}
                  placeholder="15550192834 (with country code)"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-slate-300">Button CTA Text</label>
                <input
                  type="text"
                  required
                  value={formData.buttonText}
                  onChange={(e) => handleChange('buttonText', e.target.value)}
                  placeholder="Continue to WhatsApp"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-slate-300">Prefilled WhatsApp Message</label>
              <textarea
                rows={3}
                value={formData.prefilledMessage || ''}
                onChange={(e) => handleChange('prefilledMessage', e.target.value)}
                placeholder="Hi! I am interested in your offer from Meta Ads."
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 4: Meta Pixel & Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Meta Pixel & Page Status
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-slate-300">Meta Pixel ID (Optional Override)</label>
                <input
                  type="text"
                  value={formData.metaPixelId || ''}
                  onChange={(e) => handleChange('metaPixelId', e.target.value)}
                  placeholder="Leave empty to use Workspace Pixel ID"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-slate-300">Page Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE (Published)</option>
                  <option value="INACTIVE">INACTIVE (Draft)</option>
                </select>
              </div>
            </div>
          </div>
        </form>

        {/* Live Interactive Preview Drawer */}
        <div
          className={`lg:col-span-5 sticky top-6 ${
            activeTab === 'form' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-400" />
                Live Apple-Style Device Preview
              </span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                Real-Time
              </span>
            </div>

            <div className="rounded-2xl border border-slate-800 overflow-hidden bg-white max-h-[750px] overflow-y-auto shadow-inner">
              <LandingPageTemplate data={formData} isPreview={true} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { getWorkspaceSettingsAction, updateWorkspaceSettingsAction } from '@/actions/workspace.actions';
import { uploadMediaToSupabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/toast';
import { Building2, Save, Upload, Sparkles, MessageSquare, Palette, Mail } from 'lucide-react';

export default function WorkspaceSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#0f172a',
    buttonColor: '#25D366',
    supportEmail: '',
    defaultWhatsapp: '',
    defaultPixelId: '',
    defaultMessage: '',
  });

  useEffect(() => {
    getWorkspaceSettingsAction().then((data) => {
      if (data) {
        setFormData({
          name: data.name || '',
          logoUrl: data.logoUrl || '',
          faviconUrl: data.faviconUrl || '',
          primaryColor: data.primaryColor || '#0f172a',
          buttonColor: data.buttonColor || '#25D366',
          supportEmail: data.supportEmail || '',
          defaultWhatsapp: data.defaultWhatsapp || '',
          defaultPixelId: data.defaultPixelId || '',
          defaultMessage: data.defaultMessage || '',
        });
      }
      setLoading(false);
    });
  }, []);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const buffer = await file.arrayBuffer();
      const publicUrl = await uploadMediaToSupabase(buffer, file.name, file.type, 'logos');
      handleChange('logoUrl', publicUrl);
      toast('Workspace Logo uploaded to Supabase Storage!');
    } catch (err: any) {
      toast(err.message || 'Logo upload failed', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const res = await updateWorkspaceSettingsAction(formData);
    setSaving(false);

    if (res.success) {
      toast('Workspace settings updated successfully!');
    } else {
      toast(res.error || 'Failed to save settings', 'error');
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-500">Loading workspace settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Workspace Settings</h1>
          <p className="text-sm text-slate-400">Default brand settings, WhatsApp defaults, and Meta Pixel configuration</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Brand Information */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            Brand Profile & Logo
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-slate-300">Business Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Acme Growth Marketing"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-slate-300">Support Email</label>
              <input
                type="email"
                value={formData.supportEmail}
                onChange={(e) => handleChange('supportEmail', e.target.value)}
                placeholder="support@acme.com"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-xs font-semibold uppercase text-slate-300">Workspace Logo</label>
            <div className="flex items-center gap-4">
              {formData.logoUrl && (
                <img src={formData.logoUrl} alt="Logo" className="w-14 h-14 rounded-xl object-contain bg-white p-1 border border-slate-700" />
              )}
              <label className="cursor-pointer px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-white flex items-center gap-2 transition-colors">
                <Upload className="w-4 h-4" />
                <span>{uploadingLogo ? 'Uploading to Supabase...' : 'Upload Workspace Logo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Default WhatsApp & Campaign Defaults */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            WhatsApp & Campaign Defaults
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-slate-300">Default WhatsApp Number</label>
              <input
                type="text"
                required
                value={formData.defaultWhatsapp}
                onChange={(e) => handleChange('defaultWhatsapp', e.target.value)}
                placeholder="15550192834"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-slate-300">Default Meta Pixel ID</label>
              <input
                type="text"
                value={formData.defaultPixelId}
                onChange={(e) => handleChange('defaultPixelId', e.target.value)}
                placeholder="123456789012345"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-slate-300">Default Prefilled WhatsApp Message</label>
            <textarea
              rows={3}
              value={formData.defaultMessage}
              onChange={(e) => handleChange('defaultMessage', e.target.value)}
              placeholder="Hi! I am interested in your products from Meta Ads."
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Brand Theme Colors */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-purple-400" />
            Theme Accent Colors
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-slate-300">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  className="w-10 h-10 rounded-lg bg-transparent cursor-pointer border border-slate-700"
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-slate-300">CTA Button Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.buttonColor}
                  onChange={(e) => handleChange('buttonColor', e.target.value)}
                  className="w-10 h-10 rounded-lg bg-transparent cursor-pointer border border-slate-700"
                />
                <input
                  type="text"
                  value={formData.buttonColor}
                  onChange={(e) => handleChange('buttonColor', e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

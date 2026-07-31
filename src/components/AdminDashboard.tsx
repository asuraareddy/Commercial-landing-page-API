"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { PageConfig, pagesConfig as defaultPages } from "@/config/pages";
import { fetchRemoteConfig, saveRemoteConfig } from "@/lib/configStore";
import { WhatsAppIcon } from "./WhatsAppIcon";

export const AdminDashboard: React.FC = () => {
  const [configs, setConfigs] = useState<Record<string, PageConfig>>(defaultPages);
  const [activeTab, setActiveTab] = useState<string>("page1");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      const data = await fetchRemoteConfig();
      setConfigs(data);
    }
    loadData();
  }, []);

  const currentConfig = configs[activeTab] || defaultPages[activeTab];

  const handleInputChange = (field: keyof PageConfig, value: any) => {
    setConfigs((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    await saveRemoteConfig(configs);
    setIsSaving(false);
    setSaveStatus("Saved successfully!");
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleResetCurrentPage = () => {
    if (confirm(`Reset ${activeTab} to default settings?`)) {
      setConfigs((prev) => ({
        ...prev,
        [activeTab]: { ...defaultPages[activeTab] },
      }));
    }
  };

  // Browser-native Base64 Uploader (Works 100% on Vercel without server disk writes)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert("File size is too large (max 8MB). Please choose a smaller file.");
      return;
    }

    setUploading(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target?.result) {
        const base64Data = event.target.result as string;
        handleInputChange("logo", base64Data);

        // Auto-detect GIF or Video
        if (file.type.includes("gif")) {
          handleInputChange("mediaType", "gif");
        } else if (file.type.includes("video") || file.name.match(/\.(mp4|webm)$/i)) {
          handleInputChange("mediaType", "video");
        } else {
          handleInputChange("mediaType", "image");
        }
      }
      setUploading(false);
    };

    reader.onerror = () => {
      alert("Error reading file");
      setUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(configs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `whatsapp_bridge_configs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported && typeof imported === "object") {
          setConfigs(imported);
          saveRemoteConfig(imported);
          alert("Configuration imported successfully!");
        }
      } catch (err) {
        alert("Invalid JSON configuration file.");
      }
    };
    reader.readAsText(file);
  };

  const encodedMessage = encodeURIComponent(currentConfig.whatsappMessage || "");
  const whatsappUrl = `https://wa.me/${(currentConfig.whatsappNumber || "").replace(/[^0-9]/g, "")}?text=${encodedMessage}`;
  
  const mediaWidth = currentConfig.mediaWidth || 180;
  const mediaHeight = currentConfig.mediaHeight || 80;
  const isVideo = currentConfig.mediaType === "video" || currentConfig.logo?.match(/\.(mp4|webm|ogg)$/i);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans pb-16">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-zinc-200/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-md shadow-[#25D366]/20">
              <WhatsAppIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">WhatsApp Bridge Portal</h1>
              <p className="text-xs text-zinc-500">Live Meta Ads customization dashboard & Meta Pixel tracker</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saveStatus && (
              <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 animate-fadeIn">
                ✓ {saveStatus}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm transition-all duration-150 shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? "Saving..." : "Save All Changes"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-8 overflow-x-auto gap-2">
          <div className="flex items-center gap-2">
            {["page1", "page2", "page3", "page4"].map((tabKey, idx) => (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                  activeTab === tabKey
                    ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/80 font-semibold"
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-white/50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${activeTab === tabKey ? "bg-[#25D366]" : "bg-zinc-300"}`} />
                Page {idx + 1} ({tabKey})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 rounded-lg shadow-2xs hover:bg-zinc-50"
            >
              Export JSON Backup
            </button>
            <label className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 rounded-lg shadow-2xs hover:bg-zinc-50 cursor-pointer">
              Import JSON
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
          </div>
        </div>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Box 1: Meta Pixel Integration */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Meta Ads Pixel Code
                </h2>
                <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2.5 py-1 rounded-full">
                  Auto-Tracks PageView & Leads
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Meta Pixel ID (Facebook Pixel)
                </label>
                <input
                  type="text"
                  value={currentConfig.metaPixelId || ""}
                  onChange={(e) => handleInputChange("metaPixelId", e.target.value)}
                  placeholder="e.g. 123456789012345"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition font-mono"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Enter your Meta Pixel ID from Facebook Events Manager. It automatically fires <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800">PageView</code> on load and <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800">Lead</code> when the button is clicked.
                </p>
              </div>
            </div>

            {/* Box 2: WhatsApp Configuration */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-2xs space-y-5">
              <h2 className="text-base font-semibold text-zinc-900 border-b border-zinc-100 pb-3 flex items-center justify-between">
                <span>WhatsApp Settings</span>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 underline flex items-center gap-1"
                >
                  Test Link ↗
                </a>
              </h2>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  WhatsApp Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={currentConfig.whatsappNumber || ""}
                  onChange={(e) => handleInputChange("whatsappNumber", e.target.value)}
                  placeholder="e.g. 15551234567 (country code included, no + or spaces)"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Pre-filled Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={currentConfig.whatsappMessage || ""}
                  onChange={(e) => handleInputChange("whatsappMessage", e.target.value)}
                  placeholder="Message that auto-fills when user opens WhatsApp..."
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] transition leading-relaxed"
                />
              </div>
            </div>

            {/* Box 3: Media & Size Customization */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-2xs space-y-5">
              <h2 className="text-base font-semibold text-zinc-900 border-b border-zinc-100 pb-3">
                Media Customization (Logo, Image, GIF, or Video)
              </h2>

              {/* Media Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-2">Media Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: "image", label: "Logo / Image" },
                    { type: "gif", label: "Animated GIF" },
                    { type: "video", label: "Short Video (MP4)" },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => handleInputChange("mediaType", item.type)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border transition ${
                        (currentConfig.mediaType || "image") === item.type
                          ? "border-[#25D366] bg-emerald-50 text-emerald-900 font-semibold"
                          : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* File Upload Button */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-2">Upload Image, GIF, or Video File</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    {uploading ? "Processing File..." : "Choose Local File"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/mp4,video/webm"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <span className="text-xs text-zinc-400">PNG, SVG, GIF, MP4 (max 8MB)</span>
                </div>
              </div>

              {/* Preset Logos */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Preset Logos</label>
                <div className="grid grid-cols-4 gap-2">
                  {["/logos/logo1.png", "/logos/logo2.png", "/logos/logo3.png", "/logos/logo4.png"].map((presetPath, idx) => (
                    <button
                      key={presetPath}
                      type="button"
                      onClick={() => {
                        handleInputChange("logo", presetPath);
                        handleInputChange("mediaType", "image");
                      }}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition ${
                        currentConfig.logo === presetPath ? "border-[#25D366] bg-emerald-50/50 ring-2 ring-[#25D366]/30" : "border-zinc-200 hover:border-zinc-300 bg-zinc-50"
                      }`}
                    >
                      <div className="w-full h-8 relative flex items-center justify-center">
                        <Image src={presetPath} alt={`Logo ${idx + 1}`} fill className="object-contain" unoptimized />
                      </div>
                      <span className="text-[10px] font-medium text-zinc-500">Logo {idx + 1}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Media URL Input */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Media Source URL / Base64</label>
                <input
                  type="text"
                  value={currentConfig.logo || ""}
                  onChange={(e) => handleInputChange("logo", e.target.value)}
                  placeholder="/logos/logo1.png or https://example.com/video.mp4"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] transition font-mono text-xs truncate"
                />
              </div>

              {/* Dimension Sliders */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-100">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-zinc-700">Max Width</label>
                    <span className="text-xs font-mono font-medium text-zinc-500">{mediaWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="420"
                    step="5"
                    value={mediaWidth}
                    onChange={(e) => handleInputChange("mediaWidth", parseInt(e.target.value, 10))}
                    className="w-full accent-[#25D366] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-zinc-700">Max Height</label>
                    <span className="text-xs font-mono font-medium text-zinc-500">{mediaHeight}px</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="350"
                    step="5"
                    value={mediaHeight}
                    onChange={(e) => handleInputChange("mediaHeight", parseInt(e.target.value, 10))}
                    className="w-full accent-[#25D366] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Box 4: Text Copy */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-2xs space-y-5">
              <h2 className="text-base font-semibold text-zinc-900 border-b border-zinc-100 pb-3">Text Copy & SEO</h2>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Heading</label>
                <input
                  type="text"
                  value={currentConfig.headingText || ""}
                  onChange={(e) => handleInputChange("headingText", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Subheading</label>
                <input
                  type="text"
                  value={currentConfig.subheadingText || ""}
                  onChange={(e) => handleInputChange("subheadingText", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Button Text</label>
                <input
                  type="text"
                  value={currentConfig.buttonText || ""}
                  onChange={(e) => handleInputChange("buttonText", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] transition"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleResetCurrentPage}
                className="text-xs text-red-500 hover:text-red-600 font-medium hover:underline"
              >
                Reset Page to Default
              </button>

              <a
                href={`/${activeTab}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-600 hover:text-zinc-900 font-medium underline flex items-center gap-1"
              >
                View Published /{activeTab} Page ↗
              </a>
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-5 sticky top-24">
            <div className="bg-zinc-900 text-white rounded-3xl p-4 shadow-xl border border-zinc-800">
              <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/80 mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>
                <span className="text-[11px] font-mono text-zinc-400">Live Preview (/{activeTab})</span>
                <span className="text-xs text-emerald-400 font-medium">Interactive</span>
              </div>

              {/* Viewport */}
              <div className="bg-white rounded-2xl p-6 text-zinc-900 min-h-[460px] flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden">
                {/* Media Container */}
                <div className="relative mb-8 w-full flex justify-center items-center">
                  <div
                    className="relative flex items-center justify-center filter drop-shadow-sm"
                    style={{
                      maxWidth: `${mediaWidth}px`,
                      maxHeight: `${mediaHeight}px`,
                      width: "100%",
                    }}
                  >
                    {isVideo ? (
                      <video
                        src={currentConfig.logo}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="rounded-xl object-contain w-auto h-auto"
                        style={{
                          maxWidth: `${mediaWidth}px`,
                          maxHeight: `${mediaHeight}px`,
                        }}
                      />
                    ) : currentConfig.logo ? (
                      <Image
                        src={currentConfig.logo}
                        alt="Preview"
                        width={mediaWidth}
                        height={mediaHeight}
                        unoptimized
                        className="object-contain w-auto h-auto"
                        style={{
                          maxWidth: `${mediaWidth}px`,
                          maxHeight: `${mediaHeight}px`,
                        }}
                      />
                    ) : (
                      <span className="text-xs text-zinc-400 italic">No media selected</span>
                    )}
                  </div>
                </div>

                {/* Headings */}
                <div className="space-y-2 mb-8">
                  <h3 className="text-zinc-900 text-lg font-semibold tracking-tight leading-snug">
                    {currentConfig.headingText || "Thank you for your interest."}
                  </h3>
                  <p className="text-zinc-500 text-xs font-normal leading-relaxed max-w-[320px] mx-auto">
                    {currentConfig.subheadingText || "Click below to continue your conversation on WhatsApp."}
                  </p>
                </div>

                {/* Button */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-[16px] text-white font-semibold text-sm tracking-wide bg-[#25D366] hover:bg-[#22c35e] shadow-[0_6px_20px_-4px_rgba(37,211,102,0.4)] transition"
                >
                  <WhatsAppIcon className="w-5 h-5 flex-shrink-0" />
                  <span>{currentConfig.buttonText || "Continue to WhatsApp"}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

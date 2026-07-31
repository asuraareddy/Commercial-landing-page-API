"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Script from "next/script";
import { PageConfig } from "@/config/pages";
import { WhatsAppIcon } from "./WhatsAppIcon";

interface WhatsAppBridgeProps {
  config: PageConfig;
}

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

export const WhatsAppBridge: React.FC<WhatsAppBridgeProps> = ({ config: initialConfig }) => {
  const [config, setConfig] = useState<PageConfig>(initialConfig);

  useEffect(() => {
    const loadLiveConfig = async () => {
      // 1. Check local storage for immediate cached render
      try {
        const saved = localStorage.getItem("whatsapp_bridge_configs_v1");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed[initialConfig.id]) {
            setConfig(parsed[initialConfig.id]);
          }
        }
      } catch (err) {
        console.error("Error reading local config", err);
      }

      // 2. Fetch remote server configuration so incognito mode & other devices get live updates
      try {
        const res = await fetch("/api/config", { cache: "no-store" });
        if (res.ok) {
          const remoteData = await res.json();
          if (remoteData && remoteData[initialConfig.id]) {
            setConfig(remoteData[initialConfig.id]);
            try {
              const currentLocal = JSON.parse(localStorage.getItem("whatsapp_bridge_configs_v1") || "{}");
              currentLocal[initialConfig.id] = remoteData[initialConfig.id];
              localStorage.setItem("whatsapp_bridge_configs_v1", JSON.stringify(currentLocal));
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn("Could not fetch remote config on load", err);
      }
    };

    loadLiveConfig();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "whatsapp_bridge_configs_v1" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed[initialConfig.id]) {
            setConfig(parsed[initialConfig.id]);
          }
        } catch (err) {
          console.error("Storage event parse error", err);
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [initialConfig.id]);

  const handleButtonClick = () => {
    if (typeof window !== "undefined" && window.fbq) {
      try {
        window.fbq("track", "Lead");
        window.fbq("trackCustom", "WhatsAppClick", {
          pageId: config.id,
          whatsappNumber: config.whatsappNumber,
        });
      } catch (e) {
        console.warn("Meta Pixel track error:", e);
      }
    }
  };

  const encodedMessage = encodeURIComponent(config.whatsappMessage);
  const whatsappUrl = `https://wa.me/${config.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodedMessage}`;

  const mediaWidth = config.mediaWidth || 180;
  const mediaHeight = config.mediaHeight || 100;
  const isVideo = config.mediaType === "video" || config.logo?.match(/\.(mp4|webm|ogg)$/i);

  return (
    <>
      {/* Meta Pixel Script */}
      {config.metaPixelId && (
        <>
          <Script
            id={`meta-pixel-${config.id}`}
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${config.metaPixelId}');
                fbq('track', 'PageView');
              `,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${config.metaPixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      <main className="min-h-screen w-full bg-white flex flex-col items-center justify-center p-6 sm:p-8 animate-fadeIn select-none">
        <div className="w-full max-w-[420px] mx-auto flex flex-col items-center text-center">
          {/* Company Logo / Media display */}
          <div className="relative mb-8 sm:mb-10 w-full flex justify-center items-center">
            <div
              className="relative flex items-center justify-center filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:drop-shadow-[0_6px_16px_rgba(0,0,0,0.08)] transition-all duration-300"
              style={{
                maxWidth: `${mediaWidth}px`,
                maxHeight: `${mediaHeight}px`,
                width: "100%",
              }}
            >
              {isVideo ? (
                <video
                  src={config.logo}
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
              ) : (
                <Image
                  src={config.logo}
                  alt={config.logoAlt || "Company Brand Media"}
                  width={mediaWidth}
                  height={mediaHeight}
                  priority
                  unoptimized={config.logo.startsWith("data:") || config.logo.startsWith("http")}
                  className="object-contain w-auto h-auto"
                  style={{
                    maxWidth: `${mediaWidth}px`,
                    maxHeight: `${mediaHeight}px`,
                  }}
                />
              )}
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-2.5 mb-10 sm:mb-12">
            <h1 className="text-zinc-900 text-xl sm:text-2xl font-semibold tracking-tight leading-snug">
              {config.headingText || "Thank you for your interest."}
            </h1>
            <p className="text-zinc-500 text-sm sm:text-base font-normal leading-relaxed max-w-[360px] mx-auto">
              {config.subheadingText || "Click below to continue your conversation on WhatsApp."}
            </p>
          </div>

          {/* Large Green WhatsApp Button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleButtonClick}
            className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-[16px] text-white font-semibold text-base sm:text-lg tracking-wide transition-all duration-200 ease-out active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-[#25D366]/30 shadow-[0_8px_25px_-5px_rgba(37,211,102,0.4)] hover:shadow-[0_12px_30px_-5px_rgba(37,211,102,0.5)] hover:-translate-y-0.5 bg-[#25D366] hover:bg-[#22c35e]"
          >
            <WhatsAppIcon className="w-6 h-6 flex-shrink-0" />
            <span>{config.buttonText || "Continue to WhatsApp"}</span>
          </a>
        </div>
      </main>
    </>
  );
};

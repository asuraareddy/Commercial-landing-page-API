# Meta Ads to WhatsApp Micro Landing Pages & Admin Portal

A lightweight, high-performance micro landing page application built with **Next.js 15 (App Router)**, **React**, **TypeScript**, and **Tailwind CSS**. Designed as a frictionless bridge between Meta (Facebook/Instagram) Ads and WhatsApp, with an integrated **Admin Portal** for easy non-technical team management.

---

## Features

- **4 Dedicated Landing Pages**: `/page1`, `/page2`, `/page3`, and `/page4`
- **Interactive Admin Interface (`/admin`)**:
  - Live tabbed editor for Page 1, Page 2, Page 3, and Page 4.
  - Image Uploader for replacing company logos on the fly.
  - WhatsApp phone number & pre-filled message editor with automatic URL encoding.
  - Real-time side-by-side card preview simulator.
  - Export & Import JSON configurations for backup and team sync.
- **Apple-Inspired Landing Page UI**:
  - Pure white background (`#FFFFFF`)
  - Vertically and horizontally centered container (max 420px)
  - Logo display (max width 180px) with subtle drop shadow
  - 16px rounded WhatsApp green (`#25D366`) CTA button with soft glowing shadow
  - Load fade-in animation, hover micro-interactions, and active press feedback
- **Ultra-Fast Performance**:
  - Pre-rendered static pages for instant load times (Lighthouse > 95)
  - Next.js Image component optimization with `priority` loading
  - Google Inter font via `next/font/google`
  - High-res SVG favicon

---

## Admin Portal (`/admin`)

Visit `http://localhost:3000/admin` in your browser to access the management interface.

### What you can edit in `/admin`:
1. **Logo**: Upload a new image file from your computer, pick from pre-installed logos (`/logos/logo1.png` - `logo4.png`), or paste an image URL.
2. **WhatsApp Phone Number**: Update international phone numbers without formatting errors.
3. **Pre-filled Message**: Type custom messages per campaign (e.g. *"Hello! I saw Facebook Ad #2 and would like to order."*).
4. **Copy & Text**: Customize heading line, subheading line, button text, and SEO page title.
5. **Live Preview**: See exact real-time preview of the landing page on the right side of the screen as you type.
6. **Save Changes**: Click **"Save All Changes"** to update all live landing pages instantly.

---

## How to Run Locally

### Option 1: Double-Click `run-dev.bat` (Windows)
Go to your project folder `d:\Landing Page\` and double-click `run-dev.bat`.

### Option 2: Via Terminal
Open Command Prompt (`cmd.exe`) or PowerShell:
```bash
npm install
npm run dev
```

Open your browser to:
- **Admin Management Portal**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Landing Page 1**: [http://localhost:3000/page1](http://localhost:3000/page1)
- **Landing Page 2**: [http://localhost:3000/page2](http://localhost:3000/page2)
- **Landing Page 3**: [http://localhost:3000/page3](http://localhost:3000/page3)
- **Landing Page 4**: [http://localhost:3000/page4](http://localhost:3000/page4)

---

## How to Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. Push this project repository to **GitHub**, **GitLab**, or **Bitbucket**.
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your repository.
4. Framework Preset will be automatically detected as **Next.js**.
5. Click **"Deploy"**.

### Option B: Via Vercel CLI

1. Install Vercel CLI globally:
   ```bash
   npm i -g vercel
   ```
2. Run deployment:
   ```bash
   vercel
   ```
3. For production deployment:
   ```bash
   vercel --prod
   ```

---

## Project File Structure

```
├── public/
│   ├── logos/
│   │   ├── logo1.png          # Baseline Logo 1
│   │   ├── logo2.png          # Baseline Logo 2
│   │   ├── logo3.png          # Baseline Logo 3
│   │   └── logo4.png          # Baseline Logo 4
│   └── uploads/               # Uploaded logos from /admin
├── data/
│   └── config.json            # Persistent JSON config store
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── page.tsx       # Admin Dashboard Page (/admin)
│   │   ├── api/
│   │   │   ├── config/route.ts # Config GET/POST API
│   │   │   └── upload/route.ts # Image Upload API
│   │   ├── layout.tsx         # Root layout with Inter font & metadata
│   │   ├── globals.css        # Tailwind styles & fade-in animation
│   │   ├── icon.svg           # High-res SVG favicon
│   │   ├── page.tsx           # Default root landing page
│   │   ├── page1/page.tsx     # Route /page1
│   │   ├── page2/page.tsx     # Route /page2
│   │   ├── page3/page.tsx     # Route /page3
│   │   └── page4/page.tsx     # Route /page4
│   ├── components/
│   │   ├── AdminDashboard.tsx # Interactive Admin Dashboard
│   │   ├── WhatsAppBridge.tsx # Core reusable bridge layout component
│   │   └── WhatsAppIcon.tsx   # SVG WhatsApp icon component
│   ├── config/
│   │   └── pages.ts           # Baseline configuration fallback
│   └── lib/
│       └── configStore.ts     # Client/Server state sync utility
├── package.json
├── run-dev.bat
└── README.md
```

# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa-e2e.spec.ts >> End-to-End QA Regression Suite >> QA 2-4 - Super Admin Config & Customer Access
- Location: tests\qa-e2e.spec.ts:44:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('select[name="domainId"]')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('select[name="domainId"]')

```

```yaml
- complementary:
  - link "WA WA Gateway SaaS Portal":
    - /url: /dashboard
  - text: Workspace QA Test Business
  - navigation:
    - link "Dashboard":
      - /url: /dashboard
      - img
      - text: Dashboard
    - link "Landing Pages":
      - /url: /dashboard/landing-pages
      - img
      - text: Landing Pages
      - img
    - link "Workspace Settings":
      - /url: /dashboard/settings
      - img
      - text: Workspace Settings
    - link "Custom Domains":
      - /url: /dashboard/domains
      - img
      - text: Custom Domains
  - text: Q
  - paragraph: qa_customer_1791127692075@wagateway.com
  - paragraph: admin
  - button "Sign Out":
    - img
    - text: Sign Out
- main:
  - link:
    - /url: /dashboard/landing-pages
    - img
  - heading "Create Landing Page" [level=1]
  - paragraph: Configure WhatsApp bridge micro landing page
  - button "Save Landing Page":
    - img
    - text: Save Landing Page
  - heading "General Page Configuration" [level=3]:
    - img
    - text: General Page Configuration
  - strong: No domains available.
  - text: Please ask your Super Admin to assign a domain to your workspace before creating a landing page. Internal Page Name *
  - textbox "e.g. Summer Promo Campaign"
  - text: URL Slug * /p/
  - textbox "summer-promo"
  - text: Company Name *
  - textbox "Apex Digital Agency": QA Test Business
  - heading "Branding & Media Settings" [level=3]:
    - img
    - text: Branding & Media Settings
  - text: Company Logo
  - img
  - text: "Upload Logo (PNG / JPG / GIF) Main Media (Image, GIF, or Video: MP4 / WebM / MOV)"
  - img
  - text: Upload Image, GIF, or Video
  - paragraph: Supports PNG, JPG, GIF, MP4, WebM, and MOV formats. Videos automatically autoplay, loop, and mute.
  - heading "Media Formatting Controls" [level=4]:
    - img
    - text: Media Formatting Controls
  - text: Media Type
  - combobox:
    - option "IMAGE / GIF" [selected]
    - option "VIDEO (MP4 / WebM / MOV)"
  - text: Height
  - textbox "260px"
  - text: Border Radius
  - textbox "16px"
  - text: Shadow
  - combobox:
    - option "None"
    - option "Small"
    - option "Medium"
    - option "Large" [selected]
    - option "Extra Large"
  - text: Object Fit
  - combobox:
    - option "Cover" [selected]
    - option "Contain"
    - option "Fill"
  - heading "WhatsApp Destination & CTA Button" [level=3]:
    - img
    - text: WhatsApp Destination & CTA Button
  - text: WhatsApp Number *
  - textbox "15550192834 (with country code)"
  - text: Button CTA Text *
  - textbox "Continue to WhatsApp"
  - text: Prefilled WhatsApp Message
  - textbox "Hi! I am interested in your offer from Meta Ads."
  - heading "Meta Pixel & Page Status" [level=3]:
    - img
    - text: Meta Pixel & Page Status
  - text: Meta Pixel ID (Optional Override)
  - textbox "Leave empty to use Workspace Pixel ID"
  - text: Page Status
  - combobox:
    - option "ACTIVE (Published)" [selected]
    - option "INACTIVE (Draft)"
  - button "Save Landing Page":
    - img
    - text: Save Landing Page
  - img
  - text: Live Apple-Style Device Preview Instant Sync Q
  - heading "QA Test Business" [level=1]
  - text: Verified WhatsApp Support
  - heading "Thank you for your interest." [level=2]
  - paragraph: Click below to continue your conversation on WhatsApp.
  - link "Continue to WhatsApp":
    - /url: "#"
    - img
    - text: Continue to WhatsApp
    - img
  - img
  - text: End-to-End Encrypted WhatsApp Chat Powered by WA Gateway
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('End-to-End QA Regression Suite', () => {
  4  |   const timestamp = Date.now();
  5  |   const testCustomerEmail = `qa_customer_${timestamp}@wagateway.com`;
  6  |   const testCustomerPassword = 'Password123!';
  7  | 
  8  |   // QA Engineer 1 - Authentication
  9  |   test('QA 1 - Authentication Flow', async ({ page }) => {
  10 |     // 1. Invalid credentials
  11 |     await page.goto('/login');
  12 |     await page.fill('input[type="email"]', 'wrong@example.com');
  13 |     await page.fill('input[type="password"]', 'invalidpassword');
  14 |     await page.click('button[type="submit"]');
  15 |     await expect(page.locator('text=Invalid email or password')).toBeVisible();
  16 | 
  17 |     // 2. Register new customer
  18 |     await page.goto('/signup');
  19 |     await page.fill('input[name="businessName"]', 'QA Test Business');
  20 |     await page.fill('input[name="fullName"]', 'QA Tester');
  21 |     await page.fill('input[name="email"]', testCustomerEmail);
  22 |     await page.fill('input[name="phone"]', '15550199999');
  23 |     await page.fill('input[name="password"]', testCustomerPassword);
  24 |     await page.fill('input[name="confirmPassword"]', testCustomerPassword);
  25 |     await page.click('button[type="submit"]');
  26 |     
  27 |     // Bypass payment screen for QA (assuming it redirects to payment)
  28 |     await expect(page).toHaveURL(/\/signup\/payment/);
  29 |     await page.click('button:has-text("Pay $500 & Activate Account")');
  30 | 
  31 |     // 3. Login as new customer
  32 |     await page.goto('/login');
  33 |     await page.fill('input[type="email"]', testCustomerEmail);
  34 |     await page.fill('input[type="password"]', testCustomerPassword);
  35 |     await page.click('button[type="submit"]');
  36 |     await expect(page).toHaveURL(/\/dashboard/);
  37 |     
  38 |     // 4. Logout (Clicking on user avatar and logout)
  39 |     await page.click('button:has(svg.lucide-log-out), button:has-text("Logout"), a:has-text("Logout")'); 
  40 |     await expect(page).toHaveURL(/\/login/);
  41 |   });
  42 | 
  43 |   // QA Engineer 2, 3, 4 - Domain, Landing Page, and Subscription Access
  44 |   test('QA 2-4 - Super Admin Config & Customer Access', async ({ page, context }) => {
  45 |     // Log in as Super Admin
  46 |     await page.goto('/login');
  47 |     await page.fill('input[type="email"]', 'admin@wagateway.com');
  48 |     await page.fill('input[type="password"]', 'admin123456');
  49 |     await page.click('button[type="submit"]');
  50 |     await expect(page).toHaveURL(/\/super-admin/);
  51 | 
  52 |     // Now switch to customer context
  53 |     const customerContext = await page.context().browser()?.newContext({ baseURL: 'http://localhost:3005' });
  54 |     const customerPage = await customerContext!.newPage();
  55 |     
  56 |     await customerPage.goto('/login');
  57 |     await customerPage.fill('input[type="email"]', testCustomerEmail);
  58 |     await customerPage.fill('input[type="password"]', testCustomerPassword);
  59 |     await customerPage.click('button[type="submit"]');
  60 |     await expect(customerPage).toHaveURL(/\/dashboard/);
  61 | 
  62 |     // Go to create a landing page
  63 |     await customerPage.goto('/dashboard/landing-pages/new');
  64 |     
  65 |     // Verify domain dropdown is visible
  66 |     const domainSelect = customerPage.locator('select[name="domainId"]');
> 67 |     await expect(domainSelect).toBeVisible();
     |                                ^ Error: expect(locator).toBeVisible() failed
  68 | 
  69 |     // Verify subscription allows creating a page
  70 |     await customerPage.fill('input[name="name"]', 'QA Test Landing Page');
  71 |     await customerPage.fill('input[name="slug"]', `qa-slug-${timestamp}`);
  72 |     await customerPage.fill('input[name="companyName"]', 'QA Corp');
  73 |     await customerPage.fill('input[name="whatsappNumber"]', '15555555555');
  74 |     await customerPage.fill('input[name="buttonText"]', 'Chat Now');
  75 |     
  76 |     // Submit
  77 |     await customerPage.click('button[form="landing-page-edit-form"]');
  78 |     await expect(customerPage).toHaveURL(/\/dashboard\/landing-pages/);
  79 |     await expect(customerPage.locator('text=QA Test Landing Page')).toBeVisible();
  80 | 
  81 |     await customerContext!.close();
  82 |   });
  83 | });
  84 | 
```
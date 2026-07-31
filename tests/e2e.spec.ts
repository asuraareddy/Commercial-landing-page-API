import { test, expect } from '@playwright/test';

test.describe('WA Gateway Commercial SaaS E2E QA Test Suite', () => {
  const timestamp = Date.now();
  const testEmail = `qa_admin_${timestamp}@wagateway.com`;
  const testPassword = 'Password123!';
  const testSlug = `qa-slug-${timestamp}`;

  test('1. Super Admin Authentication & Control Center Access', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@wagateway.com');
    await page.fill('input[type="password"]', 'admin123456');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/super-admin/);
    await expect(page.locator('h1')).toContainText('Super Admin Control Center');
    await expect(page.locator('nav')).toContainText('Dashboard');
    await expect(page.locator('nav')).toContainText('Landing Pages');
    await expect(page.locator('nav')).toContainText('Admins');
    await expect(page.locator('nav')).toContainText('Settings');
  });

  test('2. Admin Registration -> Payment -> Login -> Dashboard Access', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('input[name="businessName"]', 'Apex QA Agency');
    await page.fill('input[name="fullName"]', 'Jane QA Tester');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="phone"]', '15550197777');
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/signup\/payment/);
    await page.click('button:has-text("Pay $500 & Activate Account")');

    await expect(page).toHaveURL(/\/login/);

    // Login with newly registered credentials
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard Overview');
  });

  test('3. Landing Page Complete CRUD Lifecycle & Public Routing', async ({ page }) => {
    // 1. Login as Admin
    await page.goto('/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Create Landing Page
    await page.goto('/dashboard/landing-pages/new');
    await page.fill('input[placeholder="e.g. Summer Promo Campaign"]', 'QA Meta Campaign');
    await page.fill('input[placeholder="summer-promo"]', testSlug);
    await page.fill('input[placeholder="Apex Digital Agency"]', 'Apex QA Brand');
    await page.fill('input[placeholder="15550192834 (with country code)"]', '15550198888');
    await page.fill('input[placeholder="Continue to WhatsApp"]', 'Chat with QA Team');

    await page.click('button[form="landing-page-edit-form"]');
    await expect(page).toHaveURL(/\/dashboard\/landing-pages/);
    await expect(page.locator('table')).toContainText('QA Meta Campaign');

    // 3. Open Public Landing Page
    await page.goto(`/p/${testSlug}`);
    await expect(page.locator('h1')).toContainText('Apex QA Brand');
    await expect(page.locator('a')).toContainText('Chat with QA Team');

    // 4. Edit Landing Page
    await page.goto('/dashboard/landing-pages');
    await page.click('a[title="Edit Page"]');
    await page.fill('input[placeholder="Apex Digital Agency"]', 'Apex QA Brand (Updated)');
    await page.click('button[form="landing-page-edit-form"]');
    await expect(page).toHaveURL(/\/dashboard\/landing-pages/);

    // 5. Verify Public Page updated
    await page.goto(`/p/${testSlug}`);
    await expect(page.locator('h1')).toContainText('Apex QA Brand (Updated)');

    // 6. Delete Landing Page
    await page.goto('/dashboard/landing-pages');
    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button[title="Delete Page"]');
    await expect(page.locator('table')).not.toContainText('QA Meta Campaign');

    // Wait 2 seconds for deletion server action & cloud KV sync to finalize
    await page.waitForTimeout(2500);

    // 7. Verify Public Page returns 404
    await page.goto(`/p/${testSlug}`);
    await expect(page.locator('body')).toContainText('404');
  });
});

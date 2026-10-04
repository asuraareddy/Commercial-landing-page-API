import { test, expect } from '@playwright/test';

test.describe('End-to-End QA Regression Suite', () => {
  const timestamp = Date.now();
  const testCustomerEmail = `qa_customer_${timestamp}@wagateway.com`;
  const testCustomerPassword = 'Password123!';

  // QA Engineer 1 - Authentication
  test('QA 1 - Authentication Flow', async ({ page }) => {
    // 1. Invalid credentials
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'invalidpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid email or password')).toBeVisible();

    // 2. Register new customer
    await page.goto('/signup');
    await page.fill('input[name="businessName"]', 'QA Test Business');
    await page.fill('input[name="fullName"]', 'QA Tester');
    await page.fill('input[name="email"]', testCustomerEmail);
    await page.fill('input[name="phone"]', '15550199999');
    await page.fill('input[name="password"]', testCustomerPassword);
    await page.fill('input[name="confirmPassword"]', testCustomerPassword);
    await page.click('button[type="submit"]');
    
    // Bypass payment screen for QA (assuming it redirects to payment)
    await expect(page).toHaveURL(/\/signup\/payment/);
    await page.click('button:has-text("Pay $500 & Activate Account")');

    // 3. Login as new customer
    await page.goto('/login');
    await page.fill('input[type="email"]', testCustomerEmail);
    await page.fill('input[type="password"]', testCustomerPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
    
    // 4. Logout (Clicking on user avatar and logout)
    await page.click('button:has(svg.lucide-log-out), button:has-text("Logout"), a:has-text("Logout")'); 
    await expect(page).toHaveURL(/\/login/);
  });

  // QA Engineer 2, 3, 4 - Domain, Landing Page, and Subscription Access
  test('QA 2-4 - Super Admin Config & Customer Access', async ({ page, context }) => {
    // Log in as Super Admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@wagateway.com');
    await page.fill('input[type="password"]', 'admin123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/super-admin/);

    // Now switch to customer context
    const customerContext = await page.context().browser()?.newContext({ baseURL: 'http://localhost:3005' });
    const customerPage = await customerContext!.newPage();
    
    await customerPage.goto('/login');
    await customerPage.fill('input[type="email"]', testCustomerEmail);
    await customerPage.fill('input[type="password"]', testCustomerPassword);
    await customerPage.click('button[type="submit"]');
    await expect(customerPage).toHaveURL(/\/dashboard/);

    // Go to create a landing page
    await customerPage.goto('/dashboard/landing-pages/new');
    
    // Verify domain dropdown is visible
    const domainSelect = customerPage.locator('select[name="domainId"]');
    await expect(domainSelect).toBeVisible();

    // Verify subscription allows creating a page
    await customerPage.fill('input[name="name"]', 'QA Test Landing Page');
    await customerPage.fill('input[name="slug"]', `qa-slug-${timestamp}`);
    await customerPage.fill('input[name="companyName"]', 'QA Corp');
    await customerPage.fill('input[name="whatsappNumber"]', '15555555555');
    await customerPage.fill('input[name="buttonText"]', 'Chat Now');
    
    // Submit
    await customerPage.click('button[form="landing-page-edit-form"]');
    await expect(customerPage).toHaveURL(/\/dashboard\/landing-pages/);
    await expect(customerPage.locator('text=QA Test Landing Page')).toBeVisible();

    await customerContext!.close();
  });
});

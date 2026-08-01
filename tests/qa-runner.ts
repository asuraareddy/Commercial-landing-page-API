import { registerAdminUserAction, loginAction } from '../src/actions/auth.actions';
import {
  createLandingPageAction,
  getLandingPagesAction,
  updateLandingPageAction,
  deleteLandingPageAction,
  getPublicLandingPageBySlug,
  toggleLandingPageStatusAction,
} from '../src/actions/landing-page.actions';
import {
  createAdminAction,
  getAllLandingPagesForSuperAdminAction,
  restoreLandingPageAction,
} from '../src/actions/super-admin.actions';
import { db } from '../src/lib/db';

async function runQASuite() {
  console.log('====================================================');
  console.log('🚀 RUNNING COMPREHENSIVE LANDING PAGE QA TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Super Admin Login
  console.log('Test 1: Super Admin Login credentials verification...');
  try {
    const formData = new FormData();
    formData.append('email', 'admin@wagateway.com');
    formData.append('password', 'admin123456');
    const res = await loginAction(formData);
    if (res.success && res.role === 'SUPER_ADMIN') {
      console.log('✅ PASS: Super Admin Login successful');
      passed++;
    } else {
      console.error('❌ FAIL: Super Admin Login failed', res);
      failed++;
    }
  } catch (err) {
    console.error('❌ FAIL: Exception in Super Admin Login', err);
    failed++;
  }

  // Test 2: Admin Registration & Login
  console.log('\nTest 2: Admin Sign Up (Register -> Login -> Dashboard Access)...');
  const testEmail = `test_admin_${Date.now()}@qa.com`;
  const testPassword = 'Password123!';
  try {
    const regForm = new FormData();
    regForm.append('businessName', 'QA Testing Agency');
    regForm.append('fullName', 'Tester Person');
    regForm.append('email', testEmail);
    regForm.append('phone', '15550199999');
    regForm.append('password', testPassword);

    const regRes = await registerAdminUserAction(regForm);
    if (regRes.success && regRes.userId) {
      const loginForm = new FormData();
      loginForm.append('email', testEmail);
      loginForm.append('password', testPassword);

      const loginRes = await loginAction(loginForm);
      if (loginRes.success && loginRes.redirectUrl === '/dashboard') {
        console.log('✅ PASS: Admin Sign Up -> Login -> Dashboard Access verified');
        passed++;
      } else {
        console.error('❌ FAIL: Login after Sign Up failed', loginRes);
        failed++;
      }
    } else {
      console.error('❌ FAIL: Admin Registration failed', regRes);
      failed++;
    }
  } catch (err) {
    console.error('❌ FAIL: Exception in Sign Up flow', err);
    failed++;
  }

  // Test 3: Landing Page Database Creation & Shareable URL
  console.log('\nTest 3: Landing Page Permanent DB Creation & Shareable URL Access...');
  const testSlug = `qa-page-perm-${Date.now()}`;
  let createdPageId = '';
  try {
    const createRes = await createLandingPageAction({
      name: 'Permanent QA Landing Page',
      slug: testSlug,
      companyName: 'Permanent QA Enterprises',
      whatsappNumber: '15550198888',
      buttonText: 'Chat Now',
      status: 'ACTIVE',
    });

    if (createRes.success && createRes.page) {
      createdPageId = createRes.page.id;

      // Direct Database Audit
      const dbRecord = await db.landingPage.findUnique({ where: { id: createdPageId } });
      if (dbRecord && dbRecord.slug === testSlug) {
        console.log('  -> Confirmed: Record is permanently saved in Prisma DB');

        // Verify Public Shareable URL
        const pubPage = await getPublicLandingPageBySlug(testSlug);
        if (pubPage && pubPage.companyName === 'Permanent QA Enterprises') {
          console.log('✅ PASS: Landing page created, saved in Prisma DB, and shareable URL active');
          passed++;
        } else {
          console.error('❌ FAIL: Shareable URL failed to retrieve page', pubPage);
          failed++;
        }
      } else {
        console.error('❌ FAIL: Record was NOT found in Prisma DB!', dbRecord);
        failed++;
      }
    } else {
      console.error('❌ FAIL: Landing page creation failed', createRes);
      failed++;
    }
  } catch (err) {
    console.error('❌ FAIL: Exception in Landing Page DB creation test', err);
    failed++;
  }

  // Test 4: Re-fetching & Persistence (Simulating reloads / fresh state)
  console.log('\nTest 4: Verify Page Persistence Across Re-queries...');
  try {
    const pages = await getLandingPagesAction();
    const found = pages.find((p) => p.id === createdPageId);

    if (found) {
      console.log('✅ PASS: Landing page persisted in Admin Dashboard list');
      passed++;
    } else {
      console.error('❌ FAIL: Landing page disappeared from Admin Dashboard listing!');
      failed++;
    }
  } catch (err) {
    console.error('❌ FAIL: Exception in page persistence test', err);
    failed++;
  }

  // Test 5: 90-Day Archival Policy Verification
  console.log('\nTest 5: 90-Day Archival Policy Engine Verification...');
  try {
    // Switch auth session to Super Admin for SA actions
    const saForm = new FormData();
    saForm.append('email', 'admin@wagateway.com');
    saForm.append('password', 'admin123456');
    await loginAction(saForm);

    // 5a. Create an active page updated 100 days ago -> Should STAY ACTIVE
    const oldActiveSlug = `qa-old-active-${Date.now()}`;
    const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);

    const oldActivePage = await db.landingPage.create({
      data: {
        workspaceId: (await db.workspace.findFirst())?.id || 'ws_default',
        name: 'Old Active Page',
        slug: oldActiveSlug,
        companyName: 'Active Enterprise',
        whatsappNumber: '15550197777',
        status: 'ACTIVE',
        updatedAt: hundredDaysAgo,
      },
    });

    // 5b. Create an inactive page updated 100 days ago -> Should get ARCHIVED
    const oldInactiveSlug = `qa-old-inactive-${Date.now()}`;
    const oldInactivePage = await db.landingPage.create({
      data: {
        workspaceId: oldActivePage.workspaceId,
        name: 'Old Inactive Page',
        slug: oldInactiveSlug,
        companyName: 'Inactive Enterprise',
        whatsappNumber: '15550196666',
        status: 'INACTIVE',
        updatedAt: hundredDaysAgo,
      },
    });

    // Run getLandingPagesAction which triggers archival evaluation
    await getLandingPagesAction();

    // Check states after policy engine execution
    const checkedOldActive = await db.landingPage.findUnique({ where: { id: oldActivePage.id } });
    const checkedOldInactive = await db.landingPage.findUnique({ where: { id: oldInactivePage.id } });

    if (
      checkedOldActive?.status === 'ACTIVE' &&
      checkedOldInactive?.status === 'ARCHIVED' &&
      checkedOldInactive?.archivedAt !== null
    ) {
      console.log('  -> Active pages >90 days old remain ACTIVE indefinitely');
      console.log('  -> Inactive pages >90 days old are automatically marked ARCHIVED without physical deletion');

      // Test Super Admin Restore functionality
      const saPages = await getAllLandingPagesForSuperAdminAction();
      const archivedInSA = saPages.find((p) => p.id === oldInactivePage.id);

      if (archivedInSA) {
        console.log('  -> Super Admin can view archived page');
        const restoreRes = await restoreLandingPageAction(oldInactivePage.id);
        const restoredPage = await db.landingPage.findUnique({ where: { id: oldInactivePage.id } });

        if (restoreRes.success && restoredPage?.status === 'INACTIVE' && restoredPage?.archivedAt === null) {
          console.log('✅ PASS: 90-Day Archival Policy engine and Super Admin restore verified');
          passed++;
        } else {
          console.error('❌ FAIL: Super Admin restore failed', restoreRes, restoredPage);
          failed++;
        }
      } else {
        console.error('❌ FAIL: Archived page not visible to Super Admin', saPages);
        failed++;
      }

      // Cleanup test records
      await db.landingPage.delete({ where: { id: oldActivePage.id } });
      await db.landingPage.delete({ where: { id: oldInactivePage.id } });
    } else {
      console.error('❌ FAIL: 90-day archival policy failed', {
        checkedOldActiveStatus: checkedOldActive?.status,
        checkedOldInactiveStatus: checkedOldInactive?.status,
      });
      failed++;
    }
  } catch (err) {
    console.error('❌ FAIL: Exception in 90-day archival test', err);
    failed++;
  }

  // Cleanup main test record
  if (createdPageId) {
    await deleteLandingPageAction(createdPageId);
  }

  console.log('\n====================================================');
  console.log(`📊 COMPREHENSIVE QA SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
}

runQASuite();

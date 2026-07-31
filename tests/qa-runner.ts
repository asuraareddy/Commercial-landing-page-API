import { registerAdminUserAction, loginAction, logoutAction } from '../src/actions/auth.actions';
import { createLandingPageAction, getLandingPagesAction, updateLandingPageAction, deleteLandingPageAction, getPublicLandingPageBySlug } from '../src/actions/landing-page.actions';
import { createAdminAction, getAdminsAction, deleteAdminAction } from '../src/actions/super-admin.actions';

async function runQASuite() {
  console.log('========================================');
  console.log('🚀 RUNNING AUTOMATED E2E QA TEST SUITE');
  console.log('========================================\n');

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

  // Test 2: Admin Registration Flow
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
      console.log('  -> Registration successful, userId:', regRes.userId);

      // Now test login with newly registered admin
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

  // Test 3: Landing Page CRUD Operations
  console.log('\nTest 3: Landing Page CRUD (Create -> Read -> Update -> Delete -> Public Access)...');
  const testSlug = `qa-page-${Date.now()}`;
  let createdPageId = '';
  try {
    const createRes = await createLandingPageAction({
      name: 'QA Test Landing Page',
      slug: testSlug,
      companyName: 'QA Enterprises',
      whatsappNumber: '15550198888',
      buttonText: 'QA WhatsApp CTA',
      status: 'ACTIVE',
    });

    if (createRes.success && createRes.page) {
      createdPageId = createRes.page.id;
      console.log('  -> Created Landing Page ID:', createdPageId, 'Slug:', testSlug);

      // Verify Public Read
      const pubPage = await getPublicLandingPageBySlug(testSlug);
      if (pubPage && pubPage.companyName === 'QA Enterprises') {
        console.log('  -> Public Landing Page URL (/p/' + testSlug + ') accessible');

        // Test Edit
        const updateRes = await updateLandingPageAction(createdPageId, {
          name: 'QA Test Landing Page (Updated)',
          slug: testSlug,
          companyName: 'QA Enterprises Updated',
          whatsappNumber: '15550198888',
          buttonText: 'Updated CTA Text',
          status: 'ACTIVE',
        });

        if (updateRes.success && updateRes.page?.companyName === 'QA Enterprises Updated') {
          console.log('  -> Landing Page Update verified in cloud store');

          // Test Delete
          const delRes = await deleteLandingPageAction(createdPageId);
          if (delRes.success) {
            const pubAfterDel = await getPublicLandingPageBySlug(testSlug);
            if (!pubAfterDel) {
              console.log('✅ PASS: Landing Page CRUD lifecycle (Create, Read, Update, Delete) verified');
              passed++;
            } else {
              console.error('❌ FAIL: Page still returned after deletion');
              failed++;
            }
          } else {
            console.error('❌ FAIL: Page deletion action failed', delRes);
            failed++;
          }
        } else {
          console.error('❌ FAIL: Page update failed', updateRes);
          failed++;
        }
      } else {
        console.error('❌ FAIL: Public page fetch failed or incorrect content');
        failed++;
      }
    } else {
      console.error('❌ FAIL: Landing page creation failed', createRes);
      failed++;
    }
  } catch (err) {
    console.error('❌ FAIL: Exception in Landing Page CRUD test', err);
    failed++;
  }

  // Test 4: Super Admin Manual Admin Account Creation
  console.log('\nTest 4: Super Admin Account Creation & Management...');
  const superAdminNewEmail = `created_by_sa_${Date.now()}@qa.com`;
  try {
    const saForm = new FormData();
    saForm.append('email', superAdminNewEmail);
    saForm.append('password', 'TempPass123!');
    saForm.append('workspaceName', 'Created By Super Admin WS');

    const saCreateRes = await createAdminAction(saForm);
    if (saCreateRes.success && saCreateRes.user) {
      console.log('  -> Super Admin created new Admin user:', superAdminNewEmail);

      // Verify login as newly created Admin
      const loginForm = new FormData();
      loginForm.append('email', superAdminNewEmail);
      loginForm.append('password', 'TempPass123!');

      const loginRes = await loginAction(loginForm);
      if (loginRes.success && loginRes.redirectUrl === '/dashboard') {
        console.log('✅ PASS: Super Admin Manual Creation & Login verified');
        passed++;
      } else {
        console.error('❌ FAIL: Login as Super-Admin-created user failed', loginRes);
        failed++;
      }
    } else {
      console.error('❌ FAIL: Super Admin account creation failed', saCreateRes);
      failed++;
    }
  } catch (err) {
    console.error('❌ FAIL: Exception in Super Admin creation test', err);
    failed++;
  }

  console.log('\n========================================');
  console.log(`📊 E2E QA SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================\n');
}

runQASuite();

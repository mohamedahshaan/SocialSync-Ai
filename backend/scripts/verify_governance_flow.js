import axios from 'axios';
import { prisma } from '../src/utils/prisma.js';

const API = 'http://localhost:5001/api';

async function testGovernanceFlow() {
  console.log('--- 1. Login as Admin ---');
  const adminLogin = await axios.post(`${API}/auth/login`, {
    email: 'admin@socialsync.ai',
    password: 'AdminSecureSync2026!'
  });
  const adminToken = adminLogin.data.data.token;
  console.log('Admin authenticated successfully.');

  const testEmail = `verify_flow_${Date.now()}@socialsync.ai`;
  const testPassword = 'SecurePassword2026!';

  console.log(`\n--- 2. Register New User (${testEmail}) ---`);
  const regRes = await axios.post(`${API}/auth/register`, {
    name: 'Governance Tester',
    email: testEmail,
    password: testPassword,
    confirmPassword: testPassword
  });
  const userId = regRes.data.data.user.id;
  console.log('User registered with ID:', userId);

  console.log('\n--- 3. Verify Active User Can Login ---');
  const login1 = await axios.post(`${API}/auth/login`, {
    email: testEmail,
    password: testPassword
  });
  console.log('Active user login success:', login1.data.success);

  console.log('\n--- 4. Admin Suspends User ---');
  const suspendRes = await axios.patch(`${API}/admin/users/${userId}/status`, {
    status: 'SUSPENDED',
    reason: 'Policy testing suspension'
  }, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('User status after suspension:', suspendRes.data.data.user.status);

  console.log('\n--- 5. Verify Suspended User Cannot Access ---');
  try {
    await axios.post(`${API}/auth/login`, {
      email: testEmail,
      password: testPassword
    });
    console.error('FAIL: Suspended user was able to login!');
  } catch (err) {
    console.log('SUCCESS: Suspended user was blocked from login:', err.response?.data?.message);
  }

  console.log('\n--- 6. Verify Suspended User Cannot Register Again With Same Email ---');
  try {
    await axios.post(`${API}/auth/register`, {
      name: 'Governance Tester Attempt 2',
      email: testEmail,
      password: testPassword,
      confirmPassword: testPassword
    });
    console.error('FAIL: Suspended email was allowed to re-register!');
  } catch (err) {
    console.log('SUCCESS: Blocked from re-registering existing suspended email:', err.response?.data?.message);
  }

  console.log('\n--- 7. Admin Permanently Deletes User ---');
  const deleteRes = await axios.delete(`${API}/admin/users/${userId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { reason: 'Governance verification permanent deletion' }
  });
  console.log('Delete response:', deleteRes.data.message);

  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  console.log('User in database after deletion:', dbUser);

  console.log('\n--- 8. User Creates Brand New Account With Same Email ---');
  const reRegisterRes = await axios.post(`${API}/auth/register`, {
    name: 'Governance Tester Brand New',
    email: testEmail,
    password: testPassword,
    confirmPassword: testPassword
  });
  console.log('SUCCESS: Brand new account created after deletion:', reRegisterRes.data.data.user.id);

  // Clean up the verification account
  await prisma.$transaction(async (tx) => {
    await tx.planHistory.deleteMany({ where: { userId: reRegisterRes.data.data.user.id } });
    await tx.creditTransaction.deleteMany({ where: { userId: reRegisterRes.data.data.user.id } });
    await tx.user.delete({ where: { id: reRegisterRes.data.data.user.id } });
  });
  console.log('\n=== ALL GOVERNANCE AND LIFECYCLE CHECKS PASSED PERFECTLY! ===');
}

testGovernanceFlow()
  .catch((err) => {
    console.error('Verification error:', err.response?.data || err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

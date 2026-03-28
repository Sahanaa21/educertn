const { PrismaClient } = require('@prisma/client');

const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const prisma = new PrismaClient();

async function getAdminEmail() {
  const explicitEmail = String(process.env.ADMIN_TEST_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (explicitEmail) {
    return explicitEmail;
  }

  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    orderBy: { createdAt: 'asc' },
    select: { email: true },
  });

  if (!adminUser?.email) {
    throw new Error('No ADMIN user found in database. Set ADMIN_TEST_EMAIL to run this test.');
  }

  return String(adminUser.email).toLowerCase();
}

async function adminLogin() {
  const adminEmail = await getAdminEmail();

  const requestOtpRes = await fetch(`${API_BASE}/api/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, intent: 'login' }),
  });

  const requestOtpData = await requestOtpRes.json().catch(() => null);
  if (!requestOtpRes.ok) {
    throw new Error(`Admin OTP request failed (${requestOtpRes.status}): ${JSON.stringify(requestOtpData)}`);
  }

  const latestOtp = await prisma.oTP.findFirst({
    where: { email: adminEmail },
    orderBy: { createdAt: 'desc' },
    select: { otp: true },
  });

  if (!latestOtp?.otp) {
    throw new Error('Admin OTP not found in database after OTP request.');
  }

  const res = await fetch(`${API_BASE}/api/auth/verify-unified-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, otp: latestOtp.otp }),
  });

  const data = await res.json();
  if (data?.requiresRegistration) {
    throw new Error('Admin login returned requiresRegistration=true. Ensure this email is configured as admin.');
  }

  if (!res.ok || !data.token) {
    throw new Error(`Admin login failed (${res.status}): ${JSON.stringify(data)}`);
  }

  return data.token;
}

async function createIssue() {
  const payload = {
    title: 'Issue test: report submission flow',
    description: 'Integration test for issue reporting API. This should be visible in admin issue list.',
    category: 'UI / Display',
    pageUrl: '/report-issue',
    reportedByName: 'Automation Test',
    reportedByEmail: 'automation@test.local',
    role: 'Visitor',
    deviceInfo: 'Node test runner',
  };

  const res = await fetch(`${API_BASE}/api/support/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Create issue failed (${res.status}): ${JSON.stringify(data)}`);
  }

  return data;
}

async function listIssues(token) {
  const res = await fetch(`${API_BASE}/api/admin/issues`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`List issues failed (${res.status}): ${JSON.stringify(data)}`);
  }

  return data;
}

async function updateIssue(token, id) {
  const res = await fetch(`${API_BASE}/api/admin/issues/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status: 'IN_PROGRESS' }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Update issue failed (${res.status}): ${JSON.stringify(data)}`);
  }

  return data;
}

(async () => {
  try {
    console.log('1) Creating issue report -> expecting 201');
    const created = await createIssue();
    console.log('Created Issue ID:', created.id);

    console.log('\n2) Admin login and fetch issue list -> expecting created issue to be present');
    const token = await adminLogin();
    const issues = await listIssues(token);
    const found = issues.find((item) => item.id === created.id);
    if (!found) {
      throw new Error('Created issue was not found in admin list');
    }
    console.log('Issue present in admin list:', found.id);

    console.log('\n3) Updating issue status to IN_PROGRESS -> expecting 200');
    const updated = await updateIssue(token, created.id);
    console.log('Updated status:', updated.status);

    if (updated.status !== 'IN_PROGRESS') {
      throw new Error(`Unexpected status after update: ${updated.status}`);
    }

    console.log('\nIssue report integration test: PASS');
  } catch (error) {
    console.error('Issue report integration test: FAIL');
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    try {
      await prisma.$disconnect();
    } catch (_) {
      // ignore disconnect errors in test script
    }
  }
})();

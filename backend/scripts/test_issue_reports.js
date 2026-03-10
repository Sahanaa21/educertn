const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gat.ac.in';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function adminLogin() {
  const res = await fetch(`${API_BASE}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  const data = await res.json();
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
  }
})();

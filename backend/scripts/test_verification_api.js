const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const prisma = new PrismaClient();

const COMPANY_EMAIL = process.env.COMPANY_TEST_EMAIL || 'qa-company@example.com';

async function getCompanyToken() {
  if (process.env.COMPANY_TEST_TOKEN) {
    return process.env.COMPANY_TEST_TOKEN;
  }

  const loginRes = await fetch(`${API_BASE}/api/auth/company/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: COMPANY_EMAIL }),
  });

  if (!loginRes.ok) {
    const body = await loginRes.text();
    throw new Error(`Company login failed (${loginRes.status}): ${body}`);
  }

  const latestOtp = await prisma.oTP.findFirst({
    where: { email: COMPANY_EMAIL },
    orderBy: { createdAt: 'desc' },
    select: { otp: true },
  });

  if (!latestOtp?.otp) {
    throw new Error('OTP not found in database after company login.');
  }

  const verifyRes = await fetch(`${API_BASE}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: COMPANY_EMAIL, otp: latestOtp.otp }),
  });

  if (!verifyRes.ok) {
    const body = await verifyRes.text();
    throw new Error(`OTP verification failed (${verifyRes.status}): ${body}`);
  }

  const verifyJson = await verifyRes.json();
  if (!verifyJson?.token) {
    throw new Error('OTP verification did not return a token.');
  }

  return verifyJson.token;
}

async function postVerification(token, { fileName, mimeType, bodyOverrides = {} }) {
  const form = new FormData();
  form.append('companyName', bodyOverrides.companyName || 'Test Company Pvt Ltd');
  form.append('companyEmail', bodyOverrides.companyEmail || COMPANY_EMAIL);
  form.append('contactPerson', bodyOverrides.contactPerson || 'QA Tester');
  form.append('phone', bodyOverrides.phone || '9876543210');
  form.append('studentName', bodyOverrides.studentName || 'Student One');
  form.append('usn', bodyOverrides.usn || '1GA23IS137');

  const filePath = path.join(__dirname, fileName);
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: mimeType });
  form.append('verificationTemplate', blob, fileName);

  const res = await fetch(`${API_BASE}/api/company/verifications`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  const text = await res.text();
  return { status: res.status, text };
}

(async () => {
  const invalidFile = path.join(__dirname, 'verification_invalid.txt');
  const validFile = path.join(__dirname, 'verification_valid.pdf');
  const oversizedFile = path.join(__dirname, 'verification_oversized.pdf');

  try {
    const token = await getCompanyToken();
    fs.writeFileSync(invalidFile, 'invalid type test');
    fs.writeFileSync(validFile, 'valid type test');
    fs.writeFileSync(oversizedFile, Buffer.alloc((10 * 1024 * 1024) + 1024, 97));

    console.log('1) Testing invalid file type -> expecting 400');
    const invalid = await postVerification(token, {
      fileName: 'verification_invalid.txt',
      mimeType: 'text/plain',
    });
    console.log('Status:', invalid.status);
    console.log('Body:', invalid.text);
    if (invalid.status !== 400) {
      process.exitCode = 1;
      console.error('Expected status 400 for invalid file type.');
    }

    console.log('\n2) Testing oversized file (>10MB) -> expecting 400');
    const oversized = await postVerification(token, {
      fileName: 'verification_oversized.pdf',
      mimeType: 'application/pdf',
    });
    console.log('Status:', oversized.status);
    console.log('Body:', oversized.text);
    if (oversized.status !== 400) {
      process.exitCode = 1;
      console.error('Expected status 400 for oversized file.');
    }

    console.log('\n3) Testing valid file type -> expecting 201');
    const valid = await postVerification(token, {
      fileName: 'verification_valid.pdf',
      mimeType: 'application/pdf',
    });
    console.log('Status:', valid.status);
    console.log('Body:', valid.text);
    if (valid.status !== 201) {
      process.exitCode = 1;
      console.error('Expected status 201 for valid file upload.');
    }
  } catch (error) {
    console.error('Verification API test failed:', error.message || error);
    process.exitCode = 1;
  } finally {
    try {
      [invalidFile, validFile, oversizedFile].forEach((file) => {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      });
    } catch (_) {
      // ignore cleanup errors in test script
    }

    try {
      await prisma.$disconnect();
    } catch (_) {
      // ignore disconnect errors in test script
    }
  }
})();

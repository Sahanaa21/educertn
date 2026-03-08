const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function test() {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) {
        console.log('No admin found!');
        return;
    }

    const token = jwt.sign({ id: admin.id, role: admin.role }, process.env.JWT_SECRET || 'secret123', { expiresIn: '1d' });
    const request = await prisma.certificateRequest.findFirst({});
    if (!request) {
        console.log('No requests to test!');
        return;
    }

    const boundary = '----WebKitFormBoundary7i1rJTheO5lQ';
    const fileContent = 'dummy file contents';
    const fileName = 'dummy.txt';

    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="status"\r\n\r\n`;
    body += `COMPLETED\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += `Content-Type: text/plain\r\n\r\n`;
    body += `${fileContent}\r\n`;
    body += `--${boundary}--\r\n`;

    const res = await fetch(`http://localhost:5000/api/admin/certificates/${request.id}/status`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body
    });

    console.log('Status code:', res.status);
    const text = await res.text();
    console.log('Response:', text);
}

test().catch(console.error);

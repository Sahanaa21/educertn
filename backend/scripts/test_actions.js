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

    let request1 = await prisma.certificateRequest.findFirst({ where: { copyType: 'SOFT_COPY' } });
    let request2 = await prisma.certificateRequest.findFirst({ where: { copyType: 'HARD_COPY' } });

    // Create test dummy requests if not exist
    if (!request1) {
        request1 = await prisma.certificateRequest.create({
            data: {
                userId: admin.id,
                usn: '1GAT22CS001',
                studentName: 'Test Student Soft',
                branch: 'CSE',
                yearOfPassing: '2022',
                certificateType: 'TRANSCRIPT',
                copyType: 'SOFT_COPY',
                copies: 1,
                status: 'PROCESSING'
            }
        });
    } else {
        await prisma.certificateRequest.update({ where: { id: request1.id }, data: { status: 'PROCESSING', softCopyEmailed: false } });
    }

    if (!request2) {
        request2 = await prisma.certificateRequest.create({
            data: {
                userId: admin.id,
                usn: '1GAT22CS002',
                studentName: 'Test Student Hard',
                branch: 'CSE',
                yearOfPassing: '2022',
                certificateType: 'TRANSCRIPT',
                copyType: 'HARD_COPY',
                copies: 1,
                status: 'PROCESSING'
            }
        });
    } else {
        await prisma.certificateRequest.update({ where: { id: request2.id }, data: { status: 'PROCESSING', physicalCopyPosted: false } });
    }

    console.log(`Testing UPLOAD_SOFT_COPY on ${request1.id}`);
    const boundary = '----WebKitFormBoundary7i1rJTheO5lQ';
    let body1 = '';
    body1 += `--${boundary}\r\nContent-Disposition: form-data; name="action"\r\n\r\nUPLOAD_SOFT_COPY\r\n`;
    body1 += `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="dummy.txt"\r\nContent-Type: text/plain\r\n\r\nHello File\r\n--${boundary}--\r\n`;

    let res1 = await fetch(`http://localhost:5000/api/admin/certificates/${request1.id}/status`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: body1
    });
    console.log('Soft Copy res:', res1.status, await res1.text());

    console.log(`Testing MARK_POSTED on ${request2.id}`);
    let res2 = await fetch(`http://localhost:5000/api/admin/certificates/${request2.id}/status`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'MARK_POSTED' })
    });
    console.log('Hard Copy res:', res2.status, await res2.text());
}

test().catch(console.error);

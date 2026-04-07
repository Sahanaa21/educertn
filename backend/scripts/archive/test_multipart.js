const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function test() {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const token = jwt.sign({ id: admin.id, role: admin.role }, process.env.JWT_SECRET || 'secret123', { expiresIn: '1d' });

    // Find aBOTH request that is Processing
    let reqBoth = await prisma.certificateRequest.findFirst({ where: { copyType: 'BOTH' } });
    if (!reqBoth) {
        reqBoth = await prisma.certificateRequest.create({
            data: {
                userId: admin.id,
                usn: '1GAT22CS003',
                studentName: 'Test Both',
                branch: 'CSE',
                yearOfPassing: '2022',
                certificateType: 'TRANSCRIPT',
                copyType: 'BOTH',
                copies: 1,
                status: 'PROCESSING'
            }
        });
    } else {
        await prisma.certificateRequest.update({ where: { id: reqBoth.id }, data: { status: 'PROCESSING', softCopyEmailed: false, physicalCopyPosted: false } });
    }

    console.log(`Testing UPLOAD_SOFT_COPY on BOTH request: ${reqBoth.id}`);

    const formData = new FormData();
    formData.append('action', 'UPLOAD_SOFT_COPY');
    formData.append('file', new Blob(['Hello Dummy PDF Content']), 'dummy.pdf');

    let res1 = await fetch(`http://localhost:5000/api/admin/certificates/${reqBoth.id}/status`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    console.log('Soft Copy UPLOAD res:', res1.status, await res1.text());

    // Check state
    const stateAfterSoft = await prisma.certificateRequest.findUnique({ where: { id: reqBoth.id } });
    console.log('State after Soft Copy Upload:', JSON.stringify(stateAfterSoft, null, 2));

    console.log(`Testing MARK_POSTED on BOTH request: ${reqBoth.id}`);
    let res2 = await fetch(`http://localhost:5000/api/admin/certificates/${reqBoth.id}/status`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'MARK_POSTED' })
    });
    console.log('Hard Copy DISPATCH res:', res2.status, await res2.text());

    // Check state
    const stateAfterHard = await prisma.certificateRequest.findUnique({ where: { id: reqBoth.id } });
    console.log('State after Hard Copy Dispatch:', JSON.stringify(stateAfterHard, null, 2));
}

test().catch(console.error);

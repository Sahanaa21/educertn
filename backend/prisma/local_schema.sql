CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN', 'COMPANY');
CREATE TYPE "CertificateStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED');
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED');
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "AcademicServiceType" AS ENUM ('PHOTOCOPY', 'REEVALUATION');
CREATE TYPE "AcademicServiceStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'RESULT_PUBLISHED', 'REJECTED');
CREATE TYPE "CopyType" AS ENUM ('SOFT_COPY', 'HARD_COPY', 'BOTH');

CREATE TABLE IF NOT EXISTS "User" (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT,
    name TEXT,
    role "Role" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "OTP" (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "CertificateRequest" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"(id),
    usn TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    branch TEXT NOT NULL,
    "yearOfPassing" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "certificateType" TEXT NOT NULL,
    "copyType" "CopyType" NOT NULL,
    copies INTEGER NOT NULL DEFAULT 1,
    reason TEXT,
    address TEXT,
    "idProofUrl" TEXT,
    "supportingDocsUrl" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentOrderId" TEXT,
    status "CertificateStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "physicalCopyPosted" BOOLEAN NOT NULL DEFAULT FALSE,
    "softCopyEmailed" BOOLEAN NOT NULL DEFAULT FALSE,
    "issuedCertificateUrl" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "VerificationRequest" (
    id TEXT PRIMARY KEY,
    "requestId" TEXT NOT NULL UNIQUE,
    "companyName" TEXT NOT NULL,
    "companyEmail" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    phone TEXT,
    "studentName" TEXT NOT NULL,
    usn TEXT NOT NULL,
    "uploadedTemplate" TEXT NOT NULL,
    "completedFile" TEXT,
    "paymentOrderId" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    status "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "IssueReport" (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    "pageUrl" TEXT,
    "reportedByName" TEXT,
    "reportedByEmail" TEXT,
    role TEXT,
    "deviceInfo" TEXT,
    status "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "PortalSettings" (
    id INTEGER PRIMARY KEY,
    "supportEmail" TEXT NOT NULL,
    "frontendUrl" TEXT NOT NULL,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT FALSE,
    "allowCompanySignup" BOOLEAN NOT NULL DEFAULT TRUE,
    "smtpFromName" TEXT NOT NULL,
    "adminAllowedEmails" TEXT NOT NULL DEFAULT '',
    "academicServicesEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
    "academicServicesStartAt" TIMESTAMPTZ,
    "academicServicesEndAt" TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "AcademicServiceRequest" (
    id TEXT PRIMARY KEY,
    "requestId" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL REFERENCES "User"(id),
    "serviceType" "AcademicServiceType" NOT NULL,
    semester TEXT NOT NULL,
    "courseCount" INTEGER NOT NULL,
    "courseNames" JSONB NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentOrderId" TEXT,
    status "AcademicServiceStatus" NOT NULL DEFAULT 'PENDING',
    "adminRemarks" TEXT,
    "resultSummary" TEXT,
    "attachmentUrls" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "StudentProfile" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
    usn TEXT NOT NULL,
    branch TEXT NOT NULL,
    "yearOfPassing" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "CompanyProfile" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
    "companyName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

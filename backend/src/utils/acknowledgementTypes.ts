export interface AcknowledgementData {
    requestId: string;
    requestType: 'CERTIFICATE' | 'VERIFICATION' | 'ACADEMIC_SERVICE';
    name: string;
    usn?: string;
    email?: string;
    companyName?: string;
    companyEmail?: string;
    details: Record<string, string>;
    amount: number;
    paymentOrderId: string;
    createdAt: Date;
}
export interface AcknowledgementData {
    requestId: string;
    requestType: 'CERTIFICATE' | 'VERIFICATION' | 'ACADEMIC_SERVICE';
    name: string;
    usn?: string;
    email?: string;
    companyName?: string;
    companyEmail?: string;
    details: Record<string, string>;
    amount: number;
    paymentOrderId: string;
    createdAt: Date;
}

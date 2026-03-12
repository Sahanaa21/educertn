"use client";

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Loader2, Smartphone, WalletCards } from 'lucide-react';

type DemoPaymentDialogProps = {
    amount: number;
    open: boolean;
    processing?: boolean;
    title: string;
    description: string;
    payerHint?: string;
    onConfirm: () => void | Promise<void>;
    onOpenChange: (open: boolean) => void;
};

export default function DemoPaymentDialog({
    amount,
    open,
    processing = false,
    title,
    description,
    payerHint,
    onConfirm,
    onOpenChange,
}: DemoPaymentDialogProps) {
    const [method, setMethod] = useState('card');
    const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
    const [cardName, setCardName] = useState('Demo User');
    const [expiry, setExpiry] = useState('12/30');
    const [cvv, setCvv] = useState('123');
    const [upiId, setUpiId] = useState('demo@gpay');

    const canSubmit = useMemo(() => {
        if (method === 'card') {
            return cardNumber.replace(/\s/g, '').length >= 16 && cardName.trim() && expiry.trim() && cvv.trim().length >= 3;
        }
        return upiId.trim().includes('@');
    }, [cardName, cardNumber, cvv, expiry, method, upiId]);

    const handleConfirm = () => {
        if (!canSubmit || processing) return;
        onConfirm();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg gap-5">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <DialogTitle>{title}</DialogTitle>
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">Demo Mode</Badge>
                    </div>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="rounded-xl border bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Amount Payable</p>
                            <p className="mt-1 text-3xl font-bold text-slate-900">₹ {amount.toFixed(2)}</p>
                            {payerHint ? <p className="mt-1 text-xs text-slate-500">Payer: {payerHint}</p> : null}
                        </div>
                        <WalletCards className="h-9 w-9 text-slate-400" />
                    </div>
                </div>

                <Tabs value={method} onValueChange={setMethod} className="gap-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="card"><CreditCard className="mr-1 h-4 w-4" /> Card</TabsTrigger>
                        <TabsTrigger value="gpay"><Smartphone className="mr-1 h-4 w-4" /> GPay</TabsTrigger>
                        <TabsTrigger value="phonepe"><Smartphone className="mr-1 h-4 w-4" /> PhonePe</TabsTrigger>
                    </TabsList>

                    <TabsContent value="card" className="space-y-3">
                        <div className="space-y-2">
                            <Label htmlFor="demo-card-number">Card Number</Label>
                            <Input id="demo-card-number" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="4242 4242 4242 4242" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="demo-card-name">Name on Card</Label>
                            <Input id="demo-card-name" value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Demo User" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="demo-expiry">Expiry</Label>
                                <Input id="demo-expiry" value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="12/30" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="demo-cvv">CVV</Label>
                                <Input id="demo-cvv" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123" />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="gpay" className="space-y-3">
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                            Use any valid-looking UPI ID to simulate a GPay payment. No real charge is created.
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="demo-gpay-upi">GPay UPI ID</Label>
                            <Input id="demo-gpay-upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@gpay" />
                        </div>
                    </TabsContent>

                    <TabsContent value="phonepe" className="space-y-3">
                        <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
                            Use any valid-looking UPI ID to simulate a PhonePe payment. No real charge is created.
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="demo-phonepe-upi">PhonePe UPI ID</Label>
                            <Input id="demo-phonepe-upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@ybl" />
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="sm:justify-between">
                    <p className="text-xs text-slate-500">This is a demo payment screen for UI flow validation.</p>
                    <Button onClick={handleConfirm} disabled={!canSubmit || processing} className="min-w-40">
                        {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {processing ? 'Processing...' : 'Complete Demo Payment'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/services/api';
import type { Client, Company, Invoice, Receipt } from '@/types';
import { PrintableDocument } from '@/components/document/printable-document';
import { PrintToolbar } from '@/components/document/print-toolbar';

export default function ReceiptPrint() {
    const { id } = useParams<{ id: string }>();
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [invoice, setInvoice] = useState<Invoice | null>(null);

    useEffect(() => {
        if (!id) return;
        api.getReceipt(id).then(async (rec) => {
            if (!rec) return;
            setReceipt(rec);
            const [comp, inv] = await Promise.all([
                api.getCompany(rec.company_id),
                api.getInvoice(rec.invoice_id),
            ]);
            setCompany(comp ?? null);
            setInvoice(inv ?? null);
            if (inv) {
                const cli = await api.getClient(inv.client_id);
                setClient(cli ?? null);
            }
        });
    }, [id]);

    if (!receipt || !company || !client || !invoice) {
        return <p className="p-10 text-sm text-muted-foreground">A carregar recibo...</p>;
    }

    return (
        <>
            <PrintToolbar />
            <PrintableDocument
                documentType="RECIBO"
                company={company}
                client={client}
                number={receipt.number}
                date={receipt.date}
                receiptInfo={{
                    amount: receipt.amount,
                    method: receipt.method,
                    reference: receipt.reference,
                    invoiceNumber: invoice.number,
                }}
                stamp={receipt.voided ? 'ANULADO' : undefined}
            />
        </>
    );
}

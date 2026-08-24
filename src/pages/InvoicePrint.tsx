import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/services/api';
import type { Client, Company, Invoice } from '@/types';
import { PrintableDocument } from '@/components/document/printable-document';
import { PrintToolbar } from '@/components/document/print-toolbar';
import { INVOICE_STATUS_LABELS } from '@/lib/status-labels';

export default function InvoicePrint() {
    const { id } = useParams<{ id: string }>();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [client, setClient] = useState<Client | null>(null);

    useEffect(() => {
        if (!id) return;
        api.getInvoice(id).then(async (inv) => {
            if (!inv) return;
            setInvoice(inv);
            const [comp, cli] = await Promise.all([
                api.getCompany(inv.company_id),
                api.getClient(inv.client_id),
            ]);
            setCompany(comp ?? null);
            setClient(cli ?? null);
        });
    }, [id]);

    if (!invoice || !company || !client) {
        return <p className="p-10 text-sm text-muted-foreground">A carregar fatura...</p>;
    }

    return (
        <>
            <PrintToolbar />
            <PrintableDocument
                documentType="FATURA"
                company={company}
                client={client}
                number={invoice.number}
                date={invoice.date}
                secondaryDate={{ label: 'Vencimento', value: invoice.due_date }}
                items={invoice.items}
                notes={invoice.notes}
                reference={invoice.reference}
                createdBy={invoice.created_by}
                stamp={invoice.status === 'CANCELLED' ? 'CANCELADA' : undefined}
                statusLabel={invoice.status !== 'CANCELLED' ? INVOICE_STATUS_LABELS[invoice.status] : undefined}
            />
        </>
    );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/services/api';
import type { Client, Company, Invoice, Receipt } from '@/types';
import { ClientStatementDocument } from '@/components/document/client-statement-document';
import { PrintToolbar } from '@/components/document/print-toolbar';
import { generatePdf } from '@/lib/generate-pdf';

export default function StatementPrint() {
    const { clientId } = useParams<{ clientId: string }>();
    const [searchParams] = useSearchParams();
    const dateFrom = searchParams.get('from') ?? undefined;
    const dateTo = searchParams.get('to') ?? undefined;

    const [client, setClient] = useState<Client | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const documentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!clientId) return;
        api.getClient(clientId).then(async (cli) => {
            if (!cli) return;
            setClient(cli);
            const [comp, invs, recs] = await Promise.all([
                api.getCompany(cli.company_id),
                api.getInvoices(cli.company_id),
                api.getReceipts(cli.company_id),
            ]);
            setCompany(comp ?? null);
            setInvoices(invs.filter((i) => i.client_id === clientId));
            setReceipts(recs);
        });
    }, [clientId]);

    const clientInvoiceIds = useMemo(() => new Set(invoices.map((i) => i.id)), [invoices]);

    function inRange(dateIso: string) {
        const day = dateIso.slice(0, 10);
        if (dateFrom && day < dateFrom) return false;
        if (dateTo && day > dateTo) return false;
        return true;
    }

    const filteredInvoices = useMemo(
        () => invoices.filter((i) => inRange(i.date)).sort((a, b) => a.date.localeCompare(b.date)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [invoices, dateFrom, dateTo]
    );
    const filteredReceipts = useMemo(
        () =>
            receipts
                .filter((r) => clientInvoiceIds.has(r.invoice_id) && inRange(r.date))
                .sort((a, b) => a.date.localeCompare(b.date)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [receipts, clientInvoiceIds, dateFrom, dateTo]
    );

    if (!client || !company) {
        return <p className="p-10 text-sm text-muted-foreground">A carregar extrato...</p>;
    }

    return (
        <>
            <PrintToolbar
                onDownload={async () => {
                    if (documentRef.current) {
                        await generatePdf(documentRef.current, `Extrato-${client.name}.pdf`);
                    }
                }}
            />
            <ClientStatementDocument
                ref={documentRef}
                company={company}
                client={client}
                dateFrom={dateFrom}
                dateTo={dateTo}
                invoices={filteredInvoices}
                receipts={filteredReceipts}
            />
        </>
    );
}

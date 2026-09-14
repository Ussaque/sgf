import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/services/api';
import type { Client, Company, Quotation } from '@/types';
import { PrintableDocument } from '@/components/document/printable-document';
import { PrintToolbar } from '@/components/document/print-toolbar';
import { generatePdf } from '@/lib/generate-pdf';

export default function QuotationPrint() {
    const { id } = useParams<{ id: string }>();
    const [quotation, setQuotation] = useState<Quotation | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const documentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!id) return;
        api.getQuotation(id).then(async (quo) => {
            if (!quo) return;
            setQuotation(quo);
            const [comp, cli] = await Promise.all([
                api.getCompany(quo.company_id),
                api.getClient(quo.client_id),
            ]);
            setCompany(comp ?? null);
            setClient(cli ?? null);
        });
    }, [id]);

    if (!quotation || !company || !client) {
        return <p className="p-10 text-sm text-muted-foreground">A carregar cotação...</p>;
    }

    return (
        <>
            <PrintToolbar
                onDownload={async () => {
                    if (documentRef.current) {
                        await generatePdf(documentRef.current, `Cotacao-${quotation.number}.pdf`);
                    }
                }}
            />
            <PrintableDocument
                ref={documentRef}
                documentType="COTAÇÃO"
                company={company}
                client={client}
                number={quotation.number}
                date={quotation.date}
                secondaryDate={{ label: 'Válido até', value: quotation.valid_until }}
                items={quotation.items}
                notes={quotation.notes}
                reference={quotation.reference}
                createdBy={quotation.created_by}
                stamp={quotation.status === 'REJECTED' ? 'REJEITADA' : undefined}
            />
        </>
    );
}

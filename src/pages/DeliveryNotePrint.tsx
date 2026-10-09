import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/services/api';
import type { Client, Company, DeliveryNote } from '@/types';
import { PrintableDocument } from '@/components/document/printable-document';
import { PrintToolbar } from '@/components/document/print-toolbar';
import { generatePdf } from '@/lib/generate-pdf';

export default function DeliveryNotePrint() {
    const { id } = useParams<{ id: string }>();
    const [deliveryNote, setDeliveryNote] = useState<DeliveryNote | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [invoiceNumber, setInvoiceNumber] = useState<string | undefined>();
    const documentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!id) return;
        api.getDeliveryNote(id).then(async (note) => {
            if (!note) return;
            setDeliveryNote(note);
            const [comp, cli, inv] = await Promise.all([
                api.getCompany(note.company_id),
                api.getClient(note.client_id),
                note.invoice_id ? api.getInvoice(note.invoice_id) : Promise.resolve(undefined),
            ]);
            setCompany(comp ?? null);
            setClient(cli ?? null);
            setInvoiceNumber(inv?.number);
        });
    }, [id]);

    if (!deliveryNote || !company || !client) {
        return <p className="p-10 text-sm text-muted-foreground">A carregar guia de entrega...</p>;
    }

    return (
        <>
            <PrintToolbar
                onDownload={async () => {
                    if (documentRef.current) {
                        await generatePdf(documentRef.current, `Guia-${deliveryNote.number}.pdf`);
                    }
                }}
            />
            <PrintableDocument
                ref={documentRef}
                documentType="GUIA DE ENTREGA"
                company={company}
                client={client}
                number={deliveryNote.number}
                date={deliveryNote.date}
                items={deliveryNote.items}
                notes={deliveryNote.notes}
                reference={deliveryNote.reference}
                createdBy={deliveryNote.created_by}
                receivedBy={deliveryNote.received_by}
                relatedInvoiceNumber={invoiceNumber}
                stamp={deliveryNote.status === 'CANCELLED' ? 'CANCELADA' : undefined}
            />
        </>
    );
}

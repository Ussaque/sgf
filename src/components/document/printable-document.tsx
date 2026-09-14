import type { Ref } from 'react';
import type { Client, Company, InvoiceItem } from '@/types';
import { computeTotals } from '@/lib/document-totals';
import { cn, darkenForText, formatCurrency, formatDate } from '@/lib/utils';
import { printStyles } from './print-styles';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: 'Dinheiro',
    BANK_TRANSFER: 'Transferência bancária',
    CHECK: 'Cheque',
    POS: 'POS / Multibanco',
    MOBILE_MONEY: 'Mobile money',
};

type ReceiptInfo = {
    amount: number;
    method: string;
    reference?: string;
    invoiceNumber: string;
};

interface PrintableDocumentProps {
    documentType: 'FATURA' | 'RECIBO' | 'COTAÇÃO';
    company: Company;
    client: Client;
    number: string;
    date: string;
    secondaryDate?: { label: string; value: string };
    items?: InvoiceItem[];
    notes?: string;
    /** Free-form contract/reference line, shown highlighted before the table. */
    reference?: string;
    /** Name of the user who issued the document. */
    createdBy?: string;
    receiptInfo?: ReceiptInfo;
    /** Large diagonal watermark for a voided/cancelled document, e.g. "ANULADO" or "CANCELADA". */
    stamp?: string;
    /** Small status badge shown next to the document type, e.g. "Paga", "Atrasada". */
    statusLabel?: string;
    ref?: Ref<HTMLDivElement>;
}

function daysBetween(from: string, to: string): number {
    const ms = new Date(to).getTime() - new Date(from).getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function PrintableDocument({
    ref,
    documentType,
    company,
    client,
    number,
    date,
    secondaryDate,
    items,
    notes,
    reference,
    createdBy,
    receiptInfo,
    stamp,
    statusLabel,
}: PrintableDocumentProps) {
    const accentColor = company.brand_color || 'var(--primary)';
    const accentTextColor = company.brand_color ? darkenForText(company.brand_color) : accentColor;
    const totals = items ? computeTotals(items) : null;
    const hasPaymentInfo =
        documentType !== 'RECIBO' &&
        Boolean(
            (company.bank_accounts && company.bank_accounts.length > 0) ||
                company.mpesa_number ||
                company.emola_number ||
                company.payment_notes
        );
    const termDays = secondaryDate ? daysBetween(date, secondaryDate.value) : null;

    return (
        <div
            ref={ref}
            className={cn(
                'print-document relative mx-auto max-w-3xl bg-white p-10 text-sm text-neutral-900',
                documentType === 'RECIBO' && 'flex min-h-[273mm] flex-col'
            )}
        >
            <style>{printStyles}</style>
            {stamp && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                    <span className="rotate-[-30deg] border-4 border-red-600 px-8 py-2 text-5xl font-bold tracking-widest text-red-600 opacity-40">
                        {stamp}
                    </span>
                </div>
            )}

            <div className="print-header-block">
            <header
                className="flex items-start justify-between border-b-2 pb-6"
                style={{ borderColor: accentColor }}
            >
                <div>
                    <div className="flex items-center gap-2">
                        <h1
                            className="text-lg font-bold tracking-wide uppercase"
                            style={{ color: accentTextColor }}
                        >
                            {documentType}
                        </h1>
                        {statusLabel && (
                            <span
                                className="rounded-full border px-2 py-0.5 text-xs font-medium"
                                style={{ borderColor: accentColor, color: accentTextColor }}
                            >
                                {statusLabel}
                            </span>
                        )}
                    </div>
                    <div className="mt-3 grid gap-1 text-xs">
                        <div className="flex gap-3">
                            <span className="w-36 shrink-0 text-neutral-500">Número</span>
                            <span className="font-medium">{number}</span>
                        </div>
                        <div className="flex gap-3">
                            <span className="w-36 shrink-0 text-neutral-500">Data de emissão</span>
                            <span>{formatDate(date)}</span>
                        </div>
                        {secondaryDate && (
                            <div className="flex gap-3">
                                <span className="w-36 shrink-0 text-neutral-500">{secondaryDate.label}</span>
                                <span>
                                    {formatDate(secondaryDate.value)}
                                    {termDays !== null && termDays >= 0 && ` (${termDays} dias)`}
                                </span>
                            </div>
                        )}
                        {createdBy && (
                            <div className="flex gap-3">
                                <span className="w-36 shrink-0 text-neutral-500">Emitida por</span>
                                <span>{createdBy}</span>
                            </div>
                        )}
                    </div>
                </div>
                {company.logo_url && (
                    <img
                        src={company.logo_url}
                        alt={company.name}
                        className="size-32 shrink-0 rounded-md object-contain"
                    />
                )}
            </header>

            <section className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                    <p className="text-xs font-bold tracking-wide uppercase">{company.name}</p>
                    <div className="mt-1 grid gap-0.5 text-xs text-neutral-600">
                        <p>Endereço: {company.address}</p>
                        <p>NUIT: {company.nuit}</p>
                        {company.phone && <p>Contacto: {company.phone}</p>}
                        <p>Email: {company.email}</p>
                    </div>
                </div>
                <div>
                    <p className="text-xs font-bold tracking-wide uppercase">Para</p>
                    <div className="mt-1 grid gap-0.5 text-xs text-neutral-600">
                        <p className="font-medium text-neutral-900">{client.name}</p>
                        <p>Endereço: {client.address}</p>
                        <p>NUIT: {client.nuit}</p>
                        {client.phone && <p>Contacto: {client.phone}</p>}
                        <p>Email: {client.email}</p>
                    </div>
                </div>
            </section>
            </div>

            {reference && (
                <p className="mt-4 border-b border-neutral-200 pb-3 text-xs text-neutral-600 italic">
                    {reference}
                </p>
            )}

            {items && totals && (
                <section className="mt-6">
                    <table className="w-full border-collapse border border-neutral-900 text-xs">
                        <thead>
                            <tr className="bg-neutral-100">
                                <th className="border-b border-neutral-900 px-2 py-2 text-center font-bold">
                                    Nr.
                                </th>
                                <th className="border-b border-neutral-900 px-2 py-2 text-left font-bold">
                                    Descrição
                                </th>
                                <th className="border-b border-neutral-900 px-2 py-2 text-center font-bold">
                                    Qtd.
                                </th>
                                <th className="border-b border-neutral-900 px-2 py-2 text-right font-bold">
                                    Preço unitário
                                </th>
                                <th className="border-b border-neutral-900 px-2 py-2 text-center font-bold">
                                    IVA
                                </th>
                                <th className="border-b border-neutral-900 px-2 py-2 text-right font-bold">
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={item.id} className="border-b border-neutral-200">
                                    <td className="px-2 py-2 text-center">{index + 1}</td>
                                    <td className="px-2 py-2">{item.description}</td>
                                    <td className="px-2 py-2 text-center">{item.quantity}</td>
                                    <td className="px-2 py-2 text-right font-mono">
                                        {formatCurrency(item.unit_price)}
                                    </td>
                                    <td className="px-2 py-2 text-center">{item.tax_rate}%</td>
                                    <td className="px-2 py-2 text-right font-mono">
                                        {formatCurrency(
                                            item.quantity * item.unit_price * (1 + item.tax_rate / 100)
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="ml-auto mt-4 w-64 text-xs">
                        <div className="flex justify-between border-b border-neutral-200 py-1.5">
                            <span className="text-neutral-600">Subtotal</span>
                            <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between border-b border-neutral-200 py-1.5">
                            <span className="text-neutral-600">Total impostos</span>
                            <span className="font-mono">{formatCurrency(totals.tax_total)}</span>
                        </div>
                        <div
                            className="mt-1 flex items-center justify-between rounded-md px-2 py-2 text-base font-bold"
                            style={{
                                backgroundColor: `color-mix(in srgb, ${accentColor} 15%, white)`,
                                color: accentTextColor,
                            }}
                        >
                            <span>Total</span>
                            <span className="font-mono">{formatCurrency(totals.total)}</span>
                        </div>
                    </div>
                </section>
            )}

            {receiptInfo && (
                <section className="mt-6 grid gap-2 text-xs">
                    <div className="flex justify-between border-b border-neutral-200 py-2">
                        <span className="text-neutral-600">Referente à fatura</span>
                        <span>{receiptInfo.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-200 py-2">
                        <span className="text-neutral-600">Método de pagamento</span>
                        <span>{PAYMENT_METHOD_LABELS[receiptInfo.method] ?? receiptInfo.method}</span>
                    </div>
                    {receiptInfo.reference && (
                        <div className="flex justify-between border-b border-neutral-200 py-2">
                            <span className="text-neutral-600">Referência</span>
                            <span>{receiptInfo.reference}</span>
                        </div>
                    )}
                    <div className="flex justify-between py-2 text-sm font-semibold">
                        <span>Valor pago</span>
                        <span className="font-mono">{formatCurrency(receiptInfo.amount)}</span>
                    </div>
                </section>
            )}

            {notes && (
                <section className="mt-6">
                    <p className="text-xs font-bold tracking-wide text-neutral-500 uppercase">Notas</p>
                    <p className="mt-1 text-xs whitespace-pre-wrap text-neutral-700">{notes}</p>
                </section>
            )}

            <footer
                className={cn(
                    'print-footer border-t border-neutral-200 bg-white pt-3',
                    documentType === 'RECIBO' ? 'mt-auto' : 'mt-10'
                )}
            >
                {hasPaymentInfo && (
                    <section className="text-xs">
                        <p className="font-bold tracking-wide uppercase">Formas de pagamento:</p>

                        {company.bank_accounts && company.bank_accounts.length > 0 && (
                            <div className="mt-1.5 grid gap-2.5">
                                {company.bank_accounts.map((account) => (
                                    <div key={account.id} className="grid gap-0.5">
                                        <p
                                            className={
                                                company.bank_accounts!.length > 1 ? 'font-medium' : undefined
                                            }
                                        >
                                            Banco - {account.bank_name} ({account.currency})
                                        </p>
                                        {account.account_holder && <p>Titular - {account.account_holder}</p>}
                                        <p>Número da Conta - {account.account_number}</p>
                                        {account.nib && <p>NIB - {account.nib}</p>}
                                        {account.iban && <p>IBAN - {account.iban}</p>}
                                        {account.swift_code && <p>Swift - {account.swift_code}</p>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {(company.mpesa_number || company.emola_number) && (
                            <div className="mt-2 grid gap-0.5">
                                {company.mpesa_number && <p>M-Pesa - {company.mpesa_number}</p>}
                                {company.emola_number && <p>E-Mola - {company.emola_number}</p>}
                            </div>
                        )}

                        {company.payment_notes && (
                            <p className="mt-2 whitespace-pre-wrap text-neutral-700">{company.payment_notes}</p>
                        )}
                    </section>
                )}

                <p className="mt-3 border-t border-neutral-200 pt-3 text-center text-[10px] text-neutral-500">
                    Processado por computador · {company.name} · {new Date(date).getFullYear()}
                </p>
            </footer>
        </div>
    );
}

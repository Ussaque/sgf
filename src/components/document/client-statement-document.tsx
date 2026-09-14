import type { Ref } from 'react';
import type { Client, Company, Invoice, Quotation, Receipt } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { INVOICE_STATUS_LABELS, QUOTATION_STATUS_LABELS } from '@/lib/status-labels';
import { printStyles } from './print-styles';

const METHOD_LABELS: Record<string, string> = {
    CASH: 'Dinheiro',
    BANK_TRANSFER: 'Transferência bancária',
    CHECK: 'Cheque',
    POS: 'POS / Multibanco',
    MOBILE_MONEY: 'Mobile money',
};

interface ClientStatementDocumentProps {
    ref?: Ref<HTMLDivElement>;
    company: Company;
    client: Client;
    dateFrom?: string;
    dateTo?: string;
    invoices: Invoice[];
    quotations: Quotation[];
    receipts: Receipt[];
}

export function ClientStatementDocument({
    ref,
    company,
    client,
    dateFrom,
    dateTo,
    invoices,
    quotations,
    receipts,
}: ClientStatementDocumentProps) {
    const totalInvoiced = invoices
        .filter((i) => i.status !== 'CANCELLED')
        .reduce((sum, i) => sum + i.total, 0);
    const totalReceived = receipts.filter((r) => !r.voided).reduce((sum, r) => sum + r.amount, 0);
    const totalOutstanding = invoices
        .filter((i) => i.status === 'SENT' || i.status === 'OVERDUE')
        .reduce((sum, i) => sum + i.total, 0);

    const periodLabel =
        dateFrom || dateTo
            ? `${dateFrom ? formatDate(dateFrom) : 'início'} — ${dateTo ? formatDate(dateTo) : 'hoje'}`
            : 'Todo o histórico';

    return (
        <div ref={ref} className="print-document relative mx-auto max-w-3xl bg-white p-10 text-sm text-neutral-900">
            <style>{printStyles}</style>

            <div className="print-header-block">
                <header className="flex items-start justify-between border-b-2 border-neutral-900 pb-6">
                    <div>
                        <h1 className="text-lg font-bold tracking-wide uppercase">Extrato de conta</h1>
                        <div className="mt-3 grid gap-1 text-xs">
                            <div className="flex gap-3">
                                <span className="w-28 shrink-0 text-neutral-500">Cliente</span>
                                <span className="font-medium">{client.name}</span>
                            </div>
                            <div className="flex gap-3">
                                <span className="w-28 shrink-0 text-neutral-500">Período</span>
                                <span>{periodLabel}</span>
                            </div>
                            <div className="flex gap-3">
                                <span className="w-28 shrink-0 text-neutral-500">Emitido em</span>
                                <span>{formatDate(new Date().toISOString())}</span>
                            </div>
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
                        <p className="text-xs font-bold tracking-wide uppercase">Cliente</p>
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

            <section className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-md border border-neutral-200 p-3">
                    <p className="text-xs text-neutral-500">Total faturado</p>
                    <p className="mt-1 font-mono text-base font-bold">{formatCurrency(totalInvoiced)}</p>
                </div>
                <div className="rounded-md border border-neutral-200 p-3">
                    <p className="text-xs text-neutral-500">Total recebido</p>
                    <p className="mt-1 font-mono text-base font-bold text-emerald-700">
                        {formatCurrency(totalReceived)}
                    </p>
                </div>
                <div className="rounded-md border border-neutral-200 p-3">
                    <p className="text-xs text-neutral-500">Total em aberto</p>
                    <p className="mt-1 font-mono text-base font-bold text-amber-700">
                        {formatCurrency(totalOutstanding)}
                    </p>
                </div>
            </section>

            <section className="mt-6">
                <p className="text-xs font-bold tracking-wide text-neutral-500 uppercase">Faturas</p>
                <table className="mt-2 w-full border-collapse border border-neutral-900 text-xs">
                    <thead>
                        <tr className="bg-neutral-100">
                            <th className="border-b border-neutral-900 px-2 py-2 text-left font-bold">Número</th>
                            <th className="border-b border-neutral-900 px-2 py-2 text-left font-bold">Data</th>
                            <th className="border-b border-neutral-900 px-2 py-2 text-left font-bold">Vencimento</th>
                            <th className="border-b border-neutral-900 px-2 py-2 text-left font-bold">Estado</th>
                            <th className="border-b border-neutral-900 px-2 py-2 text-right font-bold">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map((invoice) => (
                            <tr key={invoice.id} className="border-b border-neutral-200">
                                <td className="px-2 py-2">{invoice.number}</td>
                                <td className="px-2 py-2">{formatDate(invoice.date)}</td>
                                <td className="px-2 py-2">{formatDate(invoice.due_date)}</td>
                                <td className="px-2 py-2">{INVOICE_STATUS_LABELS[invoice.status]}</td>
                                <td className="px-2 py-2 text-right font-mono">{formatCurrency(invoice.total)}</td>
                            </tr>
                        ))}
                        {invoices.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-2 py-3 text-center text-neutral-500">
                                    Sem faturas neste período.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>

            <section className="mt-6">
                <p className="text-xs font-bold tracking-wide text-neutral-500 uppercase">Cotações</p>
                <table className="mt-2 w-full border-collapse border border-neutral-900 text-xs">
                    <thead>
                        <tr className="bg-neutral-100">
                            <th className="border-b border-neutral-900 px-2 py-2 text-left font-bold">Número</th>
                            <th className="border-b border-neutral-900 px-2 py-2 text-left font-bold">Data</th>
                            <th className="border-b border-neutral-900 px-2 py-2 text-left font-bold">Estado</th>
                            <th className="border-b border-neutral-900 px-2 py-2 text-right font-bold">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quotations.map((quotation) => (
                            <tr key={quotation.id} className="border-b border-neutral-200">
                                <td className="px-2 py-2">{quotation.number}</td>
                                <td className="px-2 py-2">{formatDate(quotation.date)}</td>
                                <td className="px-2 py-2">{QUOTATION_STATUS_LABELS[quotation.status]}</td>
                                <td className="px-2 py-2 text-right font-mono">{formatCurrency(quotation.total)}</td>
                            </tr>
                        ))}
                        {quotations.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-2 py-3 text-center text-neutral-500">
                                    Sem cotações neste período.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>

            <section className="mt-6">
                <p className="text-xs font-bold tracking-wide text-neutral-500 uppercase">Recibos</p>
                <table className="mt-2 w-full border-collapse border border-neutral-900 text-xs">
                    <thead>
                        <tr className="bg-neutral-100">
                            <th className="border-b border-neutral-900 px-2 py-2 text-left font-bold">Número</th>
                            <th className="border-b border-neutral-900 px-2 py-2 text-left font-bold">Data</th>
                            <th className="border-b border-neutral-900 px-2 py-2 text-left font-bold">Método</th>
                            <th className="border-b border-neutral-900 px-2 py-2 text-left font-bold">Estado</th>
                            <th className="border-b border-neutral-900 px-2 py-2 text-right font-bold">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {receipts.map((receipt) => (
                            <tr key={receipt.id} className="border-b border-neutral-200">
                                <td className="px-2 py-2">{receipt.number}</td>
                                <td className="px-2 py-2">{formatDate(receipt.date)}</td>
                                <td className="px-2 py-2">{METHOD_LABELS[receipt.method] ?? receipt.method}</td>
                                <td className="px-2 py-2">{receipt.voided ? 'Anulado' : 'Emitido'}</td>
                                <td className="px-2 py-2 text-right font-mono">{formatCurrency(receipt.amount)}</td>
                            </tr>
                        ))}
                        {receipts.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-2 py-3 text-center text-neutral-500">
                                    Sem recibos neste período.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>

            <footer className="print-footer mt-10 border-t border-neutral-200 bg-white pt-3">
                <p className="text-center text-[10px] text-neutral-500">
                    Processado por computador · {company.name} · {new Date().getFullYear()}
                </p>
            </footer>
        </div>
    );
}

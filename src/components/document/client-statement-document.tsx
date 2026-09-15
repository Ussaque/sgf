import type { Ref } from 'react';
import type { Client, Company, Invoice, Receipt } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { printStyles } from './print-styles';

interface ClientStatementDocumentProps {
    ref?: Ref<HTMLDivElement>;
    company: Company;
    client: Client;
    dateFrom?: string;
    dateTo?: string;
    invoices: Invoice[];
    receipts: Receipt[];
}

type LedgerEntry = {
    date: string;
    document: string;
    description: string;
    debit: number;
    credit: number;
};

export function ClientStatementDocument({
    ref,
    company,
    client,
    dateFrom,
    dateTo,
    invoices,
    receipts,
}: ClientStatementDocumentProps) {
    const entries: LedgerEntry[] = [
        ...invoices
            .filter((i) => i.status !== 'CANCELLED')
            .map((i) => ({
                date: i.date,
                document: i.number,
                description: 'Fatura',
                debit: i.total,
                credit: 0,
            })),
        ...receipts
            .filter((r) => !r.voided)
            .map((r) => ({
                date: r.date,
                document: r.number,
                description: 'Recibo',
                debit: 0,
                credit: r.amount,
            })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
    const saldo = totalDebit - totalCredit;

    let running = 0;
    const ledger = entries.map((entry) => {
        running += entry.debit - entry.credit;
        return { ...entry, balance: running };
    });

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
                    <p className="text-xs text-neutral-500">Débito (faturado)</p>
                    <p className="mt-1 font-mono text-base font-bold">{formatCurrency(totalDebit)}</p>
                </div>
                <div className="rounded-md border border-neutral-200 p-3">
                    <p className="text-xs text-neutral-500">Crédito (recebido)</p>
                    <p className="mt-1 font-mono text-base font-bold text-emerald-700">
                        {formatCurrency(totalCredit)}
                    </p>
                </div>
                <div className="rounded-md border border-neutral-200 p-3">
                    <p className="text-xs text-neutral-500">Saldo</p>
                    <p className="mt-1 font-mono text-base font-bold text-amber-700">{formatCurrency(saldo)}</p>
                </div>
            </section>

            <section className="mt-6">
                <table className="w-full border-collapse border border-neutral-900 text-xs">
                    <thead>
                        <tr className="bg-neutral-100">
                            <th className="border-b border-neutral-900 px-2 py-2 text-left font-bold">Data</th>
                            <th className="border-b border-neutral-900 px-2 py-2 text-left font-bold">Documento</th>
                            <th className="border-b border-neutral-900 px-2 py-2 text-right font-bold">Débito</th>
                            <th className="border-b border-neutral-900 px-2 py-2 text-right font-bold">Crédito</th>
                            <th className="border-b border-neutral-900 px-2 py-2 text-right font-bold">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ledger.map((entry, index) => (
                            <tr key={`${entry.document}-${index}`} className="border-b border-neutral-200">
                                <td className="px-2 py-2">{formatDate(entry.date)}</td>
                                <td className="px-2 py-2">
                                    {entry.description} {entry.document}
                                </td>
                                <td className="px-2 py-2 text-right font-mono">
                                    {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                                </td>
                                <td className="px-2 py-2 text-right font-mono">
                                    {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                                </td>
                                <td className="px-2 py-2 text-right font-mono">{formatCurrency(entry.balance)}</td>
                            </tr>
                        ))}
                        {ledger.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-2 py-3 text-center text-neutral-500">
                                    Sem movimentos neste período.
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

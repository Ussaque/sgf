import type { InvoiceItem } from '@/types';

export function computeTotals(items: InvoiceItem[]) {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const tax_total = items.reduce(
        (sum, item) => sum + item.quantity * item.unit_price * (item.tax_rate / 100),
        0
    );
    const total = subtotal + tax_total;

    return { subtotal, tax_total, total };
}

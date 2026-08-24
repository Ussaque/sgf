import type { InvoiceStatus, QuotationStatus } from '@/types';

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
    DRAFT: 'Rascunho',
    SENT: 'Enviada',
    PAID: 'Paga',
    OVERDUE: 'Atrasada',
    CANCELLED: 'Cancelada',
};

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
    DRAFT: 'Rascunho',
    SENT: 'Enviada',
    ACCEPTED: 'Aceite',
    REJECTED: 'Rejeitada',
    EXPIRED: 'Expirada',
};

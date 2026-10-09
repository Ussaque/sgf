import type { InvoiceStatus, QuotationStatus, DeliveryNoteStatus } from '@/types';

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
    DRAFT: 'Rascunho',
    SENT: 'Enviada',
    PARTIALLY_PAID: 'Parcialmente paga',
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

export const DELIVERY_NOTE_STATUS_LABELS: Record<DeliveryNoteStatus, string> = {
    DRAFT: 'Rascunho',
    SENT: 'Enviada',
    DELIVERED: 'Entregue',
    CANCELLED: 'Cancelada',
};

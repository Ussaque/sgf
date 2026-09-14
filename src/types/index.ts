export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'VIEWER';

export interface Organization {
    id: string;
    name: string;
    plan: 'FREE' | 'PRO' | 'ENTERPRISE';
}

export interface BankAccount {
    id: string;
    bank_name: string;
    account_holder?: string;
    account_number: string;
    nib?: string;
    iban?: string;
    swift_code?: string;
    currency: string; // e.g. MZN, USD, ZAR, EUR
}

export interface Company {
    id: string;
    organization_id: string;
    name: string;
    nuit: string;
    address: string;
    email: string;
    phone?: string;
    logo_url?: string;
    brand_color?: string; // Hex color used to theme printed documents
    color_theme?: string | null; // App UI color theme id, see lib/color-themes.ts (absent/null = default)
    default_tax_rate?: number; // Default IVA % for new invoice/quotation lines
    default_due_days?: number; // Default days until due for invoices/quotations
    bank_accounts?: BankAccount[];
    mpesa_number?: string;
    emola_number?: string;
    payment_notes?: string; // Free-form extra payment instructions
    current_invoice_sequence: number;
    current_receipt_sequence: number;
    current_quotation_sequence: number;
}

export interface User {
    id: string;
    organization_id: string;
    name: string;
    email: string;
    role: Role;
    allowed_company_ids: string[]; // If empty and role is SUPER_ADMIN, access all.
}

export interface Product {
    id: string;
    company_id: string;
    name: string;
    description?: string;
    unit: string; // e.g. "Turno 24h", "Turno 12h", "Hora", "Unidade"
    unit_price: number;
    tax_rate?: number; // Overrides the company default when set
}

export interface Client {
    id: string;
    company_id: string;
    name: string;
    nuit: string;
    address: string;
    email: string;
    phone?: string;
}

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number; // Percentage, e.g., 16 for 16%
    total: number;
}

export interface Invoice {
    id: string;
    company_id: string;
    client_id: string;
    number: string; // e.g., INV-2024-001
    date: string; // ISO Date string
    due_date: string; // ISO Date string
    status: InvoiceStatus;
    items: InvoiceItem[];
    subtotal: number;
    tax_total: number;
    total: number;
    notes?: string;
    reference?: string; // e.g. "Referente ao contrato nº 05/AdRMM-DC/S/2026"
    created_by?: string; // Name of the user who issued the document
    created_at: string;
    updated_at: string;
}

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface Quotation {
    id: string;
    company_id: string;
    client_id: string;
    number: string; // e.g., COT-2024-001
    date: string; // ISO Date string
    valid_until: string; // ISO Date string
    status: QuotationStatus;
    items: InvoiceItem[];
    subtotal: number;
    tax_total: number;
    total: number;
    notes?: string;
    reference?: string;
    created_by?: string;
    converted_invoice_id?: string;
    created_at: string;
    updated_at: string;
}

export interface Receipt {
    id: string;
    company_id: string;
    invoice_id: string;
    number: string; // e.g., REC-2024-001
    date: string;
    amount: number;
    method: 'CASH' | 'BANK_TRANSFER' | 'CHECK' | 'POS' | 'MOBILE_MONEY';
    reference?: string;
    voided?: boolean;
    created_at: string;
}

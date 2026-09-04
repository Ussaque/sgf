// Row-shaping helpers: MySQL/mysql2 gives back Date objects, 0/1 tinyints and
// nulls; the frontend (src/types/index.ts) expects ISO date strings, real
// booleans, and `undefined` (not null) for absent optional fields.

const iso = (d: Date) => d.toISOString();
const opt = <T>(v: T | null) => v ?? undefined;

export function mapBankAccount(a: any) {
    return {
        id: a.id,
        bank_name: a.bank_name,
        account_holder: opt(a.account_holder),
        account_number: a.account_number,
        nib: opt(a.nib),
        iban: opt(a.iban),
        swift_code: opt(a.swift_code),
        currency: a.currency,
    };
}

export function mapCompany(c: any, bankAccounts: any[] = []) {
    return {
        id: c.id,
        organization_id: c.organization_id,
        name: c.name,
        nuit: c.nuit,
        address: c.address,
        email: c.email,
        phone: opt(c.phone),
        logo_url: opt(c.logo_url),
        brand_color: opt(c.brand_color),
        default_tax_rate: opt(c.default_tax_rate),
        default_due_days: opt(c.default_due_days),
        bank_accounts: bankAccounts.map(mapBankAccount),
        mpesa_number: opt(c.mpesa_number),
        emola_number: opt(c.emola_number),
        payment_notes: opt(c.payment_notes),
        current_invoice_sequence: c.current_invoice_sequence,
        current_receipt_sequence: c.current_receipt_sequence,
        current_quotation_sequence: c.current_quotation_sequence,
    };
}

export function mapUser(u: any, allowedCompanyIds: string[] = []) {
    return {
        id: u.id,
        organization_id: u.organization_id,
        name: u.name,
        email: u.email,
        role: u.role,
        allowed_company_ids: allowedCompanyIds,
    };
}

export function mapClient(c: any) {
    return {
        id: c.id,
        company_id: c.company_id,
        name: c.name,
        nuit: c.nuit,
        address: c.address,
        email: c.email,
        phone: opt(c.phone),
    };
}

export function mapProduct(p: any) {
    return {
        id: p.id,
        company_id: p.company_id,
        name: p.name,
        description: opt(p.description),
        unit: p.unit,
        unit_price: p.unit_price,
        tax_rate: opt(p.tax_rate),
    };
}

export function mapItem(i: any) {
    return {
        id: i.id,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        tax_rate: i.tax_rate,
        total: i.total,
    };
}

export function mapInvoice(inv: any, items: any[] = []) {
    return {
        id: inv.id,
        company_id: inv.company_id,
        client_id: inv.client_id,
        number: inv.number,
        date: iso(inv.date),
        due_date: iso(inv.due_date),
        status: inv.status,
        items: items.map(mapItem),
        subtotal: inv.subtotal,
        tax_total: inv.tax_total,
        total: inv.total,
        notes: opt(inv.notes),
        reference: opt(inv.reference),
        created_by: opt(inv.created_by),
        created_at: iso(inv.created_at),
        updated_at: iso(inv.updated_at),
    };
}

export function mapQuotation(q: any, items: any[] = []) {
    return {
        id: q.id,
        company_id: q.company_id,
        client_id: q.client_id,
        number: q.number,
        date: iso(q.date),
        valid_until: iso(q.valid_until),
        status: q.status,
        items: items.map(mapItem),
        subtotal: q.subtotal,
        tax_total: q.tax_total,
        total: q.total,
        notes: opt(q.notes),
        reference: opt(q.reference),
        created_by: opt(q.created_by),
        converted_invoice_id: opt(q.converted_invoice_id),
        created_at: iso(q.created_at),
        updated_at: iso(q.updated_at),
    };
}

export function mapReceipt(r: any) {
    return {
        id: r.id,
        company_id: r.company_id,
        invoice_id: r.invoice_id,
        number: r.number,
        date: iso(r.date),
        amount: r.amount,
        method: r.method,
        reference: opt(r.reference),
        voided: Boolean(r.voided),
        created_at: iso(r.created_at),
    };
}

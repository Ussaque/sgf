// Maps Prisma's camelCase rows to the snake_case shape the frontend already
// expects (matching src/types/index.ts), so the React app needs no changes
// beyond swapping its data source.

export function mapBankAccount(a: any) {
    return {
        id: a.id,
        bank_name: a.bankName,
        account_holder: a.accountHolder ?? undefined,
        account_number: a.accountNumber,
        nib: a.nib ?? undefined,
        iban: a.iban ?? undefined,
        swift_code: a.swiftCode ?? undefined,
        currency: a.currency,
    };
}

export function mapCompany(c: any) {
    return {
        id: c.id,
        organization_id: c.organizationId,
        name: c.name,
        nuit: c.nuit,
        address: c.address,
        email: c.email,
        phone: c.phone ?? undefined,
        logo_url: c.logoUrl ?? undefined,
        brand_color: c.brandColor ?? undefined,
        default_tax_rate: c.defaultTaxRate ?? undefined,
        default_due_days: c.defaultDueDays ?? undefined,
        bank_accounts: (c.bankAccounts ?? []).map(mapBankAccount),
        mpesa_number: c.mpesaNumber ?? undefined,
        emola_number: c.emolaNumber ?? undefined,
        payment_notes: c.paymentNotes ?? undefined,
        current_invoice_sequence: c.currentInvoiceSequence,
        current_receipt_sequence: c.currentReceiptSequence,
        current_quotation_sequence: c.currentQuotationSequence,
    };
}

export function mapUser(u: any) {
    return {
        id: u.id,
        organization_id: u.organizationId,
        name: u.name,
        email: u.email,
        role: u.role,
        allowed_company_ids: (u.allowedCompanies ?? []).map((a: any) => a.companyId),
    };
}

export function mapClient(c: any) {
    return {
        id: c.id,
        company_id: c.companyId,
        name: c.name,
        nuit: c.nuit,
        address: c.address,
        email: c.email,
        phone: c.phone ?? undefined,
    };
}

export function mapProduct(p: any) {
    return {
        id: p.id,
        company_id: p.companyId,
        name: p.name,
        description: p.description ?? undefined,
        unit: p.unit,
        unit_price: p.unitPrice,
        tax_rate: p.taxRate ?? undefined,
    };
}

export function mapItem(i: any) {
    return {
        id: i.id,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        tax_rate: i.taxRate,
        total: i.total,
    };
}

export function mapInvoice(inv: any) {
    return {
        id: inv.id,
        company_id: inv.companyId,
        client_id: inv.clientId,
        number: inv.number,
        date: inv.date.toISOString(),
        due_date: inv.dueDate.toISOString(),
        status: inv.status,
        items: (inv.items ?? []).map(mapItem),
        subtotal: inv.subtotal,
        tax_total: inv.taxTotal,
        total: inv.total,
        notes: inv.notes ?? undefined,
        reference: inv.reference ?? undefined,
        created_by: inv.createdBy ?? undefined,
        created_at: inv.createdAt.toISOString(),
        updated_at: inv.updatedAt.toISOString(),
    };
}

export function mapQuotation(q: any) {
    return {
        id: q.id,
        company_id: q.companyId,
        client_id: q.clientId,
        number: q.number,
        date: q.date.toISOString(),
        valid_until: q.validUntil.toISOString(),
        status: q.status,
        items: (q.items ?? []).map(mapItem),
        subtotal: q.subtotal,
        tax_total: q.taxTotal,
        total: q.total,
        notes: q.notes ?? undefined,
        reference: q.reference ?? undefined,
        created_by: q.createdBy ?? undefined,
        converted_invoice_id: q.convertedInvoiceId ?? undefined,
        created_at: q.createdAt.toISOString(),
        updated_at: q.updatedAt.toISOString(),
    };
}

export function mapReceipt(r: any) {
    return {
        id: r.id,
        company_id: r.companyId,
        invoice_id: r.invoiceId,
        number: r.number,
        date: r.date.toISOString(),
        amount: r.amount,
        method: r.method,
        reference: r.reference ?? undefined,
        voided: r.voided,
        created_at: r.createdAt.toISOString(),
    };
}

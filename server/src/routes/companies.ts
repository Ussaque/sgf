import crypto from 'node:crypto';
import { Router } from 'express';
import { pool, withTransaction } from '../db';
import { requireAuth, requireRole, canAccessCompany } from '../middleware/auth';
import { mapCompany } from '../rows';
import { generateDocumentNumber } from '../documentNumber';

const SEQUENCE_CHECKS = [
    { field: 'current_invoice_sequence', prefixField: 'invoice_prefix', table: 'invoices', label: 'fatura' },
    { field: 'current_quotation_sequence', prefixField: 'quotation_prefix', table: 'quotations', label: 'cotação' },
    { field: 'current_receipt_sequence', prefixField: 'receipt_prefix', table: 'receipts', label: 'recibo' },
] as const;

export const companiesRouter = Router();

companiesRouter.use(requireAuth);

async function loadCompany(id: string) {
    const [rows] = await pool.query<any[]>('SELECT * FROM companies WHERE id = ?', [id]);
    if (!rows[0]) return undefined;
    const [bankAccounts] = await pool.query<any[]>(
        'SELECT * FROM bank_accounts WHERE company_id = ?',
        [id]
    );
    return mapCompany(rows[0], bankAccounts);
}

companiesRouter.get('/', async (req, res) => {
    const user = req.user!;
    const [rows] =
        user.role === 'SUPER_ADMIN'
            ? await pool.query<any[]>('SELECT * FROM companies WHERE organization_id = ?', [
                  user.organizationId,
              ])
            : user.allowedCompanyIds.length > 0
              ? await pool.query<any[]>(
                    `SELECT * FROM companies WHERE id IN (${user.allowedCompanyIds.map(() => '?').join(',')})`,
                    user.allowedCompanyIds
                )
              : [[]];

    const companies = await Promise.all(
        rows.map(async (c) => {
            const [bankAccounts] = await pool.query<any[]>(
                'SELECT * FROM bank_accounts WHERE company_id = ?',
                [c.id]
            );
            return mapCompany(c, bankAccounts);
        })
    );
    res.json(companies);
});

companiesRouter.get('/:id', async (req, res) => {
    if (!canAccessCompany(req.user!, req.params.id)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }
    const company = await loadCompany(req.params.id);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });
    res.json(company);
});

companiesRouter.post('/', requireRole('SUPER_ADMIN'), async (req, res) => {
    const b = req.body;
    const id = crypto.randomUUID();
    await pool.query(
        `INSERT INTO companies (id, organization_id, name, nuit, address, email, phone, logo_url, brand_color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            req.user!.organizationId,
            b.name,
            b.nuit,
            b.address,
            b.email,
            b.phone ?? null,
            b.logo_url ?? null,
            b.brand_color ?? null,
        ]
    );
    res.status(201).json(await loadCompany(id));
});

companiesRouter.patch('/:id', requireRole('ADMIN'), async (req, res) => {
    if (!canAccessCompany(req.user!, req.params.id)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }
    const b = req.body;
    const id = req.params.id;

    const [existingRows] = await pool.query<any[]>('SELECT * FROM companies WHERE id = ?', [id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: 'Empresa não encontrada' });

    for (const check of SEQUENCE_CHECKS) {
        if (b[check.field] !== undefined) {
            const prefix = b[check.prefixField] ?? existing[check.prefixField];
            const number = generateDocumentNumber(prefix, b[check.field]);
            const [dupRows] = await pool.query<any[]>(
                `SELECT id FROM ${check.table} WHERE company_id = ? AND number = ?`,
                [id, number]
            );
            if (dupRows.length > 0) {
                return res.status(400).json({
                    error: `Já existe uma ${check.label} com o número ${number}. Escolhe um número diferente.`,
                });
            }
        }
    }

    const fieldMap: Record<string, string> = {
        name: 'name',
        nuit: 'nuit',
        address: 'address',
        email: 'email',
        phone: 'phone',
        logo_url: 'logo_url',
        brand_color: 'brand_color',
        color_theme: 'color_theme',
        default_tax_rate: 'default_tax_rate',
        default_due_days: 'default_due_days',
        default_currency: 'default_currency',
        invoice_prefix: 'invoice_prefix',
        quotation_prefix: 'quotation_prefix',
        receipt_prefix: 'receipt_prefix',
        mpesa_number: 'mpesa_number',
        emola_number: 'emola_number',
        payment_notes: 'payment_notes',
        current_invoice_sequence: 'current_invoice_sequence',
        current_receipt_sequence: 'current_receipt_sequence',
        current_quotation_sequence: 'current_quotation_sequence',
    };

    const sets: string[] = [];
    const values: unknown[] = [];
    for (const [bodyKey, column] of Object.entries(fieldMap)) {
        if (b[bodyKey] !== undefined) {
            sets.push(`${column} = ?`);
            values.push(b[bodyKey] ?? null);
        }
    }

    await withTransaction(async (conn) => {
        if (sets.length > 0) {
            await conn.query(`UPDATE companies SET ${sets.join(', ')} WHERE id = ?`, [...values, id]);
        }

        if (b.bank_accounts !== undefined) {
            await conn.query('DELETE FROM bank_accounts WHERE company_id = ?', [id]);
            for (const a of b.bank_accounts ?? []) {
                await conn.query(
                    `INSERT INTO bank_accounts (id, company_id, bank_name, account_holder, account_number, nib, iban, swift_code, currency)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        crypto.randomUUID(),
                        id,
                        a.bank_name,
                        a.account_holder ?? null,
                        a.account_number,
                        a.nib ?? null,
                        a.iban ?? null,
                        a.swift_code ?? null,
                        a.currency ?? 'MZN',
                    ]
                );
            }
        }
    });

    res.json(await loadCompany(id));
});

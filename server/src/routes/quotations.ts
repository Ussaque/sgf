import crypto from 'node:crypto';
import { Router } from 'express';
import { pool, withTransaction } from '../db';
import { requireAuth, requireRole, canAccessCompany } from '../middleware/auth';
import { mapInvoice, mapQuotation } from '../rows';
import { generateDocumentNumber } from '../documentNumber';

export const quotationsRouter = Router();

quotationsRouter.use(requireAuth);

async function loadQuotation(id: string) {
    const [rows] = await pool.query<any[]>('SELECT * FROM quotations WHERE id = ?', [id]);
    if (!rows[0]) return undefined;
    const [items] = await pool.query<any[]>('SELECT * FROM quotation_items WHERE quotation_id = ?', [id]);
    return mapQuotation(rows[0], items);
}

quotationsRouter.get('/', async (req, res) => {
    const companyId = req.query.companyId as string;
    if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório' });
    if (!canAccessCompany(req.user!, companyId)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }
    const [rows] = await pool.query<any[]>('SELECT * FROM quotations WHERE company_id = ?', [companyId]);
    const quotations = await Promise.all(
        rows.map(async (q) => {
            const [items] = await pool.query<any[]>('SELECT * FROM quotation_items WHERE quotation_id = ?', [
                q.id,
            ]);
            return mapQuotation(q, items);
        })
    );
    res.json(quotations);
});

quotationsRouter.get('/:id', async (req, res) => {
    const [rows] = await pool.query<any[]>('SELECT * FROM quotations WHERE id = ?', [req.params.id]);
    const quotation = rows[0];
    if (!quotation || !canAccessCompany(req.user!, quotation.company_id)) {
        return res.status(404).json({ error: 'Cotação não encontrada' });
    }
    res.json(await loadQuotation(req.params.id));
});

quotationsRouter.post('/', requireRole('USER'), async (req, res) => {
    const b = req.body;
    if (!canAccessCompany(req.user!, b.company_id)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }

    const id = await withTransaction(async (conn) => {
        const [companyRows] = await conn.query<any[]>(
            'SELECT current_quotation_sequence, quotation_prefix FROM companies WHERE id = ? FOR UPDATE',
            [b.company_id]
        );
        const company = companyRows[0];
        if (!company) throw new Error('Empresa não encontrada');
        const number = generateDocumentNumber(company.quotation_prefix, company.current_quotation_sequence);
        const quotationId = crypto.randomUUID();

        await conn.query(
            `INSERT INTO quotations (id, company_id, client_id, number, date, valid_until, status, subtotal, tax_total, total, notes, reference, created_by)
             VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?)`,
            [
                quotationId,
                b.company_id,
                b.client_id,
                number,
                new Date(b.date),
                new Date(b.valid_until),
                b.subtotal,
                b.tax_total,
                b.total,
                b.notes ?? null,
                b.reference ?? null,
                b.created_by ?? null,
            ]
        );

        for (const item of b.items) {
            await conn.query(
                `INSERT INTO quotation_items (id, quotation_id, description, quantity, unit_price, tax_rate, total)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    crypto.randomUUID(),
                    quotationId,
                    item.description,
                    item.quantity,
                    item.unit_price,
                    item.tax_rate,
                    item.total,
                ]
            );
        }

        await conn.query(
            'UPDATE companies SET current_quotation_sequence = current_quotation_sequence + 1 WHERE id = ?',
            [b.company_id]
        );

        return quotationId;
    });

    res.status(201).json(await loadQuotation(id));
});

quotationsRouter.patch('/:id', requireRole('USER'), async (req, res) => {
    const [existingRows] = await pool.query<any[]>('SELECT * FROM quotations WHERE id = ?', [req.params.id]);
    const existing = existingRows[0];
    if (!existing || !canAccessCompany(req.user!, existing.company_id)) {
        return res.status(404).json({ error: 'Cotação não encontrada' });
    }
    if (existing.converted_invoice_id) {
        return res.status(409).json({ error: 'Não é possível editar uma cotação já convertida em fatura' });
    }
    const b = req.body;

    await withTransaction(async (conn) => {
        const sets: string[] = [];
        const values: unknown[] = [];
        const fieldMap: Record<string, [string, (v: any) => unknown]> = {
            client_id: ['client_id', (v) => v],
            valid_until: ['valid_until', (v) => new Date(v)],
            subtotal: ['subtotal', (v) => v],
            tax_total: ['tax_total', (v) => v],
            total: ['total', (v) => v],
            notes: ['notes', (v) => v ?? null],
            reference: ['reference', (v) => v ?? null],
        };
        for (const [bodyKey, [column, transform]] of Object.entries(fieldMap)) {
            if (b[bodyKey] !== undefined) {
                sets.push(`${column} = ?`);
                values.push(transform(b[bodyKey]));
            }
        }
        if (sets.length > 0) {
            await conn.query(`UPDATE quotations SET ${sets.join(', ')} WHERE id = ?`, [
                ...values,
                req.params.id,
            ]);
        }

        if (b.items) {
            await conn.query('DELETE FROM quotation_items WHERE quotation_id = ?', [req.params.id]);
            for (const item of b.items) {
                await conn.query(
                    `INSERT INTO quotation_items (id, quotation_id, description, quantity, unit_price, tax_rate, total)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        crypto.randomUUID(),
                        req.params.id,
                        item.description,
                        item.quantity,
                        item.unit_price,
                        item.tax_rate,
                        item.total,
                    ]
                );
            }
        }
    });

    res.json(await loadQuotation(req.params.id));
});

quotationsRouter.delete('/:id', requireRole('USER'), async (req, res) => {
    const [existingRows] = await pool.query<any[]>('SELECT * FROM quotations WHERE id = ?', [req.params.id]);
    const existing = existingRows[0];
    if (!existing || !canAccessCompany(req.user!, existing.company_id)) {
        return res.status(404).json({ error: 'Cotação não encontrada' });
    }
    if (existing.converted_invoice_id) {
        return res.status(409).json({ error: 'Não é possível eliminar uma cotação já convertida em fatura' });
    }
    await pool.query('DELETE FROM quotations WHERE id = ?', [req.params.id]);
    res.status(204).end();
});

quotationsRouter.post('/:id/convert', requireRole('USER'), async (req, res) => {
    const [rows] = await pool.query<any[]>('SELECT * FROM quotations WHERE id = ?', [req.params.id]);
    const quotation = rows[0];
    if (!quotation || !canAccessCompany(req.user!, quotation.company_id)) {
        return res.status(404).json({ error: 'Cotação não encontrada' });
    }
    if (quotation.converted_invoice_id) {
        return res.status(409).json({ error: 'Cotação já foi convertida em fatura' });
    }
    const [items] = await pool.query<any[]>('SELECT * FROM quotation_items WHERE quotation_id = ?', [
        req.params.id,
    ]);

    const invoiceId = await withTransaction(async (conn) => {
        const [companyRows] = await conn.query<any[]>(
            'SELECT current_invoice_sequence, invoice_prefix FROM companies WHERE id = ? FOR UPDATE',
            [quotation.company_id]
        );
        const company = companyRows[0];
        const number = generateDocumentNumber(company.invoice_prefix, company.current_invoice_sequence);
        const now = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        const newInvoiceId = crypto.randomUUID();

        await conn.query(
            `INSERT INTO invoices (id, company_id, client_id, number, date, due_date, status, subtotal, tax_total, total, notes)
             VALUES (?, ?, ?, ?, ?, ?, 'SENT', ?, ?, ?, ?)`,
            [
                newInvoiceId,
                quotation.company_id,
                quotation.client_id,
                number,
                now,
                dueDate,
                quotation.subtotal,
                quotation.tax_total,
                quotation.total,
                quotation.notes,
            ]
        );

        for (const item of items) {
            await conn.query(
                `INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, tax_rate, total)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [crypto.randomUUID(), newInvoiceId, item.description, item.quantity, item.unit_price, item.tax_rate, item.total]
            );
        }

        await conn.query('UPDATE companies SET current_invoice_sequence = current_invoice_sequence + 1 WHERE id = ?', [
            quotation.company_id,
        ]);

        await conn.query(
            "UPDATE quotations SET converted_invoice_id = ?, status = 'ACCEPTED' WHERE id = ?",
            [newInvoiceId, req.params.id]
        );

        return newInvoiceId;
    });

    const [invoiceRows] = await pool.query<any[]>('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    const [invoiceItems] = await pool.query<any[]>('SELECT * FROM invoice_items WHERE invoice_id = ?', [
        invoiceId,
    ]);
    res.status(201).json(mapInvoice(invoiceRows[0], invoiceItems));
});

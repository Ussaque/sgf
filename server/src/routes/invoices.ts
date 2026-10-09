import crypto from 'node:crypto';
import { Router } from 'express';
import { pool, withTransaction } from '../db';
import { requireAuth, requireRole, canAccessCompany } from '../middleware/auth';
import { mapInvoice } from '../rows';
import { generateDocumentNumber } from '../documentNumber';

export const invoicesRouter = Router();

invoicesRouter.use(requireAuth);

async function loadInvoice(id: string) {
    const [rows] = await pool.query<any[]>('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!rows[0]) return undefined;
    const [items] = await pool.query<any[]>('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);
    return mapInvoice(rows[0], items);
}

invoicesRouter.get('/', async (req, res) => {
    const companyId = req.query.companyId as string;
    if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório' });
    if (!canAccessCompany(req.user!, companyId)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }
    const [rows] = await pool.query<any[]>('SELECT * FROM invoices WHERE company_id = ?', [companyId]);
    const invoices = await Promise.all(
        rows.map(async (inv) => {
            const [items] = await pool.query<any[]>('SELECT * FROM invoice_items WHERE invoice_id = ?', [
                inv.id,
            ]);
            return mapInvoice(inv, items);
        })
    );
    res.json(invoices);
});

invoicesRouter.get('/:id', async (req, res) => {
    const [rows] = await pool.query<any[]>('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    const invoice = rows[0];
    if (!invoice || !canAccessCompany(req.user!, invoice.company_id)) {
        return res.status(404).json({ error: 'Fatura não encontrada' });
    }
    res.json(await loadInvoice(req.params.id));
});

invoicesRouter.post('/', requireRole('USER'), async (req, res) => {
    const b = req.body;
    if (!canAccessCompany(req.user!, b.company_id)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }

    const id = await withTransaction(async (conn) => {
        const [companyRows] = await conn.query<any[]>(
            'SELECT current_invoice_sequence, invoice_prefix FROM companies WHERE id = ? FOR UPDATE',
            [b.company_id]
        );
        const company = companyRows[0];
        if (!company) throw new Error('Empresa não encontrada');
        const number = generateDocumentNumber(company.invoice_prefix, company.current_invoice_sequence);
        const invoiceId = crypto.randomUUID();

        await conn.query(
            `INSERT INTO invoices (id, company_id, client_id, number, date, due_date, status, subtotal, tax_total, total, notes, reference, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                invoiceId,
                b.company_id,
                b.client_id,
                number,
                new Date(b.date),
                new Date(b.due_date),
                b.status ?? 'SENT',
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
                `INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, tax_rate, total)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [crypto.randomUUID(), invoiceId, item.description, item.quantity, item.unit_price, item.tax_rate, item.total]
            );
        }

        await conn.query('UPDATE companies SET current_invoice_sequence = current_invoice_sequence + 1 WHERE id = ?', [
            b.company_id,
        ]);

        return invoiceId;
    });

    res.status(201).json(await loadInvoice(id));
});

invoicesRouter.patch('/:id', requireRole('USER'), async (req, res) => {
    const [existingRows] = await pool.query<any[]>('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    const existing = existingRows[0];
    if (!existing || !canAccessCompany(req.user!, existing.company_id)) {
        return res.status(404).json({ error: 'Fatura não encontrada' });
    }
    const b = req.body;

    await withTransaction(async (conn) => {
        const sets: string[] = [];
        const values: unknown[] = [];
        const fieldMap: Record<string, [string, (v: any) => unknown]> = {
            client_id: ['client_id', (v) => v],
            due_date: ['due_date', (v) => new Date(v)],
            status: ['status', (v) => v],
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
            await conn.query(`UPDATE invoices SET ${sets.join(', ')} WHERE id = ?`, [...values, req.params.id]);
        }

        if (b.items) {
            await conn.query('DELETE FROM invoice_items WHERE invoice_id = ?', [req.params.id]);
            for (const item of b.items) {
                await conn.query(
                    `INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, tax_rate, total)
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

    res.json(await loadInvoice(req.params.id));
});

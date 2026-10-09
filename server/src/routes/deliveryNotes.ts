import crypto from 'node:crypto';
import { Router } from 'express';
import { pool, withTransaction } from '../db';
import { requireAuth, requireRole, canAccessCompany } from '../middleware/auth';
import { mapDeliveryNote, mapInvoice } from '../rows';
import { generateDocumentNumber } from '../documentNumber';

export const deliveryNotesRouter = Router();

deliveryNotesRouter.use(requireAuth);

async function loadDeliveryNote(id: string) {
    const [rows] = await pool.query<any[]>('SELECT * FROM delivery_notes WHERE id = ?', [id]);
    if (!rows[0]) return undefined;
    const [items] = await pool.query<any[]>('SELECT * FROM delivery_note_items WHERE delivery_note_id = ?', [
        id,
    ]);
    return mapDeliveryNote(rows[0], items);
}

deliveryNotesRouter.get('/', async (req, res) => {
    const companyId = req.query.companyId as string;
    if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório' });
    if (!canAccessCompany(req.user!, companyId)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }
    const [rows] = await pool.query<any[]>('SELECT * FROM delivery_notes WHERE company_id = ?', [companyId]);
    const deliveryNotes = await Promise.all(
        rows.map(async (d) => {
            const [items] = await pool.query<any[]>(
                'SELECT * FROM delivery_note_items WHERE delivery_note_id = ?',
                [d.id]
            );
            return mapDeliveryNote(d, items);
        })
    );
    res.json(deliveryNotes);
});

deliveryNotesRouter.get('/:id', async (req, res) => {
    const [rows] = await pool.query<any[]>('SELECT * FROM delivery_notes WHERE id = ?', [req.params.id]);
    const deliveryNote = rows[0];
    if (!deliveryNote || !canAccessCompany(req.user!, deliveryNote.company_id)) {
        return res.status(404).json({ error: 'Guia de entrega não encontrada' });
    }
    res.json(await loadDeliveryNote(req.params.id));
});

deliveryNotesRouter.post('/', requireRole('USER'), async (req, res) => {
    const b = req.body;
    if (!canAccessCompany(req.user!, b.company_id)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }

    const id = await withTransaction(async (conn) => {
        const [companyRows] = await conn.query<any[]>(
            'SELECT current_delivery_note_sequence, delivery_note_prefix FROM companies WHERE id = ? FOR UPDATE',
            [b.company_id]
        );
        const company = companyRows[0];
        if (!company) throw new Error('Empresa não encontrada');
        const number = generateDocumentNumber(
            company.delivery_note_prefix,
            company.current_delivery_note_sequence
        );
        const deliveryNoteId = crypto.randomUUID();

        await conn.query(
            `INSERT INTO delivery_notes (id, company_id, client_id, number, date, status, subtotal, tax_total, total, notes, reference, received_by, created_by)
             VALUES (?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?)`,
            [
                deliveryNoteId,
                b.company_id,
                b.client_id,
                number,
                new Date(b.date),
                b.subtotal,
                b.tax_total,
                b.total,
                b.notes ?? null,
                b.reference ?? null,
                b.received_by ?? null,
                b.created_by ?? null,
            ]
        );

        for (const item of b.items) {
            await conn.query(
                `INSERT INTO delivery_note_items (id, delivery_note_id, description, quantity, unit_price, tax_rate, total)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    crypto.randomUUID(),
                    deliveryNoteId,
                    item.description,
                    item.quantity,
                    item.unit_price,
                    item.tax_rate,
                    item.total,
                ]
            );
        }

        await conn.query(
            'UPDATE companies SET current_delivery_note_sequence = current_delivery_note_sequence + 1 WHERE id = ?',
            [b.company_id]
        );

        return deliveryNoteId;
    });

    res.status(201).json(await loadDeliveryNote(id));
});

deliveryNotesRouter.patch('/:id', requireRole('USER'), async (req, res) => {
    const [existingRows] = await pool.query<any[]>('SELECT * FROM delivery_notes WHERE id = ?', [
        req.params.id,
    ]);
    const existing = existingRows[0];
    if (!existing || !canAccessCompany(req.user!, existing.company_id)) {
        return res.status(404).json({ error: 'Guia de entrega não encontrada' });
    }
    if (existing.converted_invoice_id) {
        return res.status(409).json({ error: 'Não é possível editar uma guia já convertida em fatura' });
    }
    const b = req.body;

    await withTransaction(async (conn) => {
        const sets: string[] = [];
        const values: unknown[] = [];
        const fieldMap: Record<string, [string, (v: any) => unknown]> = {
            client_id: ['client_id', (v) => v],
            status: ['status', (v) => v],
            subtotal: ['subtotal', (v) => v],
            tax_total: ['tax_total', (v) => v],
            total: ['total', (v) => v],
            notes: ['notes', (v) => v ?? null],
            reference: ['reference', (v) => v ?? null],
            received_by: ['received_by', (v) => v ?? null],
        };
        for (const [bodyKey, [column, transform]] of Object.entries(fieldMap)) {
            if (b[bodyKey] !== undefined) {
                sets.push(`${column} = ?`);
                values.push(transform(b[bodyKey]));
            }
        }
        if (sets.length > 0) {
            await conn.query(`UPDATE delivery_notes SET ${sets.join(', ')} WHERE id = ?`, [
                ...values,
                req.params.id,
            ]);
        }

        if (b.items) {
            await conn.query('DELETE FROM delivery_note_items WHERE delivery_note_id = ?', [req.params.id]);
            for (const item of b.items) {
                await conn.query(
                    `INSERT INTO delivery_note_items (id, delivery_note_id, description, quantity, unit_price, tax_rate, total)
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

    res.json(await loadDeliveryNote(req.params.id));
});

deliveryNotesRouter.delete('/:id', requireRole('USER'), async (req, res) => {
    const [existingRows] = await pool.query<any[]>('SELECT * FROM delivery_notes WHERE id = ?', [
        req.params.id,
    ]);
    const existing = existingRows[0];
    if (!existing || !canAccessCompany(req.user!, existing.company_id)) {
        return res.status(404).json({ error: 'Guia de entrega não encontrada' });
    }
    if (existing.converted_invoice_id) {
        return res.status(409).json({ error: 'Não é possível eliminar uma guia já convertida em fatura' });
    }
    await pool.query('DELETE FROM delivery_notes WHERE id = ?', [req.params.id]);
    res.status(204).end();
});

deliveryNotesRouter.post('/:id/convert', requireRole('USER'), async (req, res) => {
    const [rows] = await pool.query<any[]>('SELECT * FROM delivery_notes WHERE id = ?', [req.params.id]);
    const deliveryNote = rows[0];
    if (!deliveryNote || !canAccessCompany(req.user!, deliveryNote.company_id)) {
        return res.status(404).json({ error: 'Guia de entrega não encontrada' });
    }
    if (deliveryNote.converted_invoice_id) {
        return res.status(409).json({ error: 'Guia já foi convertida em fatura' });
    }
    const [items] = await pool.query<any[]>('SELECT * FROM delivery_note_items WHERE delivery_note_id = ?', [
        req.params.id,
    ]);

    const invoiceId = await withTransaction(async (conn) => {
        const [companyRows] = await conn.query<any[]>(
            'SELECT current_invoice_sequence, invoice_prefix FROM companies WHERE id = ? FOR UPDATE',
            [deliveryNote.company_id]
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
                deliveryNote.company_id,
                deliveryNote.client_id,
                number,
                now,
                dueDate,
                deliveryNote.subtotal,
                deliveryNote.tax_total,
                deliveryNote.total,
                deliveryNote.notes,
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
            deliveryNote.company_id,
        ]);

        await conn.query(
            "UPDATE delivery_notes SET converted_invoice_id = ?, status = 'DELIVERED' WHERE id = ?",
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

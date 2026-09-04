import crypto from 'node:crypto';
import { Router } from 'express';
import { pool, withTransaction } from '../db';
import { requireAuth, requireRole, canAccessCompany } from '../middleware/auth';
import { mapReceipt } from '../rows';
import { generateDocumentNumber } from '../documentNumber';

export const receiptsRouter = Router();

receiptsRouter.use(requireAuth);

receiptsRouter.get('/', async (req, res) => {
    const companyId = req.query.companyId as string;
    if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório' });
    if (!canAccessCompany(req.user!, companyId)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }
    const [rows] = await pool.query<any[]>('SELECT * FROM receipts WHERE company_id = ?', [companyId]);
    res.json(rows.map(mapReceipt));
});

receiptsRouter.get('/:id', async (req, res) => {
    const [rows] = await pool.query<any[]>('SELECT * FROM receipts WHERE id = ?', [req.params.id]);
    const receipt = rows[0];
    if (!receipt || !canAccessCompany(req.user!, receipt.company_id)) {
        return res.status(404).json({ error: 'Recibo não encontrado' });
    }
    res.json(mapReceipt(receipt));
});

receiptsRouter.post('/', requireRole('USER'), async (req, res) => {
    const b = req.body;
    if (!canAccessCompany(req.user!, b.company_id)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }

    const id = await withTransaction(async (conn) => {
        const [companyRows] = await conn.query<any[]>(
            'SELECT current_receipt_sequence FROM companies WHERE id = ? FOR UPDATE',
            [b.company_id]
        );
        const company = companyRows[0];
        if (!company) throw new Error('Empresa não encontrada');
        const number = generateDocumentNumber('REC', company.current_receipt_sequence);
        const receiptId = crypto.randomUUID();

        await conn.query(
            `INSERT INTO receipts (id, company_id, invoice_id, number, date, amount, method, reference)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [receiptId, b.company_id, b.invoice_id, number, new Date(b.date), b.amount, b.method, b.reference ?? null]
        );

        await conn.query(
            'UPDATE companies SET current_receipt_sequence = current_receipt_sequence + 1 WHERE id = ?',
            [b.company_id]
        );

        await conn.query("UPDATE invoices SET status = 'PAID' WHERE id = ?", [b.invoice_id]);

        return receiptId;
    });

    const [rows] = await pool.query<any[]>('SELECT * FROM receipts WHERE id = ?', [id]);
    res.status(201).json(mapReceipt(rows[0]));
});

receiptsRouter.post('/:id/void', requireRole('USER'), async (req, res) => {
    const [rows] = await pool.query<any[]>('SELECT * FROM receipts WHERE id = ?', [req.params.id]);
    const receipt = rows[0];
    if (!receipt || !canAccessCompany(req.user!, receipt.company_id)) {
        return res.status(404).json({ error: 'Recibo não encontrado' });
    }
    if (receipt.voided) {
        return res.status(409).json({ error: 'Recibo já foi anulado' });
    }

    await withTransaction(async (conn) => {
        await conn.query('UPDATE receipts SET voided = 1 WHERE id = ?', [req.params.id]);

        const [invoiceRows] = await conn.query<any[]>('SELECT * FROM invoices WHERE id = ?', [
            receipt.invoice_id,
        ]);
        if (invoiceRows[0]?.status === 'PAID') {
            await conn.query("UPDATE invoices SET status = 'SENT' WHERE id = ?", [receipt.invoice_id]);
        }
    });

    const [updatedRows] = await pool.query<any[]>('SELECT * FROM receipts WHERE id = ?', [req.params.id]);
    res.json(mapReceipt(updatedRows[0]));
});

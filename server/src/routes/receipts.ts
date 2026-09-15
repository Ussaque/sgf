import crypto from 'node:crypto';
import { Router } from 'express';
import { pool, withTransaction, type Conn } from '../db';
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

const PAID_EPSILON = 0.01;

async function sumActiveReceipts(conn: Conn, invoiceId: string, excludeReceiptId?: string): Promise<number> {
    const [rows] = await conn.query<any[]>(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM receipts WHERE invoice_id = ? AND voided = 0${
            excludeReceiptId ? ' AND id != ?' : ''
        }`,
        excludeReceiptId ? [invoiceId, excludeReceiptId] : [invoiceId]
    );
    return Number(rows[0].total);
}

receiptsRouter.post('/', requireRole('USER'), async (req, res) => {
    const b = req.body;
    if (!canAccessCompany(req.user!, b.company_id)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }
    if (!b.amount || b.amount <= 0) {
        return res.status(400).json({ error: 'O valor do recibo deve ser maior que zero' });
    }

    const id = await withTransaction(async (conn) => {
        const [companyRows] = await conn.query<any[]>(
            'SELECT current_receipt_sequence, receipt_prefix FROM companies WHERE id = ? FOR UPDATE',
            [b.company_id]
        );
        const company = companyRows[0];
        if (!company) throw new Error('Empresa não encontrada');

        const [invoiceRows] = await conn.query<any[]>('SELECT * FROM invoices WHERE id = ? FOR UPDATE', [
            b.invoice_id,
        ]);
        const invoice = invoiceRows[0];
        if (!invoice) throw new Error('Fatura não encontrada');

        const number = generateDocumentNumber(company.receipt_prefix, company.current_receipt_sequence);
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

        const totalPaid = (await sumActiveReceipts(conn, b.invoice_id)) + b.amount;
        const overpaid = totalPaid - invoice.total;

        if (overpaid > PAID_EPSILON) {
            await conn.query('UPDATE invoices SET status = ? WHERE id = ?', ['PAID', b.invoice_id]);
            await conn.query('UPDATE clients SET credit_balance = credit_balance + ? WHERE id = ?', [
                overpaid,
                invoice.client_id,
            ]);
        } else if (totalPaid >= invoice.total - PAID_EPSILON) {
            await conn.query('UPDATE invoices SET status = ? WHERE id = ?', ['PAID', b.invoice_id]);
        } else {
            await conn.query('UPDATE invoices SET status = ? WHERE id = ?', ['PARTIALLY_PAID', b.invoice_id]);
        }

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

        const [invoiceRows] = await conn.query<any[]>('SELECT * FROM invoices WHERE id = ? FOR UPDATE', [
            receipt.invoice_id,
        ]);
        const invoice = invoiceRows[0];
        if (!invoice) return;

        const remaining = await sumActiveReceipts(conn, receipt.invoice_id, req.params.id);
        const status =
            remaining >= invoice.total - PAID_EPSILON
                ? 'PAID'
                : remaining > PAID_EPSILON
                  ? 'PARTIALLY_PAID'
                  : 'SENT';
        await conn.query('UPDATE invoices SET status = ? WHERE id = ?', [status, receipt.invoice_id]);
    });

    const [updatedRows] = await pool.query<any[]>('SELECT * FROM receipts WHERE id = ?', [req.params.id]);
    res.json(mapReceipt(updatedRows[0]));
});

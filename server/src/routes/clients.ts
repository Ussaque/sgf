import crypto from 'node:crypto';
import { Router } from 'express';
import { pool } from '../db';
import { requireAuth, requireRole, canAccessCompany } from '../middleware/auth';
import { mapClient } from '../rows';

export const clientsRouter = Router();

clientsRouter.use(requireAuth);

clientsRouter.get('/', async (req, res) => {
    const companyId = req.query.companyId as string;
    if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório' });
    if (!canAccessCompany(req.user!, companyId)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }
    const [rows] = await pool.query<any[]>('SELECT * FROM clients WHERE company_id = ?', [companyId]);
    res.json(rows.map(mapClient));
});

clientsRouter.get('/:id', async (req, res) => {
    const [rows] = await pool.query<any[]>('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    const client = rows[0];
    if (!client || !canAccessCompany(req.user!, client.company_id)) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    res.json(mapClient(client));
});

clientsRouter.post('/', requireRole('USER'), async (req, res) => {
    const b = req.body;
    if (!canAccessCompany(req.user!, b.company_id)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }
    const id = crypto.randomUUID();
    await pool.query(
        `INSERT INTO clients (id, company_id, name, nuit, address, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, b.company_id, b.name, b.nuit, b.address, b.email, b.phone ?? null]
    );
    const [rows] = await pool.query<any[]>('SELECT * FROM clients WHERE id = ?', [id]);
    res.status(201).json(mapClient(rows[0]));
});

clientsRouter.patch('/:id', requireRole('USER'), async (req, res) => {
    const [existingRows] = await pool.query<any[]>('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    const existing = existingRows[0];
    if (!existing || !canAccessCompany(req.user!, existing.company_id)) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    const b = req.body;
    await pool.query('UPDATE clients SET name = ?, nuit = ?, address = ?, email = ?, phone = ? WHERE id = ?', [
        b.name,
        b.nuit,
        b.address,
        b.email,
        b.phone ?? null,
        req.params.id,
    ]);
    const [rows] = await pool.query<any[]>('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    res.json(mapClient(rows[0]));
});

clientsRouter.delete('/:id', requireRole('USER'), async (req, res) => {
    const [existingRows] = await pool.query<any[]>('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    const existing = existingRows[0];
    if (!existing || !canAccessCompany(req.user!, existing.company_id)) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const [[{ count: invoiceCount }]] = await pool.query<any[]>(
        'SELECT COUNT(*) as count FROM invoices WHERE client_id = ?',
        [req.params.id]
    );
    const [[{ count: quotationCount }]] = await pool.query<any[]>(
        'SELECT COUNT(*) as count FROM quotations WHERE client_id = ?',
        [req.params.id]
    );
    if (invoiceCount > 0 || quotationCount > 0) {
        return res
            .status(409)
            .json({ error: 'Não é possível eliminar um cliente com faturas ou cotações associadas' });
    }

    await pool.query('DELETE FROM clients WHERE id = ?', [req.params.id]);
    res.status(204).end();
});

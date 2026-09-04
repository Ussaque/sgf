import crypto from 'node:crypto';
import { Router } from 'express';
import { pool } from '../db';
import { requireAuth, requireRole, canAccessCompany } from '../middleware/auth';
import { mapProduct } from '../rows';

export const productsRouter = Router();

productsRouter.use(requireAuth);

productsRouter.get('/', async (req, res) => {
    const companyId = req.query.companyId as string;
    if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório' });
    if (!canAccessCompany(req.user!, companyId)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }
    const [rows] = await pool.query<any[]>('SELECT * FROM products WHERE company_id = ?', [companyId]);
    res.json(rows.map(mapProduct));
});

productsRouter.post('/', requireRole('USER'), async (req, res) => {
    const b = req.body;
    if (!canAccessCompany(req.user!, b.company_id)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }
    const id = crypto.randomUUID();
    await pool.query(
        `INSERT INTO products (id, company_id, name, description, unit, unit_price, tax_rate)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, b.company_id, b.name, b.description ?? null, b.unit, b.unit_price, b.tax_rate ?? null]
    );
    const [rows] = await pool.query<any[]>('SELECT * FROM products WHERE id = ?', [id]);
    res.status(201).json(mapProduct(rows[0]));
});

productsRouter.patch('/:id', requireRole('USER'), async (req, res) => {
    const [existingRows] = await pool.query<any[]>('SELECT * FROM products WHERE id = ?', [req.params.id]);
    const existing = existingRows[0];
    if (!existing || !canAccessCompany(req.user!, existing.company_id)) {
        return res.status(404).json({ error: 'Produto não encontrado' });
    }
    const b = req.body;
    await pool.query(
        'UPDATE products SET name = ?, description = ?, unit = ?, unit_price = ?, tax_rate = ? WHERE id = ?',
        [b.name, b.description ?? null, b.unit, b.unit_price, b.tax_rate ?? null, req.params.id]
    );
    const [rows] = await pool.query<any[]>('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json(mapProduct(rows[0]));
});

productsRouter.delete('/:id', requireRole('USER'), async (req, res) => {
    const [existingRows] = await pool.query<any[]>('SELECT * FROM products WHERE id = ?', [req.params.id]);
    const existing = existingRows[0];
    if (!existing || !canAccessCompany(req.user!, existing.company_id)) {
        return res.status(404).json({ error: 'Produto não encontrado' });
    }
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.status(204).end();
});

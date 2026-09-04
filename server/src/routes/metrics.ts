import { Router } from 'express';
import { pool } from '../db';
import { requireAuth, canAccessCompany } from '../middleware/auth';

export const metricsRouter = Router();

metricsRouter.use(requireAuth);

metricsRouter.get('/', async (req, res) => {
    const companyId = req.query.companyId as string | undefined;
    if (companyId && !canAccessCompany(req.user!, companyId)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }

    const [rows] = companyId
        ? await pool.query<any[]>('SELECT status, total FROM invoices WHERE company_id = ?', [companyId])
        : await pool.query<any[]>('SELECT status, total FROM invoices');

    const totalRevenue = rows.filter((i) => i.status === 'PAID').reduce((sum, i) => sum + i.total, 0);
    const pendingAmount = rows
        .filter((i) => i.status === 'SENT' || i.status === 'OVERDUE')
        .reduce((sum, i) => sum + i.total, 0);

    res.json({ totalRevenue, pendingAmount, invoiceCount: rows.length });
});

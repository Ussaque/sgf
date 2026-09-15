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

    const query = `
        SELECT i.status, i.total,
               COALESCE(SUM(CASE WHEN r.voided = 0 THEN r.amount ELSE 0 END), 0) AS paid
        FROM invoices i
        LEFT JOIN receipts r ON r.invoice_id = i.id
        ${companyId ? 'WHERE i.company_id = ?' : ''}
        GROUP BY i.id
    `;
    const [rows] = companyId ? await pool.query<any[]>(query, [companyId]) : await pool.query<any[]>(query);

    const totalRevenue = rows.reduce((sum, i) => sum + Number(i.paid), 0);
    const pendingAmount = rows
        .filter((i) => i.status === 'SENT' || i.status === 'OVERDUE' || i.status === 'PARTIALLY_PAID')
        .reduce((sum, i) => sum + Math.max(0, i.total - Number(i.paid)), 0);

    res.json({ totalRevenue, pendingAmount, invoiceCount: rows.length });
});

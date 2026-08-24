import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, canAccessCompany } from '../middleware/auth';

export const metricsRouter = Router();

metricsRouter.use(requireAuth);

metricsRouter.get('/', async (req, res) => {
    const companyId = req.query.companyId as string | undefined;
    if (companyId && !canAccessCompany(req.user!, companyId)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }

    const where = companyId ? { companyId } : {};
    const invoices = await prisma.invoice.findMany({ where, select: { status: true, total: true } });

    const totalRevenue = invoices
        .filter((i) => i.status === 'PAID')
        .reduce((sum, i) => sum + i.total, 0);
    const pendingAmount = invoices
        .filter((i) => i.status === 'SENT' || i.status === 'OVERDUE')
        .reduce((sum, i) => sum + i.total, 0);

    res.json({ totalRevenue, pendingAmount, invoiceCount: invoices.length });
});

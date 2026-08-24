import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireRole, canAccessCompany } from '../middleware/auth';
import { mapClient } from '../serialize';

export const clientsRouter = Router();

clientsRouter.use(requireAuth);

clientsRouter.get('/', async (req, res) => {
    const companyId = req.query.companyId as string;
    if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório' });
    if (!canAccessCompany(req.user!, companyId)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }
    const clients = await prisma.client.findMany({ where: { companyId } });
    res.json(clients.map(mapClient));
});

clientsRouter.get('/:id', async (req, res) => {
    const client = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!client || !canAccessCompany(req.user!, client.companyId)) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    res.json(mapClient(client));
});

clientsRouter.post('/', requireRole('USER'), async (req, res) => {
    const b = req.body;
    if (!canAccessCompany(req.user!, b.company_id)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }
    const client = await prisma.client.create({
        data: {
            companyId: b.company_id,
            name: b.name,
            nuit: b.nuit,
            address: b.address,
            email: b.email,
            phone: b.phone ?? null,
        },
    });
    res.status(201).json(mapClient(client));
});

clientsRouter.patch('/:id', requireRole('USER'), async (req, res) => {
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing || !canAccessCompany(req.user!, existing.companyId)) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    const b = req.body;
    const updated = await prisma.client.update({
        where: { id: req.params.id },
        data: {
            name: b.name,
            nuit: b.nuit,
            address: b.address,
            email: b.email,
            phone: b.phone ?? null,
        },
    });
    res.json(mapClient(updated));
});

clientsRouter.delete('/:id', requireRole('USER'), async (req, res) => {
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing || !canAccessCompany(req.user!, existing.companyId)) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const [invoiceCount, quotationCount] = await Promise.all([
        prisma.invoice.count({ where: { clientId: req.params.id } }),
        prisma.quotation.count({ where: { clientId: req.params.id } }),
    ]);
    if (invoiceCount > 0 || quotationCount > 0) {
        return res
            .status(409)
            .json({ error: 'Não é possível eliminar um cliente com faturas ou cotações associadas' });
    }

    await prisma.client.delete({ where: { id: req.params.id } });
    res.status(204).end();
});

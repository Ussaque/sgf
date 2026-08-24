import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireRole, canAccessCompany } from '../middleware/auth';
import { mapProduct } from '../serialize';

export const productsRouter = Router();

productsRouter.use(requireAuth);

productsRouter.get('/', async (req, res) => {
    const companyId = req.query.companyId as string;
    if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório' });
    if (!canAccessCompany(req.user!, companyId)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }
    const products = await prisma.product.findMany({ where: { companyId } });
    res.json(products.map(mapProduct));
});

productsRouter.post('/', requireRole('USER'), async (req, res) => {
    const b = req.body;
    if (!canAccessCompany(req.user!, b.company_id)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }
    const product = await prisma.product.create({
        data: {
            companyId: b.company_id,
            name: b.name,
            description: b.description ?? null,
            unit: b.unit,
            unitPrice: b.unit_price,
            taxRate: b.tax_rate ?? null,
        },
    });
    res.status(201).json(mapProduct(product));
});

productsRouter.patch('/:id', requireRole('USER'), async (req, res) => {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing || !canAccessCompany(req.user!, existing.companyId)) {
        return res.status(404).json({ error: 'Produto não encontrado' });
    }
    const b = req.body;
    const updated = await prisma.product.update({
        where: { id: req.params.id },
        data: {
            name: b.name,
            description: b.description ?? null,
            unit: b.unit,
            unitPrice: b.unit_price,
            taxRate: b.tax_rate ?? null,
        },
    });
    res.json(mapProduct(updated));
});

productsRouter.delete('/:id', requireRole('USER'), async (req, res) => {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing || !canAccessCompany(req.user!, existing.companyId)) {
        return res.status(404).json({ error: 'Produto não encontrado' });
    }
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).end();
});

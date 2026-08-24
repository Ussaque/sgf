import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireRole, canAccessCompany } from '../middleware/auth';
import { mapInvoice, mapQuotation } from '../serialize';
import { generateDocumentNumber } from '../documentNumber';

export const quotationsRouter = Router();

quotationsRouter.use(requireAuth);

const quotationInclude = { items: true };

quotationsRouter.get('/', async (req, res) => {
    const companyId = req.query.companyId as string;
    if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório' });
    if (!canAccessCompany(req.user!, companyId)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }
    const quotations = await prisma.quotation.findMany({ where: { companyId }, include: quotationInclude });
    res.json(quotations.map(mapQuotation));
});

quotationsRouter.get('/:id', async (req, res) => {
    const quotation = await prisma.quotation.findUnique({
        where: { id: req.params.id },
        include: quotationInclude,
    });
    if (!quotation || !canAccessCompany(req.user!, quotation.companyId)) {
        return res.status(404).json({ error: 'Cotação não encontrada' });
    }
    res.json(mapQuotation(quotation));
});

quotationsRouter.post('/', requireRole('USER'), async (req, res) => {
    const b = req.body;
    if (!canAccessCompany(req.user!, b.company_id)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }

    const quotation = await prisma.$transaction(async (tx) => {
        const company = await tx.company.findUniqueOrThrow({ where: { id: b.company_id } });
        const number = generateDocumentNumber('COT', company.currentQuotationSequence);

        const created = await tx.quotation.create({
            data: {
                companyId: b.company_id,
                clientId: b.client_id,
                number,
                date: new Date(b.date),
                validUntil: new Date(b.valid_until),
                status: 'DRAFT',
                subtotal: b.subtotal,
                taxTotal: b.tax_total,
                total: b.total,
                notes: b.notes ?? null,
                reference: b.reference ?? null,
                createdBy: b.created_by ?? null,
                items: {
                    create: b.items.map((item: any) => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unit_price,
                        taxRate: item.tax_rate,
                        total: item.total,
                    })),
                },
            },
            include: quotationInclude,
        });

        await tx.company.update({
            where: { id: b.company_id },
            data: { currentQuotationSequence: { increment: 1 } },
        });

        return created;
    });

    res.status(201).json(mapQuotation(quotation));
});

quotationsRouter.patch('/:id', requireRole('USER'), async (req, res) => {
    const existing = await prisma.quotation.findUnique({ where: { id: req.params.id } });
    if (!existing || !canAccessCompany(req.user!, existing.companyId)) {
        return res.status(404).json({ error: 'Cotação não encontrada' });
    }
    if (existing.convertedInvoiceId) {
        return res.status(409).json({ error: 'Não é possível editar uma cotação já convertida em fatura' });
    }
    const b = req.body;

    const quotation = await prisma.$transaction(async (tx) => {
        if (b.items) {
            await tx.quotationItem.deleteMany({ where: { quotationId: req.params.id } });
        }
        return tx.quotation.update({
            where: { id: req.params.id },
            data: {
                ...(b.client_id !== undefined && { clientId: b.client_id }),
                ...(b.valid_until !== undefined && { validUntil: new Date(b.valid_until) }),
                ...(b.subtotal !== undefined && { subtotal: b.subtotal }),
                ...(b.tax_total !== undefined && { taxTotal: b.tax_total }),
                ...(b.total !== undefined && { total: b.total }),
                ...(b.notes !== undefined && { notes: b.notes ?? null }),
                ...(b.reference !== undefined && { reference: b.reference ?? null }),
                ...(b.items && {
                    items: {
                        create: b.items.map((item: any) => ({
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: item.unit_price,
                            taxRate: item.tax_rate,
                            total: item.total,
                        })),
                    },
                }),
            },
            include: quotationInclude,
        });
    });

    res.json(mapQuotation(quotation));
});

quotationsRouter.delete('/:id', requireRole('USER'), async (req, res) => {
    const existing = await prisma.quotation.findUnique({ where: { id: req.params.id } });
    if (!existing || !canAccessCompany(req.user!, existing.companyId)) {
        return res.status(404).json({ error: 'Cotação não encontrada' });
    }
    if (existing.convertedInvoiceId) {
        return res.status(409).json({ error: 'Não é possível eliminar uma cotação já convertida em fatura' });
    }
    await prisma.quotation.delete({ where: { id: req.params.id } });
    res.status(204).end();
});

quotationsRouter.post('/:id/convert', requireRole('USER'), async (req, res) => {
    const quotation = await prisma.quotation.findUnique({
        where: { id: req.params.id },
        include: quotationInclude,
    });
    if (!quotation || !canAccessCompany(req.user!, quotation.companyId)) {
        return res.status(404).json({ error: 'Cotação não encontrada' });
    }
    if (quotation.convertedInvoiceId) {
        return res.status(409).json({ error: 'Cotação já foi convertida em fatura' });
    }

    const invoice = await prisma.$transaction(async (tx) => {
        const company = await tx.company.findUniqueOrThrow({ where: { id: quotation.companyId } });
        const number = generateDocumentNumber('FAT', company.currentInvoiceSequence);
        const now = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        const created = await tx.invoice.create({
            data: {
                companyId: quotation.companyId,
                clientId: quotation.clientId,
                number,
                date: now,
                dueDate,
                status: 'SENT',
                subtotal: quotation.subtotal,
                taxTotal: quotation.taxTotal,
                total: quotation.total,
                notes: quotation.notes,
                items: {
                    create: quotation.items.map((item) => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate,
                        total: item.total,
                    })),
                },
            },
            include: { items: true },
        });

        await tx.company.update({
            where: { id: quotation.companyId },
            data: { currentInvoiceSequence: { increment: 1 } },
        });

        await tx.quotation.update({
            where: { id: quotation.id },
            data: { convertedInvoiceId: created.id, status: 'ACCEPTED' },
        });

        return created;
    });

    res.status(201).json(mapInvoice(invoice));
});

import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireRole, canAccessCompany } from '../middleware/auth';
import { mapInvoice } from '../serialize';
import { generateDocumentNumber } from '../documentNumber';

export const invoicesRouter = Router();

invoicesRouter.use(requireAuth);

const invoiceInclude = { items: true };

invoicesRouter.get('/', async (req, res) => {
    const companyId = req.query.companyId as string;
    if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório' });
    if (!canAccessCompany(req.user!, companyId)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }
    const invoices = await prisma.invoice.findMany({ where: { companyId }, include: invoiceInclude });
    res.json(invoices.map(mapInvoice));
});

invoicesRouter.get('/:id', async (req, res) => {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: invoiceInclude });
    if (!invoice || !canAccessCompany(req.user!, invoice.companyId)) {
        return res.status(404).json({ error: 'Fatura não encontrada' });
    }
    res.json(mapInvoice(invoice));
});

invoicesRouter.post('/', requireRole('USER'), async (req, res) => {
    const b = req.body;
    if (!canAccessCompany(req.user!, b.company_id)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }

    const invoice = await prisma.$transaction(async (tx) => {
        const company = await tx.company.findUniqueOrThrow({ where: { id: b.company_id } });
        const number = generateDocumentNumber('FAT', company.currentInvoiceSequence);

        const created = await tx.invoice.create({
            data: {
                companyId: b.company_id,
                clientId: b.client_id,
                number,
                date: new Date(b.date),
                dueDate: new Date(b.due_date),
                status: b.status ?? 'SENT',
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
            include: invoiceInclude,
        });

        await tx.company.update({
            where: { id: b.company_id },
            data: { currentInvoiceSequence: { increment: 1 } },
        });

        return created;
    });

    res.status(201).json(mapInvoice(invoice));
});

invoicesRouter.patch('/:id', requireRole('USER'), async (req, res) => {
    const existing = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!existing || !canAccessCompany(req.user!, existing.companyId)) {
        return res.status(404).json({ error: 'Fatura não encontrada' });
    }
    const b = req.body;

    const invoice = await prisma.$transaction(async (tx) => {
        if (b.items) {
            await tx.invoiceItem.deleteMany({ where: { invoiceId: req.params.id } });
        }
        return tx.invoice.update({
            where: { id: req.params.id },
            data: {
                ...(b.client_id !== undefined && { clientId: b.client_id }),
                ...(b.due_date !== undefined && { dueDate: new Date(b.due_date) }),
                ...(b.status !== undefined && { status: b.status }),
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
            include: invoiceInclude,
        });
    });

    res.json(mapInvoice(invoice));
});

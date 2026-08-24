import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireRole, canAccessCompany } from '../middleware/auth';
import { mapReceipt } from '../serialize';
import { generateDocumentNumber } from '../documentNumber';

export const receiptsRouter = Router();

receiptsRouter.use(requireAuth);

receiptsRouter.get('/', async (req, res) => {
    const companyId = req.query.companyId as string;
    if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório' });
    if (!canAccessCompany(req.user!, companyId)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }
    const receipts = await prisma.receipt.findMany({ where: { companyId } });
    res.json(receipts.map(mapReceipt));
});

receiptsRouter.get('/:id', async (req, res) => {
    const receipt = await prisma.receipt.findUnique({ where: { id: req.params.id } });
    if (!receipt || !canAccessCompany(req.user!, receipt.companyId)) {
        return res.status(404).json({ error: 'Recibo não encontrado' });
    }
    res.json(mapReceipt(receipt));
});

receiptsRouter.post('/', requireRole('USER'), async (req, res) => {
    const b = req.body;
    if (!canAccessCompany(req.user!, b.company_id)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }

    const receipt = await prisma.$transaction(async (tx) => {
        const company = await tx.company.findUniqueOrThrow({ where: { id: b.company_id } });
        const number = generateDocumentNumber('REC', company.currentReceiptSequence);

        const created = await tx.receipt.create({
            data: {
                companyId: b.company_id,
                invoiceId: b.invoice_id,
                number,
                date: new Date(b.date),
                amount: b.amount,
                method: b.method,
                reference: b.reference ?? null,
            },
        });

        await tx.company.update({
            where: { id: b.company_id },
            data: { currentReceiptSequence: { increment: 1 } },
        });

        await tx.invoice.update({ where: { id: b.invoice_id }, data: { status: 'PAID' } });

        return created;
    });

    res.status(201).json(mapReceipt(receipt));
});

receiptsRouter.post('/:id/void', requireRole('USER'), async (req, res) => {
    const receipt = await prisma.receipt.findUnique({ where: { id: req.params.id } });
    if (!receipt || !canAccessCompany(req.user!, receipt.companyId)) {
        return res.status(404).json({ error: 'Recibo não encontrado' });
    }
    if (receipt.voided) {
        return res.status(409).json({ error: 'Recibo já foi anulado' });
    }

    const updated = await prisma.$transaction(async (tx) => {
        const voided = await tx.receipt.update({ where: { id: req.params.id }, data: { voided: true } });

        const invoice = await tx.invoice.findUnique({ where: { id: receipt.invoiceId } });
        if (invoice?.status === 'PAID') {
            await tx.invoice.update({ where: { id: invoice.id }, data: { status: 'SENT' } });
        }

        return voided;
    });

    res.json(mapReceipt(updated));
});

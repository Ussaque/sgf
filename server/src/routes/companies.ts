import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireRole, canAccessCompany } from '../middleware/auth';
import { mapCompany } from '../serialize';

export const companiesRouter = Router();

companiesRouter.use(requireAuth);

const companyInclude = { bankAccounts: true };

companiesRouter.get('/', async (req, res) => {
    const user = req.user!;
    const where =
        user.role === 'SUPER_ADMIN'
            ? { organizationId: user.organizationId }
            : { id: { in: user.allowedCompanyIds } };

    const companies = await prisma.company.findMany({ where, include: companyInclude });
    res.json(companies.map(mapCompany));
});

companiesRouter.get('/:id', async (req, res) => {
    if (!canAccessCompany(req.user!, req.params.id)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }
    const company = await prisma.company.findUnique({
        where: { id: req.params.id },
        include: companyInclude,
    });
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });
    res.json(mapCompany(company));
});

companiesRouter.post('/', requireRole('SUPER_ADMIN'), async (req, res) => {
    const b = req.body;
    const company = await prisma.company.create({
        data: {
            organizationId: req.user!.organizationId,
            name: b.name,
            nuit: b.nuit,
            address: b.address,
            email: b.email,
            phone: b.phone ?? null,
            logoUrl: b.logo_url ?? null,
            brandColor: b.brand_color ?? null,
        },
        include: companyInclude,
    });
    res.status(201).json(mapCompany(company));
});

companiesRouter.patch('/:id', requireRole('ADMIN'), async (req, res) => {
    if (!canAccessCompany(req.user!, req.params.id)) {
        return res.status(403).json({ error: 'Sem acesso a esta empresa' });
    }
    const b = req.body;

    const data: Record<string, unknown> = {};
    if (b.name !== undefined) data.name = b.name;
    if (b.nuit !== undefined) data.nuit = b.nuit;
    if (b.address !== undefined) data.address = b.address;
    if (b.email !== undefined) data.email = b.email;
    if (b.phone !== undefined) data.phone = b.phone ?? null;
    if (b.logo_url !== undefined) data.logoUrl = b.logo_url ?? null;
    if (b.brand_color !== undefined) data.brandColor = b.brand_color ?? null;
    if (b.default_tax_rate !== undefined) data.defaultTaxRate = b.default_tax_rate ?? null;
    if (b.default_due_days !== undefined) data.defaultDueDays = b.default_due_days ?? null;
    if (b.mpesa_number !== undefined) data.mpesaNumber = b.mpesa_number ?? null;
    if (b.emola_number !== undefined) data.emolaNumber = b.emola_number ?? null;
    if (b.payment_notes !== undefined) data.paymentNotes = b.payment_notes ?? null;
    if (b.current_invoice_sequence !== undefined) data.currentInvoiceSequence = b.current_invoice_sequence;
    if (b.current_receipt_sequence !== undefined) data.currentReceiptSequence = b.current_receipt_sequence;
    if (b.current_quotation_sequence !== undefined) data.currentQuotationSequence = b.current_quotation_sequence;

    await prisma.$transaction(async (tx) => {
        await tx.company.update({ where: { id: req.params.id }, data });

        if (b.bank_accounts !== undefined) {
            await tx.bankAccount.deleteMany({ where: { companyId: req.params.id } });
            if (Array.isArray(b.bank_accounts) && b.bank_accounts.length > 0) {
                await tx.bankAccount.createMany({
                    data: b.bank_accounts.map((a: any) => ({
                        companyId: req.params.id,
                        bankName: a.bank_name,
                        accountHolder: a.account_holder ?? null,
                        accountNumber: a.account_number,
                        nib: a.nib ?? null,
                        iban: a.iban ?? null,
                        swiftCode: a.swift_code ?? null,
                        currency: a.currency ?? 'MZN',
                    })),
                });
            }
        }
    });

    const updated = await prisma.company.findUnique({
        where: { id: req.params.id },
        include: companyInclude,
    });
    res.json(mapCompany(updated));
});

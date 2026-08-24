import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash('password', 10);

    const org = await prisma.organization.create({
        data: { name: 'Matrix Holdings', plan: 'ENTERPRISE' },
    });

    const techSolutions = await prisma.company.create({
        data: {
            organizationId: org.id,
            name: 'Tech Solutions MZ',
            nuit: '400123456',
            address: 'Av. Julius Nyerere, 123, Maputo',
            email: 'contact@techsolutions.co.mz',
        },
    });

    const buildRight = await prisma.company.create({
        data: {
            organizationId: org.id,
            name: 'BuildRight Construction',
            nuit: '400987654',
            address: 'Rua da Resistência, 456, Matola',
            email: 'info@buildright.co.mz',
        },
    });

    const superAdmin = await prisma.user.create({
        data: {
            organizationId: org.id,
            name: 'Super Admin',
            email: 'super@matrix.co.mz',
            role: 'SUPER_ADMIN',
            passwordHash,
        },
    });

    const adminTech = await prisma.user.create({
        data: {
            organizationId: org.id,
            name: 'Admin Tech',
            email: 'admin@techsolutions.co.mz',
            role: 'ADMIN',
            passwordHash,
            allowedCompanies: { create: [{ companyId: techSolutions.id }] },
        },
    });

    await prisma.user.create({
        data: {
            organizationId: org.id,
            name: 'User Tech',
            email: 'user@techsolutions.co.mz',
            role: 'USER',
            passwordHash,
            allowedCompanies: { create: [{ companyId: techSolutions.id }] },
        },
    });

    await prisma.user.create({
        data: {
            organizationId: org.id,
            name: 'Viewer Build',
            email: 'viewer@buildright.co.mz',
            role: 'VIEWER',
            passwordHash,
            allowedCompanies: { create: [{ companyId: buildRight.id }] },
        },
    });

    await prisma.client.create({
        data: {
            companyId: techSolutions.id,
            name: 'Vodacom Mozambique',
            nuit: '500111222',
            address: 'Rua dos Desportistas, Maputo',
            email: 'procurement@vm.co.mz',
        },
    });

    await prisma.client.create({
        data: {
            companyId: buildRight.id,
            name: 'Mozal S.A.',
            nuit: '500333444',
            address: 'Beluluane Industrial Park, Matola',
            email: 'accounts@mozal.co.mz',
        },
    });

    console.log('Seed concluído.');
    console.log(`Super Admin: ${superAdmin.email} / password`);
    console.log(`Admin Tech: ${adminTech.email} / password`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

import 'dotenv/config';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from './db';

async function main() {
    const passwordHash = await bcrypt.hash('password', 10);

    const orgId = crypto.randomUUID();
    await pool.query('INSERT INTO organizations (id, name, plan) VALUES (?, ?, ?)', [
        orgId,
        'Matrix Holdings',
        'ENTERPRISE',
    ]);

    const techId = crypto.randomUUID();
    await pool.query(
        `INSERT INTO companies (id, organization_id, name, nuit, address, email)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [techId, orgId, 'Tech Solutions MZ', '400123456', 'Av. Julius Nyerere, 123, Maputo', 'contact@techsolutions.co.mz']
    );

    const buildId = crypto.randomUUID();
    await pool.query(
        `INSERT INTO companies (id, organization_id, name, nuit, address, email)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [buildId, orgId, 'BuildRight Construction', '400987654', 'Rua da Resistência, 456, Matola', 'info@buildright.co.mz']
    );

    async function createUser(name: string, email: string, role: string, companyIds: string[]) {
        const id = crypto.randomUUID();
        await pool.query(
            'INSERT INTO users (id, organization_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
            [id, orgId, name, email, passwordHash, role]
        );
        for (const companyId of companyIds) {
            await pool.query('INSERT INTO user_company_access (user_id, company_id) VALUES (?, ?)', [
                id,
                companyId,
            ]);
        }
        return id;
    }

    const superAdminId = await createUser('Super Admin', 'super@matrix.co.mz', 'SUPER_ADMIN', []);
    const adminTechId = await createUser('Admin Tech', 'admin@techsolutions.co.mz', 'ADMIN', [techId]);
    await createUser('User Tech', 'user@techsolutions.co.mz', 'USER', [techId]);
    await createUser('Viewer Build', 'viewer@buildright.co.mz', 'VIEWER', [buildId]);

    await pool.query(
        `INSERT INTO clients (id, company_id, name, nuit, address, email)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), techId, 'Vodacom Mozambique', '500111222', 'Rua dos Desportistas, Maputo', 'procurement@vm.co.mz']
    );

    await pool.query(
        `INSERT INTO clients (id, company_id, name, nuit, address, email)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), buildId, 'Mozal S.A.', '500333444', 'Beluluane Industrial Park, Matola', 'accounts@mozal.co.mz']
    );

    console.log('Seed concluído.');
    console.log(`Super Admin: super@matrix.co.mz / password (id ${superAdminId})`);
    console.log(`Admin Tech: admin@techsolutions.co.mz / password (id ${adminTechId})`);
    await pool.end();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

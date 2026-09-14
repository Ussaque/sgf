import crypto from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool, withTransaction } from '../db';
import { requireAuth, requireRole, loadAllowedCompanyIds } from '../middleware/auth';
import { mapUser } from '../rows';

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'USER', 'VIEWER'] as const;
function roleIndex(role: string) {
    return ROLES.indexOf(role as (typeof ROLES)[number]);
}

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/', async (req, res) => {
    const [rows] = await pool.query<any[]>('SELECT * FROM users WHERE organization_id = ?', [
        req.user!.organizationId,
    ]);
    const users = await Promise.all(
        rows.map(async (u) => mapUser(u, await loadAllowedCompanyIds(u.id)))
    );
    res.json(users);
});

usersRouter.post('/', requireRole('ADMIN'), async (req, res) => {
    const { name, email, password, role, allowed_company_ids } = req.body as {
        name?: string;
        email?: string;
        password?: string;
        role?: string;
        allowed_company_ids?: string[];
    };

    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Nome, email, password e role são obrigatórios' });
    }
    if (!ROLES.includes(role as (typeof ROLES)[number])) {
        return res.status(400).json({ error: 'Role inválido' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'A password deve ter pelo menos 6 caracteres' });
    }
    if (roleIndex(role) < roleIndex(req.user!.role)) {
        return res.status(403).json({ error: 'Não podes atribuir um role superior ao teu' });
    }

    const companyIds = allowed_company_ids ?? [];
    if (companyIds.length > 0) {
        const [companyRows] = await pool.query<any[]>(
            `SELECT id FROM companies WHERE organization_id = ? AND id IN (${companyIds.map(() => '?').join(',')})`,
            [req.user!.organizationId, ...companyIds]
        );
        if (companyRows.length !== companyIds.length) {
            return res.status(400).json({ error: 'Uma ou mais empresas são inválidas' });
        }
    }

    const [existingRows] = await pool.query<any[]>('SELECT id FROM users WHERE email = ?', [email]);
    if (existingRows.length > 0) {
        return res.status(409).json({ error: 'Já existe um utilizador com este email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    await withTransaction(async (conn) => {
        await conn.query(
            'INSERT INTO users (id, organization_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, req.user!.organizationId, name, email, passwordHash, role]
        );
        for (const companyId of companyIds) {
            await conn.query('INSERT INTO user_company_access (user_id, company_id) VALUES (?, ?)', [
                userId,
                companyId,
            ]);
        }
    });

    const [rows] = await pool.query<any[]>('SELECT * FROM users WHERE id = ?', [userId]);
    res.status(201).json(mapUser(rows[0], companyIds));
});

usersRouter.patch('/:id', requireRole('ADMIN'), async (req, res) => {
    const { role, allowed_company_ids } = req.body as { role?: string; allowed_company_ids?: string[] };
    if (role !== undefined && !ROLES.includes(role as (typeof ROLES)[number])) {
        return res.status(400).json({ error: 'Role inválido' });
    }

    const [rows] = await pool.query<any[]>('SELECT * FROM users WHERE id = ?', [req.params.id]);
    const target = rows[0];
    if (!target || target.organization_id !== req.user!.organizationId) {
        return res.status(404).json({ error: 'Utilizador não encontrado' });
    }
    if (target.id === req.user!.id) {
        return res.status(403).json({ error: 'Não podes editar o teu próprio acesso' });
    }
    if (roleIndex(target.role) < roleIndex(req.user!.role)) {
        return res.status(403).json({ error: 'Não podes editar um utilizador com role superior ao teu' });
    }
    if (role !== undefined && roleIndex(role) < roleIndex(req.user!.role)) {
        return res.status(403).json({ error: 'Não podes atribuir um role superior ao teu' });
    }

    if (allowed_company_ids !== undefined && allowed_company_ids.length > 0) {
        const [companyRows] = await pool.query<any[]>(
            `SELECT id FROM companies WHERE organization_id = ? AND id IN (${allowed_company_ids.map(() => '?').join(',')})`,
            [req.user!.organizationId, ...allowed_company_ids]
        );
        if (companyRows.length !== allowed_company_ids.length) {
            return res.status(400).json({ error: 'Uma ou mais empresas são inválidas' });
        }
    }

    await withTransaction(async (conn) => {
        if (role !== undefined) {
            await conn.query('UPDATE users SET role = ? WHERE id = ?', [role, target.id]);
        }
        if (allowed_company_ids !== undefined) {
            await conn.query('DELETE FROM user_company_access WHERE user_id = ?', [target.id]);
            for (const companyId of allowed_company_ids) {
                await conn.query('INSERT INTO user_company_access (user_id, company_id) VALUES (?, ?)', [
                    target.id,
                    companyId,
                ]);
            }
        }
    });

    const allowedCompanyIds = await loadAllowedCompanyIds(target.id);
    res.json(mapUser({ ...target, role: role ?? target.role }, allowedCompanyIds));
});

usersRouter.post('/:id/reset-password', requireRole('ADMIN'), async (req, res) => {
    const { password } = req.body as { password?: string };
    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'A password deve ter pelo menos 6 caracteres' });
    }

    const [rows] = await pool.query<any[]>('SELECT * FROM users WHERE id = ?', [req.params.id]);
    const target = rows[0];
    if (!target || target.organization_id !== req.user!.organizationId) {
        return res.status(404).json({ error: 'Utilizador não encontrado' });
    }
    if (roleIndex(target.role) < roleIndex(req.user!.role)) {
        return res.status(403).json({ error: 'Não podes redefinir a password de um utilizador com role superior ao teu' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, target.id]);
    res.status(204).end();
});

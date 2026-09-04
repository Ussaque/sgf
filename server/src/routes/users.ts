import { Router } from 'express';
import { pool } from '../db';
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

usersRouter.patch('/:id', requireRole('ADMIN'), async (req, res) => {
    const { role } = req.body as { role?: string };
    if (!role || !ROLES.includes(role as (typeof ROLES)[number])) {
        return res.status(400).json({ error: 'Role inválido' });
    }

    const [rows] = await pool.query<any[]>('SELECT * FROM users WHERE id = ?', [req.params.id]);
    const target = rows[0];
    if (!target || target.organization_id !== req.user!.organizationId) {
        return res.status(404).json({ error: 'Utilizador não encontrado' });
    }
    if (target.id === req.user!.id) {
        return res.status(403).json({ error: 'Não podes editar o teu próprio role' });
    }
    if (roleIndex(target.role) < roleIndex(req.user!.role)) {
        return res.status(403).json({ error: 'Não podes editar um utilizador com role superior ao teu' });
    }
    if (roleIndex(role) < roleIndex(req.user!.role)) {
        return res.status(403).json({ error: 'Não podes atribuir um role superior ao teu' });
    }

    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, target.id]);
    const allowedCompanyIds = await loadAllowedCompanyIds(target.id);
    res.json(mapUser({ ...target, role }, allowedCompanyIds));
});

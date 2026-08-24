import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { mapUser } from '../serialize';

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'USER', 'VIEWER'] as const;
function roleIndex(role: string) {
    return ROLES.indexOf(role as (typeof ROLES)[number]);
}

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/', async (req, res) => {
    const users = await prisma.user.findMany({
        where: { organizationId: req.user!.organizationId },
        include: { allowedCompanies: true },
    });
    res.json(users.map(mapUser));
});

usersRouter.patch('/:id', requireRole('ADMIN'), async (req, res) => {
    const { role } = req.body as { role?: string };
    if (!role || !ROLES.includes(role as (typeof ROLES)[number])) {
        return res.status(400).json({ error: 'Role inválido' });
    }

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target || target.organizationId !== req.user!.organizationId) {
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

    const updated = await prisma.user.update({
        where: { id: target.id },
        data: { role: role as (typeof ROLES)[number] },
        include: { allowedCompanies: true },
    });
    res.json(mapUser(updated));
});

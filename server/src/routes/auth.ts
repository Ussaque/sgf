import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { requireAuth, signToken } from '../middleware/auth';
import { mapUser } from '../serialize';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
        return res.status(400).json({ error: 'Email e password são obrigatórios' });
    }

    const user = await prisma.user.findUnique({
        where: { email },
        include: { allowedCompanies: true },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = signToken(user.id);
    res.json({ token, user: mapUser(user) });
});

authRouter.get('/me', requireAuth, async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: { allowedCompanies: true },
    });
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });
    res.json(mapUser(user));
});

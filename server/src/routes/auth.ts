import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db';
import { requireAuth, signToken, loadAllowedCompanyIds } from '../middleware/auth';
import { mapUser } from '../rows';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
        return res.status(400).json({ error: 'Email e password são obrigatórios' });
    }

    const [rows] = await pool.query<any[]>('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = signToken(user.id);
    const allowedCompanyIds = await loadAllowedCompanyIds(user.id);
    res.json({ token, user: mapUser(user, allowedCompanyIds) });
});

authRouter.get('/me', requireAuth, async (req, res) => {
    const [rows] = await pool.query<any[]>('SELECT * FROM users WHERE id = ?', [req.user!.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });
    res.json(mapUser(user, req.user!.allowedCompanyIds));
});

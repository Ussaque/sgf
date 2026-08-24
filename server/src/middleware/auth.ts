import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET!;
const ROLES = ['SUPER_ADMIN', 'ADMIN', 'USER', 'VIEWER'] as const;
type Role = (typeof ROLES)[number];

export interface AuthUser {
    id: string;
    organizationId: string;
    name: string;
    email: string;
    role: Role;
    allowedCompanyIds: string[];
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

export function signToken(userId: string): string {
    return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Não autenticado' });
    }

    try {
        const payload = jwt.verify(header.slice(7), JWT_SECRET) as { sub: string };
        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            include: { allowedCompanies: true },
        });
        if (!user) return res.status(401).json({ error: 'Utilizador não encontrado' });

        req.user = {
            id: user.id,
            organizationId: user.organizationId,
            name: user.name,
            email: user.email,
            role: user.role,
            allowedCompanyIds: user.allowedCompanies.map((a) => a.companyId),
        };
        next();
    } catch {
        return res.status(401).json({ error: 'Sessão inválida' });
    }
}

export function requireRole(minRole: Role) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
        const userIndex = ROLES.indexOf(req.user.role);
        const requiredIndex = ROLES.indexOf(minRole);
        if (userIndex > requiredIndex) {
            return res.status(403).json({ error: 'Sem permissão para esta ação' });
        }
        next();
    };
}

export function canAccessCompany(user: AuthUser, companyId: string): boolean {
    if (user.role === 'SUPER_ADMIN') return true;
    return user.allowedCompanyIds.includes(companyId);
}

export function requireCompanyAccess(getCompanyId: (req: Request) => string) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
        const companyId = getCompanyId(req);
        if (!canAccessCompany(req.user, companyId)) {
            return res.status(403).json({ error: 'Sem acesso a esta empresa' });
        }
        next();
    };
}

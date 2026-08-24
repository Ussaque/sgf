import type { Role } from '@/types';

export const ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'USER', 'VIEWER'];

export const ROLE_LABELS: Record<Role, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    USER: 'Utilizador',
    VIEWER: 'Visualizador',
};

export function roleIndex(role: Role) {
    return ROLES.indexOf(role);
}

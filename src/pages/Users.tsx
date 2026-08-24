import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import type { Company, Role, User } from '@/types';
import { ROLES, ROLE_LABELS, roleIndex } from '@/lib/roles';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export default function Users() {
    const { user: currentUser, hasPermission } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);

    async function refresh() {
        if (!currentUser) return;
        const [orgUsers, allCompanies] = await Promise.all([
            api.getUsers(currentUser.organization_id),
            api.getCompanies(),
        ]);
        setUsers(orgUsers);
        setCompanies(allCompanies.filter((c) => c.organization_id === currentUser.organization_id));
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    if (!hasPermission('ADMIN')) {
        return (
            <div className="grid gap-4">
                <h1 className="text-2xl font-semibold">Utilizadores</h1>
                <Card>
                    <CardHeader>
                        <CardTitle>Acesso restrito</CardTitle>
                        <CardDescription>
                            Não tens permissão para gerir utilizadores.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    function companyNames(target: User) {
        if (target.role === 'SUPER_ADMIN' && target.allowed_company_ids.length === 0) {
            return 'Todas as empresas';
        }
        const names = companies
            .filter((c) => target.allowed_company_ids.includes(c.id))
            .map((c) => c.name);
        return names.length > 0 ? names.join(', ') : '—';
    }

    async function handleRoleChange(target: User, newRole: Role) {
        await api.updateUser({ ...target, role: newRole });
        toast.success(`Role de ${target.name} atualizado para ${ROLE_LABELS[newRole]}`);
        refresh();
    }

    return (
        <div className="grid gap-4">
            <div>
                <h1 className="text-2xl font-semibold">Utilizadores</h1>
                <p className="text-sm text-muted-foreground">
                    Gestão de acessos e permissões da organização
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Todos os utilizadores</CardTitle>
                    <CardDescription>{users.length} utilizador(es)</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Empresas</TableHead>
                                <TableHead className="w-48">Role</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((target) => {
                                const isSelf = target.id === currentUser?.id;
                                const isAboveMe =
                                    !!currentUser && roleIndex(target.role) < roleIndex(currentUser.role);
                                const disabled = isSelf || isAboveMe;
                                const assignableRoles = currentUser
                                    ? ROLES.slice(roleIndex(currentUser.role))
                                    : ROLES;

                                return (
                                    <TableRow key={target.id}>
                                        <TableCell className="font-medium">
                                            {target.name}
                                            {isSelf && (
                                                <span className="ml-1 text-xs text-muted-foreground">(tu)</span>
                                            )}
                                        </TableCell>
                                        <TableCell>{target.email}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {companyNames(target)}
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={target.role}
                                                onValueChange={(value) => handleRoleChange(target, value as Role)}
                                                disabled={disabled}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {assignableRoles.map((role) => (
                                                        <SelectItem key={role} value={role}>
                                                            {ROLE_LABELS[role]}
                                                        </SelectItem>
                                                    ))}
                                                    {!assignableRoles.includes(target.role) && (
                                                        <SelectItem value={target.role} disabled>
                                                            {ROLE_LABELS[target.role]}
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                        Nenhum utilizador encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

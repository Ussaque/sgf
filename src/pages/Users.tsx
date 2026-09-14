import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Building2, KeyRound, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import type { Company, Role, User } from '@/types';
import { ROLES, ROLE_LABELS, roleIndex } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
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

type NewUserFormValues = {
    name: string;
    email: string;
    password: string;
    role: Role;
    allowed_company_ids: string[];
};

type ResetPasswordFormValues = {
    password: string;
};

export default function Users() {
    const { user: currentUser, hasPermission } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [resettingUser, setResettingUser] = useState<User | null>(null);
    const [editingCompaniesUser, setEditingCompaniesUser] = useState<User | null>(null);
    const [editingCompanyIds, setEditingCompanyIds] = useState<string[]>([]);

    const form = useForm<NewUserFormValues>({
        defaultValues: {
            name: '',
            email: '',
            password: '',
            role: 'USER',
            allowed_company_ids: [],
        },
    });

    const resetForm = useForm<ResetPasswordFormValues>({
        defaultValues: { password: '' },
    });

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

    const assignableRoles = currentUser ? ROLES.slice(roleIndex(currentUser.role)) : ROLES;

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

    function openCreateDialog() {
        form.reset({
            name: '',
            email: '',
            password: '',
            role: assignableRoles[assignableRoles.length - 1] ?? 'USER',
            allowed_company_ids: [],
        });
        setCreateOpen(true);
    }

    async function onSubmit(values: NewUserFormValues) {
        try {
            await api.createUser(values);
            toast.success(`Utilizador ${values.name} criado`);
            setCreateOpen(false);
            refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao criar utilizador');
        }
    }

    function openResetDialog(target: User) {
        resetForm.reset({ password: '' });
        setResettingUser(target);
    }

    function openCompaniesDialog(target: User) {
        setEditingCompanyIds(target.allowed_company_ids);
        setEditingCompaniesUser(target);
    }

    async function handleSaveCompanies() {
        if (!editingCompaniesUser) return;
        try {
            await api.updateUserCompanies(editingCompaniesUser.id, editingCompanyIds);
            toast.success(`Empresas de ${editingCompaniesUser.name} atualizadas`);
            setEditingCompaniesUser(null);
            refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao atualizar empresas');
        }
    }

    async function onSubmitReset(values: ResetPasswordFormValues) {
        if (!resettingUser) return;
        try {
            await api.resetUserPassword(resettingUser.id, values.password);
            toast.success(`Password de ${resettingUser.name} redefinida`);
            setResettingUser(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao redefinir password');
        }
    }

    return (
        <div className="grid gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Utilizadores</h1>
                    <p className="text-sm text-muted-foreground">
                        Gestão de acessos e permissões da organização
                    </p>
                </div>

                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger
                        render={
                            <Button onClick={openCreateDialog}>
                                <Plus /> Novo utilizador
                            </Button>
                        }
                    />
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Novo utilizador</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    rules={{ required: true }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nome completo" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    rules={{ required: true }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="email@empresa.co.mz" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    rules={{ required: true, minLength: 6 }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="role"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Role</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {assignableRoles.map((role) => (
                                                        <SelectItem key={role} value={role}>
                                                            {ROLE_LABELS[role]}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="allowed_company_ids"
                                    render={({ field }) => {
                                        const isSuperAdmin = form.watch('role') === 'SUPER_ADMIN';
                                        return (
                                            <FormItem>
                                                <FormLabel>Empresas com acesso</FormLabel>
                                                {isSuperAdmin ? (
                                                    <p className="text-sm text-muted-foreground">
                                                        Super Admin tem acesso a todas as empresas automaticamente.
                                                    </p>
                                                ) : (
                                                    <div className="grid gap-2 rounded-md border p-3">
                                                        {companies.map((company) => {
                                                            const checked = field.value.includes(company.id);
                                                            return (
                                                                <Label
                                                                    key={company.id}
                                                                    className="flex items-center gap-2 font-normal"
                                                                >
                                                                    <Checkbox
                                                                        checked={checked}
                                                                        onCheckedChange={(value) => {
                                                                            field.onChange(
                                                                                value
                                                                                    ? [...field.value, company.id]
                                                                                    : field.value.filter(
                                                                                          (id) => id !== company.id
                                                                                      )
                                                                            );
                                                                        }}
                                                                    />
                                                                    {company.name}
                                                                </Label>
                                                            );
                                                        })}
                                                        {companies.length === 0 && (
                                                            <p className="text-sm text-muted-foreground">
                                                                Nenhuma empresa disponível.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />
                                <DialogFooter>
                                    <Button type="submit">Criar utilizador</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
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
                                <TableHead className="w-12" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((target) => {
                                const isSelf = target.id === currentUser?.id;
                                const isAboveMe =
                                    !!currentUser && roleIndex(target.role) < roleIndex(currentUser.role);
                                const disabled = isSelf || isAboveMe;
                                const rowAssignableRoles = currentUser
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
                                                    {rowAssignableRoles.map((role) => (
                                                        <SelectItem key={role} value={role}>
                                                            {ROLE_LABELS[role]}
                                                        </SelectItem>
                                                    ))}
                                                    {!rowAssignableRoles.includes(target.role) && (
                                                        <SelectItem value={target.role} disabled>
                                                            {ROLE_LABELS[target.role]}
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                {target.role !== 'SUPER_ADMIN' && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        title="Editar empresas"
                                                        disabled={isAboveMe}
                                                        onClick={() => openCompaniesDialog(target)}
                                                    >
                                                        <Building2 />
                                                    </Button>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="Redefinir password"
                                                    disabled={isAboveMe}
                                                    onClick={() => openResetDialog(target)}
                                                >
                                                    <KeyRound />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        Nenhum utilizador encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={!!resettingUser} onOpenChange={(isOpen) => !isOpen && setResettingUser(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Redefinir password</DialogTitle>
                    </DialogHeader>
                    {resettingUser && (
                        <p className="text-sm text-muted-foreground">
                            Define uma nova password para {resettingUser.name} ({resettingUser.email}).
                        </p>
                    )}
                    <Form {...resetForm}>
                        <form onSubmit={resetForm.handleSubmit(onSubmitReset)} className="grid gap-4">
                            <FormField
                                control={resetForm.control}
                                name="password"
                                rules={{ required: true, minLength: 6 }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nova password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="submit">Redefinir password</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!editingCompaniesUser}
                onOpenChange={(isOpen) => !isOpen && setEditingCompaniesUser(null)}
            >
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Empresas com acesso</DialogTitle>
                    </DialogHeader>
                    {editingCompaniesUser && (
                        <p className="text-sm text-muted-foreground">
                            Escolhe as empresas que {editingCompaniesUser.name} pode aceder.
                        </p>
                    )}
                    <div className="grid gap-2 rounded-md border p-3">
                        {companies.map((company) => {
                            const checked = editingCompanyIds.includes(company.id);
                            return (
                                <Label key={company.id} className="flex items-center gap-2 font-normal">
                                    <Checkbox
                                        checked={checked}
                                        onCheckedChange={(value) => {
                                            setEditingCompanyIds((current) =>
                                                value
                                                    ? [...current, company.id]
                                                    : current.filter((id) => id !== company.id)
                                            );
                                        }}
                                    />
                                    {company.name}
                                </Label>
                            );
                        })}
                        {companies.length === 0 && (
                            <p className="text-sm text-muted-foreground">Nenhuma empresa disponível.</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={handleSaveCompanies}>
                            Guardar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

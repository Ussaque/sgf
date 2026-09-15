import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FileBarChart, FilePlus, FileSpreadsheet, History, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { api } from '@/services/api';
import type { Client } from '@/types';
import { generateId } from '@/lib/uuid';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type ClientFormValues = {
    name: string;
    nuit: string;
    address: string;
    email: string;
    phone: string;
};

const EMPTY_FORM: ClientFormValues = { name: '', nuit: '', address: '', email: '', phone: '' };

export default function Clients() {
    const { hasPermission } = useAuth();
    const canEdit = hasPermission('USER');
    const { companyId, company } = useCompany();
    const navigate = useNavigate();
    const [clients, setClients] = useState<Client[]>([]);
    const [open, setOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [deletingClient, setDeletingClient] = useState<Client | null>(null);
    const [search, setSearch] = useState('');

    const form = useForm<ClientFormValues>({ defaultValues: EMPTY_FORM });

    async function refresh() {
        if (!companyId) return;
        setClients(await api.getClients(companyId));
    }

    const filteredClients = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return clients;
        return clients.filter((client) =>
            `${client.name} ${client.nuit} ${client.email} ${client.phone ?? ''}`
                .toLowerCase()
                .includes(term)
        );
    }, [clients, search]);

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);

    function openCreateDialog() {
        setEditingClient(null);
        form.reset(EMPTY_FORM);
        setOpen(true);
    }

    function openEditDialog(client: Client) {
        setEditingClient(client);
        form.reset({
            name: client.name,
            nuit: client.nuit,
            address: client.address,
            email: client.email,
            phone: client.phone ?? '',
        });
        setOpen(true);
    }

    async function onSubmit(values: ClientFormValues) {
        if (!companyId) return;

        if (editingClient) {
            await api.updateClient({
                ...editingClient,
                name: values.name,
                nuit: values.nuit,
                address: values.address,
                email: values.email,
                phone: values.phone || undefined,
            });
            toast.success('Cliente atualizado com sucesso');
        } else {
            await api.createClient({
                id: generateId(),
                company_id: companyId,
                name: values.name,
                nuit: values.nuit,
                address: values.address,
                email: values.email,
                phone: values.phone || undefined,
            });
            toast.success('Cliente criado com sucesso');
        }

        form.reset(EMPTY_FORM);
        setEditingClient(null);
        setOpen(false);
        refresh();
    }

    async function handleDelete() {
        if (!deletingClient) return;
        try {
            await api.deleteClient(deletingClient.id);
            toast.success('Cliente eliminado');
            refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao eliminar cliente');
        } finally {
            setDeletingClient(null);
        }
    }

    function viewStatement(client: Client) {
        window.open(`/extratos/${client.id}/imprimir`, '_blank');
    }

    function newInvoiceFor(client: Client) {
        navigate('/faturas', { state: { prefillClientId: client.id } });
    }

    function newQuotationFor(client: Client) {
        navigate('/cotacoes', { state: { prefillClientId: client.id } });
    }

    function viewHistoryFor(client: Client) {
        navigate('/faturas', { state: { filterClientId: client.id } });
    }

    return (
        <div className="grid gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Clientes</h1>
                    <p className="text-sm text-muted-foreground">Gestão de clientes da empresa</p>
                </div>
                {canEdit && (
                <Dialog
                    open={open}
                    onOpenChange={(isOpen) => {
                        setOpen(isOpen);
                        if (!isOpen) setEditingClient(null);
                    }}
                >
                    <DialogTrigger render={<Button onClick={openCreateDialog}><Plus /> Novo Cliente</Button>} />
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editingClient ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    rules={{ required: 'Obrigatório' }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="nuit"
                                    rules={{ required: 'Obrigatório' }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>NUIT</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="address"
                                    rules={{ required: 'Obrigatório' }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Morada</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    rules={{ required: 'Obrigatório' }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Telefone (opcional)</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button type="submit">Guardar</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Todos os clientes</CardTitle>
                    <CardDescription>
                        {search
                            ? `${filteredClients.length} de ${clients.length} cliente(s) registados`
                            : `${clients.length} cliente(s) registados`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Pesquisar por nome, NUIT, email ou telefone..."
                        className="max-w-sm"
                    />
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>NUIT</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Morada</TableHead>
                                <TableHead className="text-right">Saldo</TableHead>
                                <TableHead className="w-40" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredClients.map((client) => (
                                <TableRow key={client.id}>
                                    <TableCell className="font-medium">{client.name}</TableCell>
                                    <TableCell>{client.nuit}</TableCell>
                                    <TableCell>{client.email}</TableCell>
                                    <TableCell>{client.address}</TableCell>
                                    <TableCell className="text-right">
                                        {client.credit_balance > 0 ? (
                                            <span className="font-mono text-emerald-700">
                                                {formatCurrency(client.credit_balance, company?.default_currency)}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                title="Ver extrato"
                                                onClick={() => viewStatement(client)}
                                            >
                                                <FileBarChart />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                title="Ver histórico de faturas"
                                                onClick={() => viewHistoryFor(client)}
                                            >
                                                <History />
                                            </Button>
                                            {canEdit && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        title="Nova fatura"
                                                        onClick={() => newInvoiceFor(client)}
                                                    >
                                                        <FilePlus />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        title="Nova cotação"
                                                        onClick={() => newQuotationFor(client)}
                                                    >
                                                        <FileSpreadsheet />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        title="Editar"
                                                        onClick={() => openEditDialog(client)}
                                                    >
                                                        <Pencil />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        title="Eliminar"
                                                        onClick={() => setDeletingClient(client)}
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredClients.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        {clients.length === 0
                                            ? 'Ainda não há clientes registados.'
                                            : 'Nenhum cliente corresponde à pesquisa.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={!!deletingClient} onOpenChange={(isOpen) => !isOpen && setDeletingClient(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tens a certeza que queres eliminar {deletingClient?.name}? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

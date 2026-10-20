import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { api } from '@/services/api';
import type { Client, DeliveryNote, DeliveryNoteItem, DeliveryNoteStatus, Receipt } from '@/types';
import { formatDate } from '@/lib/utils';
import { DELIVERY_NOTE_STATUS_LABELS as STATUS_LABELS } from '@/lib/status-labels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { DeliveryItemsEditor, emptyDeliveryItem } from '@/components/document/delivery-items-editor';
import { DocumentFilters, ALL_FILTER_VALUE } from '@/components/document/document-filters';
import { DatePicker } from '@/components/date-picker';

const STATUS_VARIANT: Record<DeliveryNoteStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    DRAFT: 'secondary',
    SENT: 'outline',
    DELIVERED: 'default',
    CANCELLED: 'destructive',
};

type DeliveryNoteFormValues = {
    client_id: string;
    date: string;
    reference: string;
    received_by: string;
    notes: string;
    items: DeliveryNoteItem[];
};

function today() {
    return new Date().toISOString().slice(0, 10);
}

export default function DeliveryNotes() {
    const { user, hasPermission } = useAuth();
    const canEdit = hasPermission('USER');
    const { companyId } = useCompany();
    const location = useLocation();
    const navigate = useNavigate();
    const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<DeliveryNote | null>(null);
    const [deletingNote, setDeletingNote] = useState<DeliveryNote | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState(ALL_FILTER_VALUE);
    const [clientFilter, setClientFilter] = useState(ALL_FILTER_VALUE);
    const [dateFrom, setDateFrom] = useState<string | undefined>();
    const [dateTo, setDateTo] = useState<string | undefined>();

    const form = useForm<DeliveryNoteFormValues>({
        defaultValues: {
            client_id: '',
            date: today(),
            reference: '',
            received_by: '',
            notes: '',
            items: [emptyDeliveryItem()],
        },
    });

    async function refresh() {
        if (!companyId) return;
        const [notes, cls, recs] = await Promise.all([
            api.getDeliveryNotes(companyId),
            api.getClients(companyId),
            api.getReceipts(companyId),
        ]);
        setDeliveryNotes(notes.sort((a, b) => b.created_at.localeCompare(a.created_at)));
        setClients(cls);
        setReceipts(recs);
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);

    function clientName(id: string) {
        return clients.find((c) => c.id === id)?.name ?? '—';
    }

    function receiptNumber(id?: string) {
        if (!id) return undefined;
        return receipts.find((r) => r.id === id)?.number;
    }

    const filteredNotes = useMemo(() => {
        const term = search.trim().toLowerCase();
        return deliveryNotes.filter((note) => {
            if (statusFilter !== ALL_FILTER_VALUE && note.status !== statusFilter) return false;
            if (clientFilter !== ALL_FILTER_VALUE && note.client_id !== clientFilter) return false;
            if (dateFrom && note.date.slice(0, 10) < dateFrom) return false;
            if (dateTo && note.date.slice(0, 10) > dateTo) return false;
            if (term) {
                const haystack = `${note.number} ${clientName(note.client_id)} ${note.created_by ?? ''}`.toLowerCase();
                if (!haystack.includes(term)) return false;
            }
            return true;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deliveryNotes, clients, search, statusFilter, clientFilter, dateFrom, dateTo]);

    const filtersActive =
        search !== '' ||
        statusFilter !== ALL_FILTER_VALUE ||
        clientFilter !== ALL_FILTER_VALUE ||
        !!dateFrom ||
        !!dateTo;

    function clearFilters() {
        setSearch('');
        setStatusFilter(ALL_FILTER_VALUE);
        setClientFilter(ALL_FILTER_VALUE);
        setDateFrom(undefined);
        setDateTo(undefined);
    }

    function openCreateDialog() {
        setEditingNote(null);
        form.reset({
            client_id: '',
            date: today(),
            reference: '',
            received_by: '',
            notes: '',
            items: [emptyDeliveryItem()],
        });
        setCreateOpen(true);
    }

    useEffect(() => {
        const state = location.state as { prefillClientId?: string } | null;
        if (state?.prefillClientId) {
            openCreateDialog();
            form.setValue('client_id', state.prefillClientId);
            navigate(location.pathname, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function openEditDialog(note: DeliveryNote) {
        setEditingNote(note);
        form.reset({
            client_id: note.client_id,
            date: note.date.slice(0, 10),
            reference: note.reference ?? '',
            received_by: note.received_by ?? '',
            notes: note.notes ?? '',
            items: note.items,
        });
        setCreateOpen(true);
    }

    async function onSubmit(values: DeliveryNoteFormValues) {
        if (!companyId) return;
        if (!values.client_id) {
            toast.error('Seleciona um cliente');
            return;
        }

        if (editingNote) {
            await api.updateDeliveryNote({
                ...editingNote,
                client_id: values.client_id,
                items: values.items,
                reference: values.reference || undefined,
                received_by: values.received_by || undefined,
                notes: values.notes || undefined,
            });
            toast.success('Guia de entrega atualizada com sucesso');
        } else {
            await api.createDeliveryNote({
                company_id: companyId,
                client_id: values.client_id,
                date: new Date(values.date).toISOString(),
                items: values.items,
                reference: values.reference || undefined,
                received_by: values.received_by || undefined,
                notes: values.notes || undefined,
                created_by: user?.name,
            });
            toast.success('Guia de entrega criada com sucesso');
        }

        setEditingNote(null);
        setCreateOpen(false);
        refresh();
    }

    async function handleDelete() {
        if (!deletingNote) return;
        try {
            await api.deleteDeliveryNote(deletingNote.id);
            toast.success('Guia de entrega eliminada');
            refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao eliminar guia de entrega');
        } finally {
            setDeletingNote(null);
        }
    }

    return (
        <div className="grid gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Guias de entrega</h1>
                    <p className="text-sm text-muted-foreground">
                        Documento que acompanha a mercadoria até ao cliente
                    </p>
                </div>
                {canEdit && (
                <Dialog
                    open={createOpen}
                    onOpenChange={(open) => {
                        setCreateOpen(open);
                        if (!open) setEditingNote(null);
                    }}
                >
                    <DialogTrigger render={<Button onClick={openCreateDialog}><Plus /> Nova Guia</Button>} />
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editingNote ? 'Editar guia de entrega' : 'Nova guia de entrega'}</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="client_id"
                                        rules={{ required: true }}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cliente</FormLabel>
                                                <Select
                                                    items={clients.map((client) => ({
                                                        value: client.id,
                                                        label: client.name,
                                                    }))}
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Seleciona um cliente" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {clients.map((client) => (
                                                            <SelectItem key={client.id} value={client.id}>
                                                                {client.name}
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
                                        name="date"
                                        rules={{ required: true }}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Data de emissão</FormLabel>
                                                <FormControl>
                                                    <DatePicker value={field.value} onChange={field.onChange} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <DeliveryItemsEditor />

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="reference"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Referência / Contrato (opcional)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="ex: Referente à encomenda nº 12"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="received_by"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Recebido por (opcional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Nome de quem recebeu" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Notas (opcional)</FormLabel>
                                            <FormControl>
                                                <Textarea rows={2} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <DialogFooter>
                                    <Button type="submit">
                                        {editingNote ? 'Guardar alterações' : 'Criar guia'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Todas as guias de entrega</CardTitle>
                    <CardDescription>
                        {filtersActive
                            ? `${filteredNotes.length} de ${deliveryNotes.length} guia(s)`
                            : `${deliveryNotes.length} guia(s)`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <DocumentFilters
                        search={search}
                        onSearchChange={setSearch}
                        searchPlaceholder="Pesquisar por número ou cliente..."
                        status={statusFilter}
                        onStatusChange={setStatusFilter}
                        statusOptions={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                        clientId={clientFilter}
                        onClientChange={setClientFilter}
                        clients={clients}
                        dateFrom={dateFrom}
                        onDateFromChange={setDateFrom}
                        dateTo={dateTo}
                        onDateToChange={setDateTo}
                        onClear={clearFilters}
                        active={filtersActive}
                    />
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Número</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Recibo</TableHead>
                                <TableHead>Criado por</TableHead>
                                <TableHead className="w-32" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredNotes.map((note) => (
                                <TableRow key={note.id}>
                                    <TableCell className="font-medium">{note.number}</TableCell>
                                    <TableCell>{clientName(note.client_id)}</TableCell>
                                    <TableCell>{formatDate(note.date)}</TableCell>
                                    <TableCell>
                                        <Badge variant={STATUS_VARIANT[note.status]}>
                                            {STATUS_LABELS[note.status]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {receiptNumber(note.receipt_id) ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{note.created_by ?? '—'}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            {canEdit && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        title="Editar"
                                                        onClick={() => openEditDialog(note)}
                                                    >
                                                        <Pencil />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        title="Eliminar"
                                                        onClick={() => setDeletingNote(note)}
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                title="Pré-visualizar / Imprimir"
                                                onClick={() =>
                                                    window.open(`/guias/${note.id}/imprimir`, '_blank')
                                                }
                                            >
                                                <Printer />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredNotes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                                        {deliveryNotes.length === 0
                                            ? 'Ainda não há guias de entrega criadas.'
                                            : 'Nenhuma guia corresponde aos filtros.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog
                open={!!deletingNote}
                onOpenChange={(isOpen) => !isOpen && setDeletingNote(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar guia de entrega</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tens a certeza que queres eliminar a guia {deletingNote?.number}? Esta ação
                            não pode ser desfeita.
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

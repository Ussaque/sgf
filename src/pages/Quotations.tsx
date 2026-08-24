import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRightLeft, Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { api } from '@/services/api';
import type { Client, InvoiceItem, Quotation, QuotationStatus } from '@/types';
import { computeTotals } from '@/lib/document-totals';
import { formatCurrency, formatDate } from '@/lib/utils';
import { QUOTATION_STATUS_LABELS as STATUS_LABELS } from '@/lib/status-labels';
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
import { LineItemsEditor, emptyItem } from '@/components/document/line-items-editor';
import { DatePicker } from '@/components/date-picker';

const STATUS_VARIANT: Record<QuotationStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    DRAFT: 'secondary',
    SENT: 'outline',
    ACCEPTED: 'default',
    REJECTED: 'destructive',
    EXPIRED: 'destructive',
};

type QuotationFormValues = {
    client_id: string;
    valid_until: string;
    reference: string;
    notes: string;
    items: InvoiceItem[];
};

function todayPlusDays(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

export default function Quotations() {
    const { user, hasPermission } = useAuth();
    const canEdit = hasPermission('USER');
    const { companyId, company } = useCompany();
    const navigate = useNavigate();
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [converting, setConverting] = useState<string | null>(null);
    const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
    const [deletingQuotation, setDeletingQuotation] = useState<Quotation | null>(null);

    const form = useForm<QuotationFormValues>({
        defaultValues: {
            client_id: '',
            valid_until: todayPlusDays(15),
            reference: '',
            notes: '',
            items: [emptyItem()],
        },
    });

    async function refresh() {
        if (!companyId) return;
        const [quos, cls] = await Promise.all([
            api.getQuotations(companyId),
            api.getClients(companyId),
        ]);
        setQuotations(quos.sort((a, b) => b.created_at.localeCompare(a.created_at)));
        setClients(cls);
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);

    function clientName(id: string) {
        return clients.find((c) => c.id === id)?.name ?? '—';
    }

    function openCreateDialog() {
        setEditingQuotation(null);
        form.reset({
            client_id: '',
            valid_until: todayPlusDays(company?.default_due_days ?? 15),
            reference: '',
            notes: '',
            items: [emptyItem(company?.default_tax_rate)],
        });
        setCreateOpen(true);
    }

    function openEditDialog(quotation: Quotation) {
        setEditingQuotation(quotation);
        form.reset({
            client_id: quotation.client_id,
            valid_until: quotation.valid_until.slice(0, 10),
            reference: quotation.reference ?? '',
            notes: quotation.notes ?? '',
            items: quotation.items,
        });
        setCreateOpen(true);
    }

    async function onSubmit(values: QuotationFormValues) {
        if (!companyId) return;
        if (!values.client_id) {
            toast.error('Seleciona um cliente');
            return;
        }
        const items = values.items.map((item) => ({
            ...item,
            total: item.quantity * item.unit_price * (1 + item.tax_rate / 100),
        }));
        const totals = computeTotals(items);

        if (editingQuotation) {
            await api.updateQuotation({
                ...editingQuotation,
                client_id: values.client_id,
                valid_until: new Date(values.valid_until).toISOString(),
                items,
                reference: values.reference || undefined,
                notes: values.notes || undefined,
                ...totals,
            });
            toast.success('Cotação atualizada com sucesso');
        } else {
            await api.createQuotation({
                company_id: companyId,
                client_id: values.client_id,
                date: new Date().toISOString(),
                valid_until: new Date(values.valid_until).toISOString(),
                items,
                reference: values.reference || undefined,
                notes: values.notes || undefined,
                created_by: user?.name,
                ...totals,
            });
            toast.success('Cotação criada com sucesso');
        }

        setEditingQuotation(null);
        setCreateOpen(false);
        refresh();
    }

    async function handleDelete() {
        if (!deletingQuotation) return;
        try {
            await api.deleteQuotation(deletingQuotation.id);
            toast.success('Cotação eliminada');
            refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao eliminar cotação');
        } finally {
            setDeletingQuotation(null);
        }
    }

    async function handleConvert(quotation: Quotation) {
        setConverting(quotation.id);
        try {
            const invoice = await api.convertQuotationToInvoice(quotation.id);
            toast.success(`Fatura ${invoice.number} criada a partir da cotação`);
            navigate('/faturas');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao converter cotação');
        } finally {
            setConverting(null);
        }
    }

    return (
        <div className="grid gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Cotações</h1>
                    <p className="text-sm text-muted-foreground">Propostas de orçamento para clientes</p>
                </div>
                {canEdit && (
                <Dialog
                    open={createOpen}
                    onOpenChange={(open) => {
                        setCreateOpen(open);
                        if (!open) setEditingQuotation(null);
                    }}
                >
                    <DialogTrigger render={<Button onClick={openCreateDialog}><Plus /> Nova Cotação</Button>} />
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editingQuotation ? 'Editar cotação' : 'Nova cotação'}</DialogTitle>
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
                                                <Select value={field.value} onValueChange={field.onChange}>
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
                                        name="valid_until"
                                        rules={{ required: true }}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Válido até</FormLabel>
                                                <FormControl>
                                                    <DatePicker value={field.value} onChange={field.onChange} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <LineItemsEditor />

                                <FormField
                                    control={form.control}
                                    name="reference"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Referência / Contrato (opcional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="ex: Referente ao contrato nº 05/AdRMM-DC/S/2026"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

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
                                        {editingQuotation ? 'Guardar alterações' : 'Criar cotação'}
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
                    <CardTitle>Todas as cotações</CardTitle>
                    <CardDescription>{quotations.length} cotação(ões)</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Número</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="w-44" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quotations.map((quotation) => (
                                <TableRow key={quotation.id}>
                                    <TableCell className="font-medium">{quotation.number}</TableCell>
                                    <TableCell>{clientName(quotation.client_id)}</TableCell>
                                    <TableCell>{formatDate(quotation.date)}</TableCell>
                                    <TableCell>
                                        <Badge variant={STATUS_VARIANT[quotation.status]}>
                                            {STATUS_LABELS[quotation.status]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(quotation.total)}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            {canEdit && !quotation.converted_invoice_id && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        title="Editar"
                                                        onClick={() => openEditDialog(quotation)}
                                                    >
                                                        <Pencil />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        title="Eliminar"
                                                        onClick={() => setDeletingQuotation(quotation)}
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        title="Converter em fatura"
                                                        disabled={converting === quotation.id}
                                                        onClick={() => handleConvert(quotation)}
                                                    >
                                                        <ArrowRightLeft />
                                                    </Button>
                                                </>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                title="Pré-visualizar / Imprimir"
                                                onClick={() =>
                                                    window.open(`/cotacoes/${quotation.id}/imprimir`, '_blank')
                                                }
                                            >
                                                <Printer />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {quotations.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        Ainda não há cotações criadas.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog
                open={!!deletingQuotation}
                onOpenChange={(isOpen) => !isOpen && setDeletingQuotation(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar cotação</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tens a certeza que queres eliminar a cotação {deletingQuotation?.number}? Esta ação
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

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Ban, Pencil, Plus, Printer, Receipt as ReceiptIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { api } from '@/services/api';
import type { Client, Invoice, InvoiceItem, InvoiceStatus, Receipt } from '@/types';
import { computeTotals } from '@/lib/document-totals';
import { formatCurrency, formatDate } from '@/lib/utils';
import { INVOICE_STATUS_LABELS as STATUS_LABELS } from '@/lib/status-labels';
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
import { DocumentFilters, ALL_FILTER_VALUE } from '@/components/document/document-filters';
import { DatePicker } from '@/components/date-picker';

const STATUS_VARIANT: Record<InvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    DRAFT: 'secondary',
    SENT: 'outline',
    PARTIALLY_PAID: 'outline',
    PAID: 'default',
    OVERDUE: 'destructive',
    CANCELLED: 'secondary',
};

const PAYMENT_METHODS: { value: string; label: string }[] = [
    { value: 'CASH', label: 'Dinheiro' },
    { value: 'BANK_TRANSFER', label: 'Transferência bancária' },
    { value: 'CHECK', label: 'Cheque' },
    { value: 'POS', label: 'POS / Multibanco' },
    { value: 'MOBILE_MONEY', label: 'Mobile money' },
];

type InvoiceFormValues = {
    client_id: string;
    due_date: string;
    reference: string;
    notes: string;
    items: InvoiceItem[];
};

type PaymentFormValues = {
    amount: number;
    method: string;
    reference: string;
};

function todayPlusDays(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

export default function Invoices() {
    const { user, hasPermission } = useAuth();
    const canEdit = hasPermission('USER');
    const { companyId, company } = useCompany();
    const location = useLocation();
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [cancellingInvoice, setCancellingInvoice] = useState<Invoice | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState(ALL_FILTER_VALUE);
    const [clientFilter, setClientFilter] = useState(ALL_FILTER_VALUE);
    const [dateFrom, setDateFrom] = useState<string | undefined>();
    const [dateTo, setDateTo] = useState<string | undefined>();

    const form = useForm<InvoiceFormValues>({
        defaultValues: {
            client_id: '',
            due_date: todayPlusDays(30),
            reference: '',
            notes: '',
            items: [emptyItem()],
        },
    });

    const paymentForm = useForm<PaymentFormValues>({
        defaultValues: { amount: 0, method: 'BANK_TRANSFER', reference: '' },
    });

    async function refresh() {
        if (!companyId) return;
        const [invs, cls, recs] = await Promise.all([
            api.getInvoices(companyId),
            api.getClients(companyId),
            api.getReceipts(companyId),
        ]);
        setInvoices(invs.sort((a, b) => b.created_at.localeCompare(a.created_at)));
        setClients(cls);
        setReceipts(recs);
    }

    function amountPaid(invoiceId: string) {
        return receipts
            .filter((r) => r.invoice_id === invoiceId && !r.voided)
            .reduce((sum, r) => sum + r.amount, 0);
    }

    function amountDue(invoice: Invoice) {
        return Math.max(0, invoice.total - amountPaid(invoice.id));
    }

    function openPaymentDialog(invoice: Invoice) {
        paymentForm.reset({ amount: amountDue(invoice), method: 'BANK_TRANSFER', reference: '' });
        setPaymentInvoice(invoice);
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);

    function clientName(id: string) {
        return clients.find((c) => c.id === id)?.name ?? '—';
    }

    const filteredInvoices = useMemo(() => {
        const term = search.trim().toLowerCase();
        return invoices.filter((invoice) => {
            if (statusFilter !== ALL_FILTER_VALUE && invoice.status !== statusFilter) return false;
            if (clientFilter !== ALL_FILTER_VALUE && invoice.client_id !== clientFilter) return false;
            if (dateFrom && invoice.date.slice(0, 10) < dateFrom) return false;
            if (dateTo && invoice.date.slice(0, 10) > dateTo) return false;
            if (term) {
                const haystack = `${invoice.number} ${clientName(invoice.client_id)}`.toLowerCase();
                if (!haystack.includes(term)) return false;
            }
            return true;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invoices, clients, search, statusFilter, clientFilter, dateFrom, dateTo]);

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
        setEditingInvoice(null);
        form.reset({
            client_id: '',
            due_date: todayPlusDays(company?.default_due_days ?? 30),
            reference: '',
            notes: '',
            items: [emptyItem(company?.default_tax_rate)],
        });
        setCreateOpen(true);
    }

    useEffect(() => {
        const state = location.state as { prefillClientId?: string; filterClientId?: string } | null;
        if (state?.prefillClientId) {
            openCreateDialog();
            form.setValue('client_id', state.prefillClientId);
        }
        if (state?.filterClientId) {
            setClientFilter(state.filterClientId);
        }
        if (state?.prefillClientId || state?.filterClientId) {
            navigate(location.pathname, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function openEditDialog(invoice: Invoice) {
        setEditingInvoice(invoice);
        form.reset({
            client_id: invoice.client_id,
            due_date: invoice.due_date.slice(0, 10),
            reference: invoice.reference ?? '',
            notes: invoice.notes ?? '',
            items: invoice.items,
        });
        setCreateOpen(true);
    }

    async function onSubmit(values: InvoiceFormValues) {
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

        if (editingInvoice) {
            await api.updateInvoice({
                ...editingInvoice,
                client_id: values.client_id,
                due_date: new Date(values.due_date).toISOString(),
                items,
                reference: values.reference || undefined,
                notes: values.notes || undefined,
                ...totals,
            });
            toast.success('Fatura atualizada com sucesso');
        } else {
            await api.createInvoice({
                company_id: companyId,
                client_id: values.client_id,
                date: new Date().toISOString(),
                due_date: new Date(values.due_date).toISOString(),
                status: 'SENT',
                items,
                reference: values.reference || undefined,
                notes: values.notes || undefined,
                created_by: user?.name,
                ...totals,
            });
            toast.success('Fatura criada com sucesso');
        }

        setEditingInvoice(null);
        setCreateOpen(false);
        refresh();
    }

    async function handleCancel() {
        if (!cancellingInvoice) return;
        await api.updateInvoice({
            ...cancellingInvoice,
            status: 'CANCELLED',
        });
        toast.success('Fatura cancelada');
        setCancellingInvoice(null);
        refresh();
    }

    async function onSubmitPayment(values: PaymentFormValues) {
        if (!companyId || !paymentInvoice) return;
        if (!values.amount || values.amount <= 0) {
            toast.error('Indica um valor válido');
            return;
        }
        await api.createReceipt({
            company_id: companyId,
            invoice_id: paymentInvoice.id,
            date: new Date().toISOString(),
            amount: values.amount,
            method: values.method as Receipt['method'],
            reference: values.reference || undefined,
        });

        const due = amountDue(paymentInvoice);
        if (values.amount > due + 0.01) {
            toast.success(
                `Pagamento registado. Excedente de ${formatCurrency(values.amount - due)} creditado ao cliente.`
            );
        } else {
            toast.success('Pagamento registado e recibo emitido');
        }
        paymentForm.reset({ amount: 0, method: 'BANK_TRANSFER', reference: '' });
        setPaymentInvoice(null);
        refresh();
    }

    return (
        <div className="grid gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Faturas</h1>
                    <p className="text-sm text-muted-foreground">Gestão de faturas emitidas</p>
                </div>
                {canEdit && (
                <Dialog
                    open={createOpen}
                    onOpenChange={(open) => {
                        setCreateOpen(open);
                        if (!open) setEditingInvoice(null);
                    }}
                >
                    <DialogTrigger render={<Button onClick={openCreateDialog}><Plus /> Nova Fatura</Button>} />
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editingInvoice ? 'Editar fatura' : 'Nova fatura'}</DialogTitle>
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
                                        name="due_date"
                                        rules={{ required: true }}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Vencimento</FormLabel>
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
                                        {editingInvoice ? 'Guardar alterações' : 'Criar fatura'}
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
                    <CardTitle>Todas as faturas</CardTitle>
                    <CardDescription>
                        {filtersActive
                            ? `${filteredInvoices.length} de ${invoices.length} fatura(s)`
                            : `${invoices.length} fatura(s)`}
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
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="w-44" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredInvoices.map((invoice) => (
                                <TableRow key={invoice.id}>
                                    <TableCell className="font-medium">{invoice.number}</TableCell>
                                    <TableCell>{clientName(invoice.client_id)}</TableCell>
                                    <TableCell>{formatDate(invoice.date)}</TableCell>
                                    <TableCell>
                                        <Badge variant={STATUS_VARIANT[invoice.status]}>
                                            {STATUS_LABELS[invoice.status]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            {canEdit && (invoice.status === 'DRAFT' || invoice.status === 'SENT') && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="Editar"
                                                    onClick={() => openEditDialog(invoice)}
                                                >
                                                    <Pencil />
                                                </Button>
                                            )}
                                            {canEdit && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="Registar pagamento"
                                                    onClick={() => openPaymentDialog(invoice)}
                                                >
                                                    <ReceiptIcon />
                                                </Button>
                                            )}
                                            {canEdit && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="Cancelar fatura"
                                                    onClick={() => setCancellingInvoice(invoice)}
                                                >
                                                    <Ban />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                title="Pré-visualizar / Imprimir"
                                                onClick={() =>
                                                    window.open(`/faturas/${invoice.id}/imprimir`, '_blank')
                                                }
                                            >
                                                <Printer />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredInvoices.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        {invoices.length === 0
                                            ? 'Ainda não há faturas emitidas.'
                                            : 'Nenhuma fatura corresponde aos filtros.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={!!paymentInvoice} onOpenChange={(open) => !open && setPaymentInvoice(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Registar pagamento</DialogTitle>
                    </DialogHeader>
                    {paymentInvoice && (
                        <div className="text-sm text-muted-foreground">
                            <p>
                                {paymentInvoice.number} — Total {formatCurrency(paymentInvoice.total)}
                            </p>
                            {amountPaid(paymentInvoice.id) > 0 && (
                                <p>
                                    Já recebido {formatCurrency(amountPaid(paymentInvoice.id))} · Em falta{' '}
                                    {formatCurrency(amountDue(paymentInvoice))}
                                </p>
                            )}
                        </div>
                    )}
                    <Form {...paymentForm}>
                        <form onSubmit={paymentForm.handleSubmit(onSubmitPayment)} className="grid gap-4">
                            <FormField
                                control={paymentForm.control}
                                name="amount"
                                rules={{ required: true, min: 0.01 }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Valor recebido</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                {...field}
                                                onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                            />
                                        </FormControl>
                                        {paymentInvoice &&
                                            paymentForm.watch('amount') > amountDue(paymentInvoice) + 0.01 && (
                                                <p className="text-xs text-amber-600">
                                                    Excedente de{' '}
                                                    {formatCurrency(
                                                        paymentForm.watch('amount') - amountDue(paymentInvoice)
                                                    )}{' '}
                                                    fica como saldo a favor do cliente.
                                                </p>
                                            )}
                                        {paymentInvoice &&
                                            paymentForm.watch('amount') > 0 &&
                                            paymentForm.watch('amount') < amountDue(paymentInvoice) - 0.01 && (
                                                <p className="text-xs text-muted-foreground">
                                                    Pagamento parcial — a fatura fica "Parcialmente paga".
                                                </p>
                                            )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={paymentForm.control}
                                name="method"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Método de pagamento</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {PAYMENT_METHODS.map((method) => (
                                                    <SelectItem key={method.value} value={method.value}>
                                                        {method.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={paymentForm.control}
                                name="reference"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Referência (opcional)</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="submit">Confirmar pagamento</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={!!cancellingInvoice}
                onOpenChange={(isOpen) => !isOpen && setCancellingInvoice(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar fatura</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tens a certeza que queres cancelar a fatura {cancellingInvoice?.number}? O número
                            mantém-se na sequência, mas a fatura passa a estado Cancelada.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancel}>Cancelar fatura</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Ban, Plus, Printer } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { api } from '@/services/api';
import type { Invoice, Receipt } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const METHOD_LABELS: Record<string, string> = {
    CASH: 'Dinheiro',
    BANK_TRANSFER: 'Transferência bancária',
    CHECK: 'Cheque',
    POS: 'POS / Multibanco',
    MOBILE_MONEY: 'Mobile money',
};

const PAYMENT_METHODS: { value: string; label: string }[] = [
    { value: 'CASH', label: 'Dinheiro' },
    { value: 'BANK_TRANSFER', label: 'Transferência bancária' },
    { value: 'CHECK', label: 'Cheque' },
    { value: 'POS', label: 'POS / Multibanco' },
    { value: 'MOBILE_MONEY', label: 'Mobile money' },
];

type ReceiptFormValues = {
    invoice_id: string;
    method: string;
    reference: string;
};

export default function Receipts() {
    const { hasPermission } = useAuth();
    const canEdit = hasPermission('USER');
    const { companyId } = useCompany();
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [voidingReceipt, setVoidingReceipt] = useState<Receipt | null>(null);

    const form = useForm<ReceiptFormValues>({
        defaultValues: { invoice_id: '', method: 'BANK_TRANSFER', reference: '' },
    });

    async function refresh() {
        if (!companyId) return;
        const [recs, invs] = await Promise.all([
            api.getReceipts(companyId),
            api.getInvoices(companyId),
        ]);
        setReceipts(recs.sort((a, b) => b.created_at.localeCompare(a.created_at)));
        setInvoices(invs);
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);

    function invoiceNumber(id: string) {
        return invoices.find((i) => i.id === id)?.number ?? '—';
    }

    const payableInvoices = invoices.filter(
        (invoice) => invoice.status === 'SENT' || invoice.status === 'OVERDUE'
    );

    async function onSubmit(values: ReceiptFormValues) {
        if (!companyId) return;
        if (!values.invoice_id) {
            toast.error('Seleciona uma fatura');
            return;
        }
        const invoice = invoices.find((i) => i.id === values.invoice_id);
        if (!invoice) return;

        await api.createReceipt({
            company_id: companyId,
            invoice_id: invoice.id,
            date: new Date().toISOString(),
            amount: invoice.total,
            method: values.method as Receipt['method'],
            reference: values.reference || undefined,
        });

        toast.success('Recibo emitido com sucesso');
        form.reset({ invoice_id: '', method: 'BANK_TRANSFER', reference: '' });
        setCreateOpen(false);
        refresh();
    }

    async function handleVoid() {
        if (!voidingReceipt) return;
        try {
            await api.voidReceipt(voidingReceipt.id);
            toast.success('Recibo anulado — a fatura voltou a estado não paga');
            refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao anular recibo');
        } finally {
            setVoidingReceipt(null);
        }
    }

    return (
        <div className="grid gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Recibos</h1>
                    <p className="text-sm text-muted-foreground">
                        Recibos emitidos a partir de pagamentos de faturas
                    </p>
                </div>
                {canEdit && (
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger
                        render={
                            <Button disabled={payableInvoices.length === 0}>
                                <Plus /> Novo Recibo
                            </Button>
                        }
                    />
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Novo recibo</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                                <FormField
                                    control={form.control}
                                    name="invoice_id"
                                    rules={{ required: true }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fatura</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Seleciona uma fatura em aberto" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {payableInvoices.map((invoice) => (
                                                        <SelectItem key={invoice.id} value={invoice.id}>
                                                            {invoice.number} — {formatCurrency(invoice.total)}
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
                                    control={form.control}
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
                                    <Button type="submit">Emitir recibo</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Todos os recibos</CardTitle>
                    <CardDescription>{receipts.length} recibo(s)</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Número</TableHead>
                                <TableHead>Fatura</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Método</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead className="w-24" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {receipts.map((receipt) => (
                                <TableRow key={receipt.id}>
                                    <TableCell className="font-medium">{receipt.number}</TableCell>
                                    <TableCell>{invoiceNumber(receipt.invoice_id)}</TableCell>
                                    <TableCell>{formatDate(receipt.date)}</TableCell>
                                    <TableCell>{METHOD_LABELS[receipt.method] ?? receipt.method}</TableCell>
                                    <TableCell>
                                        <Badge variant={receipt.voided ? 'destructive' : 'default'}>
                                            {receipt.voided ? 'Anulado' : 'Emitido'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(receipt.amount)}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            {canEdit && !receipt.voided && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="Anular recibo"
                                                    onClick={() => setVoidingReceipt(receipt)}
                                                >
                                                    <Ban />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                title="Pré-visualizar / Imprimir"
                                                onClick={() =>
                                                    window.open(`/recibos/${receipt.id}/imprimir`, '_blank')
                                                }
                                            >
                                                <Printer />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {receipts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                                        Ainda não há recibos emitidos.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={!!voidingReceipt} onOpenChange={(isOpen) => !isOpen && setVoidingReceipt(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Anular recibo</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tens a certeza que queres anular o recibo {voidingReceipt?.number}? A fatura associada
                            volta a estado não paga.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleVoid}>Anular recibo</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

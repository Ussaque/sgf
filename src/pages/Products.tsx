import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { api } from '@/services/api';
import type { Product } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

const UNIT_SUGGESTIONS = ['Hora', 'Turno 12h', 'Turno 24h', 'Dia', 'Semana', 'Mês', 'Unidade'];

type ProductFormValues = {
    name: string;
    description: string;
    unit: string;
    unit_price: number;
    tax_rate: string; // empty = use company default
};

const EMPTY_FORM: ProductFormValues = {
    name: '',
    description: '',
    unit: '',
    unit_price: 0,
    tax_rate: '',
};

export default function Products() {
    const { hasPermission } = useAuth();
    const canEdit = hasPermission('USER');
    const { companyId } = useCompany();
    const [products, setProducts] = useState<Product[]>([]);
    const [open, setOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
    const [search, setSearch] = useState('');

    const form = useForm<ProductFormValues>({ defaultValues: EMPTY_FORM });

    async function refresh() {
        if (!companyId) return;
        setProducts(await api.getProducts(companyId));
    }

    const filteredProducts = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return products;
        return products.filter((product) =>
            `${product.name} ${product.description ?? ''} ${product.unit}`.toLowerCase().includes(term)
        );
    }, [products, search]);

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);

    function openCreateDialog() {
        setEditingProduct(null);
        form.reset(EMPTY_FORM);
        setOpen(true);
    }

    function openEditDialog(product: Product) {
        setEditingProduct(product);
        form.reset({
            name: product.name,
            description: product.description ?? '',
            unit: product.unit,
            unit_price: product.unit_price,
            tax_rate: product.tax_rate !== undefined ? String(product.tax_rate) : '',
        });
        setOpen(true);
    }

    async function onSubmit(values: ProductFormValues) {
        if (!companyId) return;

        const taxRate = values.tax_rate.trim() === '' ? undefined : Number(values.tax_rate);

        if (editingProduct) {
            await api.updateProduct({
                ...editingProduct,
                name: values.name,
                description: values.description || undefined,
                unit: values.unit,
                unit_price: values.unit_price,
                tax_rate: taxRate,
            });
            toast.success('Produto/serviço atualizado com sucesso');
        } else {
            await api.createProduct({
                id: crypto.randomUUID(),
                company_id: companyId,
                name: values.name,
                description: values.description || undefined,
                unit: values.unit,
                unit_price: values.unit_price,
                tax_rate: taxRate,
            });
            toast.success('Produto/serviço criado com sucesso');
        }

        form.reset(EMPTY_FORM);
        setEditingProduct(null);
        setOpen(false);
        refresh();
    }

    async function handleDelete() {
        if (!deletingProduct) return;
        await api.deleteProduct(deletingProduct.id);
        toast.success('Produto/serviço eliminado');
        setDeletingProduct(null);
        refresh();
    }

    return (
        <div className="grid gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Produtos & Serviços</h1>
                    <p className="text-sm text-muted-foreground">
                        Catálogo para adicionar rapidamente linhas às faturas e cotações
                    </p>
                </div>
                {canEdit && (
                <Dialog
                    open={open}
                    onOpenChange={(isOpen) => {
                        setOpen(isOpen);
                        if (!isOpen) setEditingProduct(null);
                    }}
                >
                    <DialogTrigger render={<Button onClick={openCreateDialog}><Plus /> Novo Item</Button>} />
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {editingProduct ? 'Editar produto/serviço' : 'Novo produto/serviço'}
                            </DialogTitle>
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
                                                <Input placeholder="ex: Vigilância" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Descrição (opcional)</FormLabel>
                                            <FormControl>
                                                <Textarea rows={2} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="unit"
                                        rules={{ required: 'Obrigatório' }}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Unidade</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        list="unit-suggestions"
                                                        placeholder="ex: Turno 24h"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="unit_price"
                                        rules={{ required: true, min: 0 }}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Preço unitário</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
                                                        {...field}
                                                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="tax_rate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>IVA % (opcional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    placeholder="usa o padrão da empresa"
                                                    {...field}
                                                />
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

            <datalist id="unit-suggestions">
                {UNIT_SUGGESTIONS.map((unit) => (
                    <option key={unit} value={unit} />
                ))}
            </datalist>

            <Card>
                <CardHeader>
                    <CardTitle>Todos os itens</CardTitle>
                    <CardDescription>
                        {search
                            ? `${filteredProducts.length} de ${products.length} item(ns) no catálogo`
                            : `${products.length} item(ns) no catálogo`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Pesquisar por nome, descrição ou unidade..."
                        className="max-w-sm"
                    />
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Unidade</TableHead>
                                <TableHead>IVA</TableHead>
                                <TableHead className="text-right">Preço unitário</TableHead>
                                {canEdit && <TableHead className="w-20" />}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProducts.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell className="font-medium">
                                        {product.name}
                                        {product.description && (
                                            <p className="text-xs font-normal text-muted-foreground">
                                                {product.description}
                                            </p>
                                        )}
                                    </TableCell>
                                    <TableCell>{product.unit}</TableCell>
                                    <TableCell>
                                        {product.tax_rate !== undefined ? `${product.tax_rate}%` : 'Padrão'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {formatCurrency(product.unit_price)}
                                    </TableCell>
                                    {canEdit && (
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="Editar"
                                                    onClick={() => openEditDialog(product)}
                                                >
                                                    <Pencil />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="Eliminar"
                                                    onClick={() => setDeletingProduct(product)}
                                                >
                                                    <Trash2 />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                            {filteredProducts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        {products.length === 0
                                            ? 'Ainda não há produtos ou serviços no catálogo.'
                                            : 'Nenhum item corresponde à pesquisa.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog
                open={!!deletingProduct}
                onOpenChange={(isOpen) => !isOpen && setDeletingProduct(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar item</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tens a certeza que queres eliminar {deletingProduct?.name}? Isto não afeta faturas ou
                            cotações já criadas.
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

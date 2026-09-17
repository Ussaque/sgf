import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Percent, Plus, Search, Trash2 } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { api } from '@/services/api';
import type { InvoiceItem, Product } from '@/types';
import { computeTotals } from '@/lib/document-totals';
import { formatCurrency } from '@/lib/utils';
import { generateId } from '@/lib/uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type ItemsFormValues = { items: InvoiceItem[] };

function emptyItem(taxRate = 16): InvoiceItem {
    return {
        id: generateId(),
        description: '',
        quantity: 1,
        unit_price: 0,
        tax_rate: taxRate,
        total: 0,
    };
}

function itemFromProduct(product: Product, taxRate: number): InvoiceItem {
    return {
        id: generateId(),
        description: `${product.name} (${product.unit})`,
        quantity: 1,
        unit_price: product.unit_price,
        tax_rate: taxRate,
        total: 0,
    };
}

function ProductPicker({
    products,
    onSelect,
    currency,
}: {
    products: Product[];
    onSelect: (product: Product) => void;
    currency?: string;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return products;
        return products.filter((product) =>
            `${product.name} ${product.description ?? ''} ${product.unit}`.toLowerCase().includes(term)
        );
    }, [products, search]);

    return (
        <Popover
            open={open}
            onOpenChange={(isOpen) => {
                setOpen(isOpen);
                if (!isOpen) setSearch('');
            }}
        >
            <PopoverTrigger
                render={
                    <Button type="button" variant="outline" size="sm">
                        <Plus /> Adicionar do catálogo...
                    </Button>
                }
            />
            <PopoverContent className="w-72 p-0" align="start">
                <div className="flex items-center gap-2 border-b px-2.5 py-2">
                    <Search className="size-4 shrink-0 text-muted-foreground" />
                    <Input
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Pesquisar produto ou serviço..."
                        className="h-7 border-0 px-0 shadow-none focus-visible:ring-0"
                    />
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                    {filtered.map((product) => (
                        <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                                onSelect(product);
                                setOpen(false);
                                setSearch('');
                            }}
                            className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                        >
                            <span className="font-medium">{product.name}</span>
                            <span className="text-xs text-muted-foreground">
                                {product.unit} — {formatCurrency(product.unit_price, currency)}
                            </span>
                        </button>
                    ))}
                    {filtered.length === 0 && (
                        <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                            Nenhum item encontrado.
                        </p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function LineItemsEditor() {
    const { control, register, setValue } = useFormContext<ItemsFormValues>();
    const { fields, append, remove } = useFieldArray({ control, name: 'items' });
    const items = useWatch({ control, name: 'items' }) ?? [];
    const totals = computeTotals(items);

    const { companyId, company } = useCompany();
    const defaultTaxRate = company?.default_tax_rate ?? 16;
    const [products, setProducts] = useState<Product[]>([]);
    const [taxEnabled, setTaxEnabled] = useState(() => items.some((item) => item.tax_rate > 0));

    useEffect(() => {
        if (!companyId) return;
        api.getProducts(companyId).then(setProducts);
    }, [companyId]);

    function applyTaxToggle(enabled: boolean) {
        setTaxEnabled(enabled);
        fields.forEach((_, index) => {
            setValue(`items.${index}.tax_rate`, enabled ? defaultTaxRate : 0);
        });
    }

    return (
        <div className="grid gap-2">
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant={taxEnabled ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => applyTaxToggle(!taxEnabled)}
                >
                    <Percent />
                    {taxEnabled ? `Com IVA (${defaultTaxRate}%)` : 'Sem IVA'}
                </Button>
                <span className="text-xs text-muted-foreground">
                    Aplica-se a todos os itens da lista abaixo
                </span>
            </div>
            <div className="overflow-x-auto rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="w-20">Qtd.</TableHead>
                            <TableHead className="w-28">Preço unit.</TableHead>
                            <TableHead className="w-28 text-right">Total</TableHead>
                            <TableHead className="w-10" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((field, index) => {
                            const item = items[index];
                            const lineTotal = item
                                ? item.quantity * item.unit_price * (1 + item.tax_rate / 100)
                                : 0;
                            return (
                                <TableRow key={field.id}>
                                    <TableCell>
                                        <Input
                                            {...register(`items.${index}.description`, { required: true })}
                                            placeholder="Descrição do item"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            min={0}
                                            step="1"
                                            {...register(`items.${index}.quantity`, {
                                                valueAsNumber: true,
                                                min: 0,
                                            })}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            {...register(`items.${index}.unit_price`, {
                                                valueAsNumber: true,
                                                min: 0,
                                            })}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {formatCurrency(lineTotal, company?.default_currency)}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => remove(index)}
                                            disabled={fields.length === 1}
                                        >
                                            <Trash2 />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={3}>Subtotal</TableCell>
                            <TableCell colSpan={2} className="text-right">
                                {formatCurrency(totals.subtotal, company?.default_currency)}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={3}>IVA</TableCell>
                            <TableCell colSpan={2} className="text-right">
                                {formatCurrency(totals.tax_total, company?.default_currency)}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={3} className="font-medium">
                                Total
                            </TableCell>
                            <TableCell colSpan={2} className="text-right font-medium">
                                {formatCurrency(totals.total, company?.default_currency)}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append(emptyItem(taxEnabled ? defaultTaxRate : 0))}
                >
                    <Plus /> Adicionar linha
                </Button>
                {products.length > 0 && (
                    <ProductPicker
                        products={products}
                        onSelect={(product) =>
                            append(
                                itemFromProduct(
                                    product,
                                    taxEnabled ? (product.tax_rate ?? defaultTaxRate) : 0
                                )
                            )
                        }
                        currency={company?.default_currency}
                    />
                )}
            </div>
        </div>
    );
}

export { emptyItem };

import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { api } from '@/services/api';
import type { BankAccount, Company } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/theme-toggle';
import { CompanyProfileForm } from '@/components/company-profile-form';
import { BankAccountsEditor } from '@/components/bank-accounts-editor';
import { COLOR_THEMES } from '@/lib/color-themes';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const CURRENCIES = ['MZN', 'USD', 'ZAR', 'EUR'];

function previewNumber(prefix: string, sequence: number) {
    const year = new Date().getFullYear();
    return `${prefix}-${year}-${String(sequence).padStart(3, '0')}`;
}

type BillingFormValues = {
    default_tax_rate: number;
    default_due_days: number;
    default_currency: string;
    invoice_prefix: string;
    quotation_prefix: string;
    receipt_prefix: string;
    current_invoice_sequence: number;
    current_receipt_sequence: number;
    current_quotation_sequence: number;
    bank_accounts: BankAccount[];
    mpesa_number: string;
    emola_number: string;
    payment_notes: string;
};

function CompanyTab({ company }: { company: Company }) {
    const { refreshCompanies } = useCompany();
    return (
        <Card>
            <CardHeader>
                <CardTitle>Perfil da empresa</CardTitle>
                <CardDescription>
                    Estes dados aparecem no cabeçalho das faturas, recibos e cotações
                </CardDescription>
            </CardHeader>
            <CardContent>
                <CompanyProfileForm company={company} onSaved={refreshCompanies} />
            </CardContent>
        </Card>
    );
}

function BillingTab({ company }: { company: Company }) {
    const { refreshCompanies } = useCompany();
    const form = useForm<BillingFormValues>({
        defaultValues: {
            default_tax_rate: company.default_tax_rate ?? 16,
            default_due_days: company.default_due_days ?? 30,
            default_currency: company.default_currency,
            invoice_prefix: company.invoice_prefix,
            quotation_prefix: company.quotation_prefix,
            receipt_prefix: company.receipt_prefix,
            current_invoice_sequence: company.current_invoice_sequence,
            current_receipt_sequence: company.current_receipt_sequence,
            current_quotation_sequence: company.current_quotation_sequence,
            bank_accounts: company.bank_accounts ?? [],
            mpesa_number: company.mpesa_number ?? '',
            emola_number: company.emola_number ?? '',
            payment_notes: company.payment_notes ?? '',
        },
    });

    const values = form.watch();

    async function onSubmit(formValues: BillingFormValues) {
        await api.updateCompany({
            ...company,
            default_tax_rate: formValues.default_tax_rate,
            default_due_days: formValues.default_due_days,
            default_currency: formValues.default_currency,
            invoice_prefix: formValues.invoice_prefix,
            quotation_prefix: formValues.quotation_prefix,
            receipt_prefix: formValues.receipt_prefix,
            current_invoice_sequence: formValues.current_invoice_sequence,
            current_receipt_sequence: formValues.current_receipt_sequence,
            current_quotation_sequence: formValues.current_quotation_sequence,
            bank_accounts: formValues.bank_accounts.filter((a) => a.bank_name || a.account_number),
            mpesa_number: formValues.mpesa_number || undefined,
            emola_number: formValues.emola_number || undefined,
            payment_notes: formValues.payment_notes || undefined,
        });
        toast.success('Definições de faturação atualizadas');
        refreshCompanies();
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Faturação</CardTitle>
                <CardDescription>
                    Valores por omissão para novas faturas e cotações
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <FormField
                                control={form.control}
                                name="default_tax_rate"
                                rules={{ required: true, min: 0, max: 100 }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>IVA padrão (%)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={100}
                                                {...field}
                                                onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="default_due_days"
                                rules={{ required: true, min: 0 }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Prazo de vencimento padrão (dias)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={0}
                                                {...field}
                                                onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="default_currency"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Moeda</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {CURRENCIES.map((currency) => (
                                                    <SelectItem key={currency} value={currency}>
                                                        {currency}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Separator />

                        <div className="grid gap-1">
                            <h3 className="text-sm font-medium">Numeração de documentos</h3>
                            <p className="text-xs text-muted-foreground">
                                Prefixo e próximo número de cada tipo de documento
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="grid gap-2">
                                <FormField
                                    control={form.control}
                                    name="invoice_prefix"
                                    rules={{ required: true }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Prefixo das faturas</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="current_invoice_sequence"
                                    rules={{ required: true, min: 1 }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Próxima fatura</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    {...field}
                                                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                                />
                                            </FormControl>
                                            <p className="text-xs text-muted-foreground">
                                                {previewNumber(
                                                    values.invoice_prefix || 'FAT',
                                                    values.current_invoice_sequence || 1
                                                )}
                                            </p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid gap-2">
                                <FormField
                                    control={form.control}
                                    name="quotation_prefix"
                                    rules={{ required: true }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Prefixo das cotações</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="current_quotation_sequence"
                                    rules={{ required: true, min: 1 }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Próxima cotação</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    {...field}
                                                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                                />
                                            </FormControl>
                                            <p className="text-xs text-muted-foreground">
                                                {previewNumber(
                                                    values.quotation_prefix || 'COT',
                                                    values.current_quotation_sequence || 1
                                                )}
                                            </p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid gap-2">
                                <FormField
                                    control={form.control}
                                    name="receipt_prefix"
                                    rules={{ required: true }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Prefixo dos recibos</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="current_receipt_sequence"
                                    rules={{ required: true, min: 1 }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Próximo recibo</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    {...field}
                                                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                                />
                                            </FormControl>
                                            <p className="text-xs text-muted-foreground">
                                                {previewNumber(
                                                    values.receipt_prefix || 'REC',
                                                    values.current_receipt_sequence || 1
                                                )}
                                            </p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <Separator />

                        <div className="grid gap-1">
                            <h3 className="text-sm font-medium">Dados de pagamento</h3>
                            <p className="text-xs text-muted-foreground">
                                Aparecem no rodapé das faturas e cotações, para o cliente saber como pagar
                            </p>
                        </div>

                        <BankAccountsEditor />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="mpesa_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>M-Pesa (opcional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="84/85 xxx xxxx" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="emola_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>E-Mola (opcional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="86/87 xxx xxxx" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="payment_notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Outras instruções de pagamento (opcional)</FormLabel>
                                    <FormControl>
                                        <Textarea rows={2} placeholder="ex: PayPal, outro método..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div>
                            <Button type="submit">Guardar alterações</Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

function AppearanceTab({ company, canManageCompany }: { company?: Company; canManageCompany: boolean }) {
    const { refreshCompanies } = useCompany();

    async function selectColorTheme(themeId: string | null) {
        if (!company) return;
        await api.updateCompany({ ...company, color_theme: themeId });
        toast.success('Tema da aplicação atualizado');
        refreshCompanies();
    }

    return (
        <div className="grid gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Modo</CardTitle>
                    <CardDescription>Escolhe como a aplicação se apresenta no teu dispositivo</CardDescription>
                </CardHeader>
                <CardContent>
                    <ThemeToggle />
                </CardContent>
            </Card>

            {canManageCompany && company && (
                <Card>
                    <CardHeader>
                        <CardTitle>Cor do tema</CardTitle>
                        <CardDescription>
                            Aplica-se a toda a aplicação para todos os utilizadores desta empresa
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => selectColorTheme(null)}
                                className={cn(
                                    'flex flex-col items-center gap-1.5 rounded-lg border p-2 text-xs',
                                    !company.color_theme && 'border-primary ring-2 ring-primary/30'
                                )}
                            >
                                <span className="flex size-8 items-center justify-center rounded-full border bg-neutral-800 text-white">
                                    {!company.color_theme && <Check className="size-4" />}
                                </span>
                                Padrão
                            </button>
                            {COLOR_THEMES.map((themeOption) => (
                                <button
                                    key={themeOption.id}
                                    type="button"
                                    onClick={() => selectColorTheme(themeOption.id)}
                                    className={cn(
                                        'flex flex-col items-center gap-1.5 rounded-lg border p-2 text-xs',
                                        company.color_theme === themeOption.id &&
                                            'border-primary ring-2 ring-primary/30'
                                    )}
                                >
                                    <span
                                        className="flex size-8 items-center justify-center rounded-full text-white"
                                        style={{ backgroundColor: themeOption.swatch }}
                                    >
                                        {company.color_theme === themeOption.id && <Check className="size-4" />}
                                    </span>
                                    {themeOption.label}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default function Settings() {
    const { hasPermission } = useAuth();
    const { company } = useCompany();
    const canManageCompany = hasPermission('ADMIN');

    return (
        <div className="grid gap-4">
            <div>
                <h1 className="text-2xl font-semibold">Definições</h1>
                <p className="text-sm text-muted-foreground">
                    Configurações da empresa e da aplicação
                </p>
            </div>

            <Tabs defaultValue={canManageCompany ? 'empresa' : 'aparencia'}>
                <TabsList>
                    {canManageCompany && <TabsTrigger value="empresa">Empresa</TabsTrigger>}
                    {canManageCompany && <TabsTrigger value="faturacao">Faturação</TabsTrigger>}
                    <TabsTrigger value="aparencia">Aparência</TabsTrigger>
                </TabsList>

                {canManageCompany && company && (
                    <TabsContent value="empresa">
                        <CompanyTab key={company.id} company={company} />
                    </TabsContent>
                )}
                {canManageCompany && company && (
                    <TabsContent value="faturacao">
                        <BillingTab key={company.id} company={company} />
                    </TabsContent>
                )}
                <TabsContent value="aparencia">
                    <AppearanceTab company={company} canManageCompany={canManageCompany} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

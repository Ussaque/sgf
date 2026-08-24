import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { api } from '@/services/api';
import type { Company } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';

type CompanyProfileFormValues = {
    name: string;
    nuit: string;
    address: string;
    email: string;
    phone: string;
    logo_url: string;
    brand_color: string;
};

const EMPTY_VALUES: CompanyProfileFormValues = {
    name: '',
    nuit: '',
    address: '',
    email: '',
    phone: '',
    logo_url: '',
    brand_color: '#0f172a',
};

interface CompanyProfileFormProps {
    company?: Company;
    organizationId?: string;
    onSaved?: (company: Company) => void;
}

export function CompanyProfileForm({ company, organizationId, onSaved }: CompanyProfileFormProps) {
    const form = useForm<CompanyProfileFormValues>({
        defaultValues: company
            ? {
                  name: company.name,
                  nuit: company.nuit,
                  address: company.address,
                  email: company.email,
                  phone: company.phone ?? '',
                  logo_url: company.logo_url ?? '',
                  brand_color: company.brand_color ?? '#0f172a',
              }
            : EMPTY_VALUES,
    });

    const brandColor = form.watch('brand_color');
    const logoUrl = form.watch('logo_url');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        setUploading(true);
        try {
            const { url } = await api.uploadLogo(file);
            form.setValue('logo_url', url, { shouldDirty: true });
            toast.success('Logótipo carregado');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao carregar o logótipo');
        } finally {
            setUploading(false);
        }
    }

    async function onSubmit(values: CompanyProfileFormValues) {
        const payload = {
            name: values.name,
            nuit: values.nuit,
            address: values.address,
            email: values.email,
            phone: values.phone || undefined,
            logo_url: values.logo_url || undefined,
            brand_color: values.brand_color || undefined,
        };

        if (company) {
            const updated = await api.updateCompany({ ...company, ...payload });
            toast.success('Dados da empresa atualizados');
            onSaved?.(updated);
        } else {
            if (!organizationId) return;
            const created = await api.createCompany({ organization_id: organizationId, ...payload });
            toast.success('Empresa criada com sucesso');
            form.reset(EMPTY_VALUES);
            onSaved?.(created);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="name"
                        rules={{ required: true }}
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
                        rules={{ required: true }}
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
                </div>
                <FormField
                    control={form.control}
                    name="address"
                    rules={{ required: true }}
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
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="email"
                        rules={{ required: true }}
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
                </div>
                <FormField
                    control={form.control}
                    name="logo_url"
                    render={() => (
                        <FormItem>
                            <FormLabel>Logótipo (opcional)</FormLabel>
                            <FormControl>
                                <div className="flex items-center gap-3">
                                    {logoUrl && (
                                        <img
                                            src={logoUrl}
                                            alt="Logótipo"
                                            className="size-12 shrink-0 rounded-md border object-contain"
                                        />
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleLogoSelect}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={uploading}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload />
                                        {uploading
                                            ? 'A carregar...'
                                            : logoUrl
                                              ? 'Trocar imagem'
                                              : 'Carregar imagem'}
                                    </Button>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="brand_color"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Cor de marca</FormLabel>
                            <FormControl>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={brandColor || '#0f172a'}
                                        onChange={(e) => field.onChange(e.target.value)}
                                        className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
                                    />
                                    <Input {...field} className="max-w-32" />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div>
                    <Button type="submit">{company ? 'Guardar alterações' : 'Criar empresa'}</Button>
                </div>
            </form>
        </Form>
    );
}

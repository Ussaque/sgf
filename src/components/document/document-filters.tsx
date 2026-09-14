import { X } from 'lucide-react';
import type { Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/date-picker';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const ALL = 'ALL';

interface DocumentFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    status: string;
    onStatusChange: (value: string) => void;
    statusOptions: { value: string; label: string }[];
    clientId?: string;
    onClientChange?: (value: string) => void;
    clients?: Client[];
    dateFrom?: string;
    onDateFromChange?: (value: string) => void;
    dateTo?: string;
    onDateToChange?: (value: string) => void;
    onClear: () => void;
    active: boolean;
}

export function DocumentFilters({
    search,
    onSearchChange,
    searchPlaceholder = 'Pesquisar...',
    status,
    onStatusChange,
    statusOptions,
    clientId,
    onClientChange,
    clients,
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    onClear,
    active,
}: DocumentFiltersProps) {
    return (
        <div className="flex flex-wrap items-end gap-3">
            <div className="grid min-w-48 flex-1 gap-1.5">
                <Label className="text-xs text-muted-foreground">Pesquisar</Label>
                <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={searchPlaceholder}
                />
            </div>

            <div className="grid w-44 gap-1.5">
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <Select value={status} onValueChange={(value) => onStatusChange(value ?? ALL)}>
                    <SelectTrigger className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>Todos os estados</SelectItem>
                        {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {clients && onClientChange && (
                <div className="grid w-48 gap-1.5">
                    <Label className="text-xs text-muted-foreground">Cliente</Label>
                    <Select value={clientId} onValueChange={(value) => onClientChange(value ?? ALL)}>
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>Todos os clientes</SelectItem>
                            {clients.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                    {client.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {onDateFromChange && (
                <div className="grid w-40 gap-1.5">
                    <Label className="text-xs text-muted-foreground">De</Label>
                    <DatePicker value={dateFrom} onChange={onDateFromChange} placeholder="Qualquer data" />
                </div>
            )}

            {onDateToChange && (
                <div className="grid w-40 gap-1.5">
                    <Label className="text-xs text-muted-foreground">Até</Label>
                    <DatePicker value={dateTo} onChange={onDateToChange} placeholder="Qualquer data" />
                </div>
            )}

            {active && (
                <Button type="button" variant="ghost" size="sm" onClick={onClear}>
                    <X /> Limpar filtros
                </Button>
            )}
        </div>
    );
}

export { ALL as ALL_FILTER_VALUE };

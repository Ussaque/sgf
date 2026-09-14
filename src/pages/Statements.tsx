import { useEffect, useState } from 'react';
import { FileBarChart } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { api } from '@/services/api';
import type { Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/date-picker';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function Statements() {
    const { companyId } = useCompany();
    const [clients, setClients] = useState<Client[]>([]);
    const [clientId, setClientId] = useState('');
    const [dateFrom, setDateFrom] = useState<string | undefined>();
    const [dateTo, setDateTo] = useState<string | undefined>();

    useEffect(() => {
        if (!companyId) return;
        api.getClients(companyId).then(setClients);
    }, [companyId]);

    function openStatement() {
        if (!clientId) return;
        const params = new URLSearchParams();
        if (dateFrom) params.set('from', dateFrom);
        if (dateTo) params.set('to', dateTo);
        const query = params.toString();
        window.open(`/extratos/${clientId}/imprimir${query ? `?${query}` : ''}`, '_blank');
    }

    return (
        <div className="grid gap-4">
            <div>
                <h1 className="text-2xl font-semibold">Extratos</h1>
                <p className="text-sm text-muted-foreground">
                    Resumo de faturas, cotações e recibos por cliente
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Gerar extrato de cliente</CardTitle>
                    <CardDescription>
                        Escolhe um cliente e, opcionalmente, um intervalo de datas
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="grid min-w-56 gap-1.5">
                            <Label className="text-xs text-muted-foreground">Cliente</Label>
                            <Select value={clientId} onValueChange={(value) => setClientId(value ?? '')}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Seleciona um cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map((client) => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid w-40 gap-1.5">
                            <Label className="text-xs text-muted-foreground">De</Label>
                            <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Início" />
                        </div>
                        <div className="grid w-40 gap-1.5">
                            <Label className="text-xs text-muted-foreground">Até</Label>
                            <DatePicker value={dateTo} onChange={setDateTo} placeholder="Hoje" />
                        </div>
                        <Button onClick={openStatement} disabled={!clientId}>
                            <FileBarChart /> Ver extrato
                        </Button>
                    </div>
                    {clients.length === 0 && (
                        <p className="mt-3 text-sm text-muted-foreground">
                            Ainda não há clientes registados nesta empresa.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

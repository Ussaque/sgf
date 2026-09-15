import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { api } from '@/services/api';
import type { Invoice, InvoiceStatus } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { INVOICE_STATUS_LABELS as STATUS_LABELS } from '@/lib/status-labels';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';

const chartConfig = {
    count: {
        label: 'Faturas',
        color: 'var(--chart-1)',
    },
} satisfies ChartConfig;

export default function Dashboard() {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [metrics, setMetrics] = useState({ totalRevenue: 0, pendingAmount: 0, invoiceCount: 0 });
    const { companyId } = useCompany();

    useEffect(() => {
        if (!companyId) return;
        api.getInvoices(companyId).then(setInvoices);
        api.getMetrics(companyId).then(setMetrics);
    }, [companyId]);

    const chartData = useMemo(() => {
        const counts = invoices.reduce<Record<string, number>>((acc, invoice) => {
            acc[invoice.status] = (acc[invoice.status] ?? 0) + 1;
            return acc;
        }, {});
        return (Object.keys(STATUS_LABELS) as InvoiceStatus[]).map((status) => ({
            status: STATUS_LABELS[status],
            count: counts[status] ?? 0,
        }));
    }, [invoices]);

    return (
        <div className="grid gap-4">
            <div>
                <h1 className="text-2xl font-semibold">Olá, {user?.name}</h1>
                <p className="text-sm text-muted-foreground">
                    Resumo da faturação da tua empresa
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardDescription>Receita total</CardDescription>
                        <CardTitle className="text-2xl">
                            {formatCurrency(metrics.totalRevenue)}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Valor pendente</CardDescription>
                        <CardTitle className="text-2xl">
                            {formatCurrency(metrics.pendingAmount)}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Faturas emitidas</CardDescription>
                        <CardTitle className="text-2xl">{metrics.invoiceCount}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Faturas por estado</CardTitle>
                    <CardDescription>Distribuição atual das faturas da empresa</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-64 w-full">
                        <BarChart data={chartData}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="status"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
}

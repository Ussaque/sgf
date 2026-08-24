import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import type { Company } from '@/types';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { CompanyLogo } from '@/components/company-logo';
import { CompanyProfileForm } from '@/components/company-profile-form';

export default function Companies() {
    const { user, hasPermission } = useAuth();
    const { companies, refreshCompanies } = useCompany();
    const canManage = hasPermission('ADMIN');
    const canCreate = hasPermission('SUPER_ADMIN');
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [createOpen, setCreateOpen] = useState(false);

    return (
        <div className="grid gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Empresas</h1>
                    <p className="text-sm text-muted-foreground">Gestão de empresas da organização</p>
                </div>
                {canCreate && (
                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger render={<Button><Plus /> Nova Empresa</Button>} />
                        <DialogContent className="sm:max-w-xl">
                            <DialogHeader>
                                <DialogTitle>Nova empresa</DialogTitle>
                            </DialogHeader>
                            <CompanyProfileForm
                                organizationId={user?.organization_id}
                                onSaved={() => {
                                    setCreateOpen(false);
                                    refreshCompanies();
                                }}
                            />
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Todas as empresas</CardTitle>
                    <CardDescription>{companies.length} empresa(s)</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Empresa</TableHead>
                                <TableHead>NUIT</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Telefone</TableHead>
                                {canManage && <TableHead className="w-16" />}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {companies.map((company) => (
                                <TableRow key={company.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <CompanyLogo
                                                logoUrl={company.logo_url}
                                                name={company.name}
                                                className="size-6"
                                            />
                                            {company.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>{company.nuit}</TableCell>
                                    <TableCell>{company.email}</TableCell>
                                    <TableCell>{company.phone ?? '—'}</TableCell>
                                    {canManage && (
                                        <TableCell>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setEditingCompany(company)}
                                            >
                                                Editar
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                            {companies.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        Nenhuma empresa encontrada.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={!!editingCompany} onOpenChange={(open) => !open && setEditingCompany(null)}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Editar empresa</DialogTitle>
                    </DialogHeader>
                    {editingCompany && (
                        <CompanyProfileForm
                            key={editingCompany.id}
                            company={editingCompany}
                            onSaved={() => {
                                setEditingCompany(null);
                                refreshCompanies();
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

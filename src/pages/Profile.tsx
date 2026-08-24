import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { ROLE_LABELS } from '@/lib/roles';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

export default function Profile() {
    const { user } = useAuth();
    const { companies } = useCompany();

    if (!user) return null;

    return (
        <div className="grid gap-4">
            <div>
                <h1 className="text-2xl font-semibold">O meu perfil</h1>
                <p className="text-sm text-muted-foreground">Os teus dados de acesso ao sistema</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="size-14 rounded-lg">
                            <AvatarFallback className="rounded-lg text-lg">
                                {initials(user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-lg">{user.name}</CardTitle>
                            <CardDescription>{user.email}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            Role
                        </p>
                        <Badge className="mt-1">{ROLE_LABELS[user.role]}</Badge>
                    </div>
                    <div>
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            Empresas com acesso
                        </p>
                        <p className="mt-1">
                            {user.role === 'SUPER_ADMIN' && user.allowed_company_ids.length === 0
                                ? 'Todas as empresas'
                                : companies.map((c) => c.name).join(', ') || '—'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

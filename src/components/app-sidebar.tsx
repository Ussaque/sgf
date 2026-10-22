import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Building2,
    Check,
    ChevronsUpDown,
    FileBarChart,
    FileSpreadsheet,
    FileText,
    LayoutDashboard,
    LogOut,
    Package,
    Receipt,
    Settings,
    Truck,
    Users,
    UserCircle,
    UserCog,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { ROLE_LABELS } from '@/lib/roles';
import { CompanyLogo } from '@/components/company-logo';
import type { Role } from '@/types';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

type NavItem = {
    title: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
    minRole?: Role;
};

type NavSection = {
    label?: string;
    items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
    {
        items: [{ title: 'Dashboard', url: '/', icon: LayoutDashboard }],
    },
    {
        label: 'Documentos',
        items: [
            { title: 'Cotações', url: '/cotacoes', icon: FileSpreadsheet },
            { title: 'Guias de entrega', url: '/guias', icon: Truck },
            { title: 'Faturas', url: '/faturas', icon: FileText },
            { title: 'Recibos', url: '/recibos', icon: Receipt },
            { title: 'Extratos', url: '/extratos', icon: FileBarChart },
        ],
    },
    {
        label: 'Cadastro',
        items: [
            { title: 'Clientes', url: '/clientes', icon: Users },
            { title: 'Produtos & Serviços', url: '/produtos', icon: Package },
        ],
    },
    {
        label: 'Administração',
        items: [
            { title: 'Empresas', url: '/empresas', icon: Building2, minRole: 'ADMIN' },
            { title: 'Utilizadores', url: '/utilizadores', icon: UserCog, minRole: 'ADMIN' },
        ],
    },
];

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

export function AppSidebar() {
    const { user, logout, hasPermission } = useAuth();
    const { company, companies, setCompanyId } = useCompany();
    const location = useLocation();
    const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

    const sections = NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => !item.minRole || hasPermission(item.minRole)),
    })).filter((section) => section.items.length > 0);
    const canSwitchCompany = companies.length > 1;

    return (
        <>
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        {canSwitchCompany ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <SidebarMenuButton size="lg">
                                            <CompanyLogo
                                                logoUrl={company?.logo_url}
                                                name={company?.name ?? 'Empresa'}
                                                className="aspect-square size-8"
                                            />
                                            <div className="grid flex-1 text-left text-sm leading-tight">
                                                <span className="truncate font-medium">
                                                    {company?.name ?? 'Seleciona uma empresa'}
                                                </span>
                                                <span className="truncate text-xs text-muted-foreground">
                                                    NUIT {company?.nuit}
                                                </span>
                                            </div>
                                            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                                        </SidebarMenuButton>
                                    }
                                />
                                <DropdownMenuContent
                                    align="start"
                                    className="w-(--anchor-width) min-w-56"
                                >
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                                            Empresas
                                        </DropdownMenuLabel>
                                        {companies.map((c) => (
                                            <DropdownMenuItem key={c.id} onClick={() => setCompanyId(c.id)}>
                                                <CompanyLogo logoUrl={c.logo_url} name={c.name} className="size-5" />
                                                <span className="flex-1 truncate">{c.name}</span>
                                                {c.id === company?.id && <Check className="size-4" />}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <SidebarMenuButton size="lg" render={<Link to="/" />}>
                                <CompanyLogo
                                    logoUrl={company?.logo_url}
                                    name={company?.name ?? 'MOZ Billing'}
                                    className="aspect-square size-8"
                                />
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">
                                        {company?.name ?? 'MOZ Billing'}
                                    </span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        {company ? `NUIT ${company.nuit}` : 'Sistema de Faturação'}
                                    </span>
                                </div>
                            </SidebarMenuButton>
                        )}
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarSeparator className="mx-0" />
            <SidebarContent>
                {sections.map((section, index) => (
                    <SidebarGroup key={section.label ?? `section-${index}`}>
                        {section.label && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {section.items.map((item) => (
                                    <SidebarMenuItem key={item.url}>
                                        <SidebarMenuButton
                                            tooltip={item.title}
                                            isActive={location.pathname === item.url}
                                            render={<Link to={item.url} />}
                                            className="h-9"
                                        >
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
            <SidebarSeparator className="mx-0" />
            <SidebarFooter>
                {user && (
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <SidebarMenuButton size="lg">
                                            <Avatar className="size-8 rounded-lg">
                                                <AvatarFallback className="rounded-lg">
                                                    {initials(user.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="grid flex-1 text-left text-sm leading-tight">
                                                <span className="truncate font-medium">{user.name}</span>
                                                <span className="truncate text-xs text-muted-foreground">
                                                    {user.email}
                                                </span>
                                            </div>
                                        </SidebarMenuButton>
                                    }
                                />
                                <DropdownMenuContent
                                    side="top"
                                    align="start"
                                    className="w-(--anchor-width) min-w-56"
                                >
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel className="font-normal">
                                            <div className="grid text-left text-sm leading-tight">
                                                <span className="truncate font-medium">{user.name}</span>
                                                <span className="truncate text-xs text-muted-foreground">
                                                    {ROLE_LABELS[user.role]}
                                                </span>
                                            </div>
                                        </DropdownMenuLabel>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem render={<Link to="/perfil" />}>
                                        <UserCircle />
                                        O meu perfil
                                    </DropdownMenuItem>
                                    <DropdownMenuItem render={<Link to="/definicoes" />}>
                                        <Settings />
                                        Definições
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() => setConfirmLogoutOpen(true)}
                                    >
                                        <LogOut />
                                        Terminar sessão
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </SidebarMenuItem>
                    </SidebarMenu>
                )}
            </SidebarFooter>
        </Sidebar>

        <AlertDialog open={confirmLogoutOpen} onOpenChange={setConfirmLogoutOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Terminar sessão</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tens a certeza que queres terminar a sessão?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={logout}>Terminar sessão</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}

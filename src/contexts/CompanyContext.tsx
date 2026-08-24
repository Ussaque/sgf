import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import type { Company } from '@/types';

interface CompanyContextType {
    companyId: string | undefined;
    company: Company | undefined;
    companies: Company[];
    setCompanyId: (id: string) => void;
    refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [companyId, setCompanyId] = useState<string | undefined>(undefined);

    async function refreshCompanies() {
        if (!user) {
            setCompanies([]);
            setCompanyId(undefined);
            return;
        }

        const allCompanies = await api.getCompanies();
        const accessible =
            user.role === 'SUPER_ADMIN' && user.allowed_company_ids.length === 0
                ? allCompanies.filter((c) => c.organization_id === user.organization_id)
                : allCompanies.filter((c) => user.allowed_company_ids.includes(c.id));

        setCompanies(accessible);
        setCompanyId((current) =>
            current && accessible.some((c) => c.id === current) ? current : accessible[0]?.id
        );
    }

    useEffect(() => {
        refreshCompanies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const company = companies.find((c) => c.id === companyId);

    return (
        <CompanyContext.Provider value={{ companyId, company, companies, setCompanyId, refreshCompanies }}>
            {children}
        </CompanyContext.Provider>
    );
}

export function useCompany() {
    const context = useContext(CompanyContext);
    if (context === undefined) {
        throw new Error('useCompany must be used within a CompanyProvider');
    }
    return context;
}

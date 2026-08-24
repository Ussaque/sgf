import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyLogoProps {
    logoUrl?: string;
    name: string;
    className?: string;
}

export function CompanyLogo({ logoUrl, name, className }: CompanyLogoProps) {
    const [errored, setErrored] = useState(false);

    if (logoUrl && !errored) {
        return (
            <img
                src={logoUrl}
                alt={name}
                className={cn('shrink-0 rounded-lg object-contain', className)}
                onError={() => setErrored(true)}
            />
        );
    }

    return (
        <div
            className={cn(
                'flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground',
                className
            )}
        >
            <Building2 className="size-4" />
        </div>
    );
}

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OPTIONS = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Escuro', icon: Moon },
    { value: 'system', label: 'Sistema', icon: Monitor },
] as const;

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    return (
        <div className="inline-flex gap-1 rounded-lg border p-1">
            {OPTIONS.map((option) => (
                <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={mounted && theme === option.value ? 'default' : 'ghost'}
                    onClick={() => setTheme(option.value)}
                    className="gap-1.5"
                >
                    <option.icon className="size-4" />
                    {option.label}
                </Button>
            ))}
        </div>
    );
}

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [justLoggedIn, setJustLoggedIn] = useState(false);

    const from = (location.state as { from?: Location })?.from?.pathname ?? '/';

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            await login(email, password);
            setJustLoggedIn(true);
            setTimeout(() => navigate(from, { replace: true }), 900);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao iniciar sessão');
            setIsSubmitting(false);
        }
    }

    if (justLoggedIn) {
        return (
            <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
                <div className="flex animate-in flex-col items-center gap-3 fade-in zoom-in-95 duration-500">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">A preparar o teu painel...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Iniciar sessão</CardTitle>
                    <CardDescription>
                        Acede ao sistema de faturação
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Palavra-passe</Label>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="animate-spin" />}
                            {isSubmitting ? 'A entrar...' : 'Entrar'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

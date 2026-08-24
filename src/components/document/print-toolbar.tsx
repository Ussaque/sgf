import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PrintToolbar() {
    return (
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-2 print:hidden">
            <p className="text-sm text-muted-foreground">Pré-visualização — nada aqui é impresso</p>
            <div className="flex gap-2">
                <Button size="sm" onClick={() => window.print()}>
                    <Printer /> Imprimir
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.close()}>
                    <X /> Fechar
                </Button>
            </div>
        </div>
    );
}

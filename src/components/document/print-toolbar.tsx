import { useState } from 'react';
import { Download, Loader2, Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrintToolbarProps {
    onDownload?: () => Promise<void>;
}

export function PrintToolbar({ onDownload }: PrintToolbarProps) {
    const [downloading, setDownloading] = useState(false);

    async function handleDownload() {
        if (!onDownload || downloading) return;
        setDownloading(true);
        try {
            await onDownload();
        } finally {
            setDownloading(false);
        }
    }

    return (
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-2 print:hidden">
            <p className="text-sm text-muted-foreground">Pré-visualização — nada aqui é impresso</p>
            <div className="flex gap-2">
                {onDownload && (
                    <Button size="sm" variant="outline" onClick={handleDownload} disabled={downloading}>
                        {downloading ? <Loader2 className="animate-spin" /> : <Download />}
                        Descarregar PDF
                    </Button>
                )}
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

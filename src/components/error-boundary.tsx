import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
}

interface State {
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('Uncaught error:', error, info.componentStack);
    }

    render() {
        if (this.state.error) {
            return (
                <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-8 text-center">
                    <h1 className="text-xl font-semibold text-destructive">Ocorreu um erro</h1>
                    <pre className="max-w-2xl overflow-auto rounded-md border bg-muted p-4 text-left text-xs whitespace-pre-wrap">
                        {this.state.error.message}
                        {'\n\n'}
                        {this.state.error.stack}
                    </pre>
                    <Button onClick={() => window.location.reload()}>Recarregar</Button>
                </div>
            );
        }

        return this.props.children;
    }
}

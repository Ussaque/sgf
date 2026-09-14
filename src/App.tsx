import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/app-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Toaster } from '@/components/ui/sonner';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Clients from '@/pages/Clients';
import Products from '@/pages/Products';
import Invoices from '@/pages/Invoices';
import InvoicePrint from '@/pages/InvoicePrint';
import Quotations from '@/pages/Quotations';
import QuotationPrint from '@/pages/QuotationPrint';
import Receipts from '@/pages/Receipts';
import ReceiptPrint from '@/pages/ReceiptPrint';
import Users from '@/pages/Users';
import Profile from '@/pages/Profile';
import Settings from '@/pages/Settings';
import Companies from '@/pages/Companies';
import Statements from '@/pages/Statements';
import StatementPrint from '@/pages/StatementPrint';

function App() {
    return (
        <>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route
                    path="/faturas/:id/imprimir"
                    element={
                        <ProtectedRoute>
                            <InvoicePrint />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/cotacoes/:id/imprimir"
                    element={
                        <ProtectedRoute>
                            <QuotationPrint />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/recibos/:id/imprimir"
                    element={
                        <ProtectedRoute>
                            <ReceiptPrint />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/extratos/:clientId/imprimir"
                    element={
                        <ProtectedRoute>
                            <StatementPrint />
                        </ProtectedRoute>
                    }
                />

                <Route
                    element={
                        <ProtectedRoute>
                            <AppLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/cotacoes" element={<Quotations />} />
                    <Route path="/faturas" element={<Invoices />} />
                    <Route path="/recibos" element={<Receipts />} />
                    <Route path="/extratos" element={<Statements />} />
                    <Route path="/clientes" element={<Clients />} />
                    <Route path="/produtos" element={<Products />} />
                    <Route path="/empresas" element={<Companies />} />
                    <Route path="/utilizadores" element={<Users />} />
                    <Route path="/perfil" element={<Profile />} />
                    <Route path="/definicoes" element={<Settings />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster />
        </>
    );
}

export default App;

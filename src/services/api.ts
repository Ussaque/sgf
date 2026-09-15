import type {
    User, Company, Client, Invoice, Quotation, Receipt, Product, Role
} from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
export const TOKEN_STORAGE_KEY = 'mbs_token';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const isFormData = options.body instanceof FormData;
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Erro ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined });
const patch = <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined });
const del = (path: string) => request<void>(path, { method: 'DELETE' });

export const api = {
    // Uploads
    async uploadLogo(file: File): Promise<{ url: string }> {
        const formData = new FormData();
        formData.append('file', file);
        return request('/uploads/logo', { method: 'POST', body: formData });
    },

    // Auth
    async login(email: string, password: string): Promise<{ token: string; user: User }> {
        return post('/auth/login', { email, password });
    },
    async getMe(): Promise<User> {
        return get('/auth/me');
    },

    // Users
    async getUsers(_organizationId?: string): Promise<User[]> {
        return get('/users');
    },
    async updateUser(user: User): Promise<User> {
        return patch(`/users/${user.id}`, { role: user.role });
    },
    async createUser(data: {
        name: string;
        email: string;
        password: string;
        role: Role;
        allowed_company_ids: string[];
    }): Promise<User> {
        return post('/users', data);
    },
    async resetUserPassword(userId: string, password: string): Promise<void> {
        return post(`/users/${userId}/reset-password`, { password });
    },
    async updateUserCompanies(userId: string, allowed_company_ids: string[]): Promise<User> {
        return patch(`/users/${userId}`, { allowed_company_ids });
    },

    // Companies
    async getCompanies(): Promise<Company[]> {
        return get('/companies');
    },
    async getCompany(id: string): Promise<Company | undefined> {
        try {
            return await get(`/companies/${id}`);
        } catch {
            return undefined;
        }
    },
    async updateCompany(company: Company): Promise<Company> {
        return patch(`/companies/${company.id}`, company);
    },
    async createCompany(
        data: Omit<
            Company,
            'id' | 'current_invoice_sequence' | 'current_receipt_sequence' | 'current_quotation_sequence'
        >
    ): Promise<Company> {
        return post('/companies', data);
    },

    // Clients
    async getClients(companyId: string): Promise<Client[]> {
        return get(`/clients?companyId=${companyId}`);
    },
    async getClient(id: string): Promise<Client | undefined> {
        try {
            return await get(`/clients/${id}`);
        } catch {
            return undefined;
        }
    },
    async createClient(client: Omit<Client, 'credit_balance'>): Promise<Client> {
        return post('/clients', client);
    },
    async updateClient(client: Client): Promise<Client> {
        return patch(`/clients/${client.id}`, client);
    },
    async deleteClient(id: string): Promise<void> {
        return del(`/clients/${id}`);
    },

    // Products & Services
    async getProducts(companyId: string): Promise<Product[]> {
        return get(`/products?companyId=${companyId}`);
    },
    async createProduct(product: Product): Promise<Product> {
        return post('/products', product);
    },
    async updateProduct(product: Product): Promise<Product> {
        return patch(`/products/${product.id}`, product);
    },
    async deleteProduct(id: string): Promise<void> {
        return del(`/products/${id}`);
    },

    // Invoices
    async getInvoices(companyId: string): Promise<Invoice[]> {
        return get(`/invoices?companyId=${companyId}`);
    },
    async getInvoice(id: string): Promise<Invoice | undefined> {
        try {
            return await get(`/invoices/${id}`);
        } catch {
            return undefined;
        }
    },
    async createInvoice(
        data: Omit<Invoice, 'id' | 'number' | 'created_at' | 'updated_at'>
    ): Promise<Invoice> {
        return post('/invoices', data);
    },
    async updateInvoice(invoice: Invoice): Promise<Invoice> {
        return patch(`/invoices/${invoice.id}`, invoice);
    },

    // Quotations
    async getQuotations(companyId: string): Promise<Quotation[]> {
        return get(`/quotations?companyId=${companyId}`);
    },
    async getQuotation(id: string): Promise<Quotation | undefined> {
        try {
            return await get(`/quotations/${id}`);
        } catch {
            return undefined;
        }
    },
    async createQuotation(
        data: Omit<Quotation, 'id' | 'number' | 'status' | 'created_at' | 'updated_at' | 'converted_invoice_id'>
    ): Promise<Quotation> {
        return post('/quotations', data);
    },
    async updateQuotation(quotation: Quotation): Promise<Quotation> {
        return patch(`/quotations/${quotation.id}`, quotation);
    },
    async deleteQuotation(id: string): Promise<void> {
        return del(`/quotations/${id}`);
    },
    async convertQuotationToInvoice(id: string): Promise<Invoice> {
        return post(`/quotations/${id}/convert`);
    },

    // Receipts
    async getReceipts(companyId: string): Promise<Receipt[]> {
        return get(`/receipts?companyId=${companyId}`);
    },
    async getReceipt(id: string): Promise<Receipt | undefined> {
        try {
            return await get(`/receipts/${id}`);
        } catch {
            return undefined;
        }
    },
    async createReceipt(data: Omit<Receipt, 'id' | 'number' | 'created_at'>): Promise<Receipt> {
        return post('/receipts', data);
    },
    async voidReceipt(id: string): Promise<Receipt> {
        return post(`/receipts/${id}/void`);
    },

    // Dashboard Metrics
    async getMetrics(companyId?: string) {
        return get<{ totalRevenue: number; pendingAmount: number; invoiceCount: number }>(
            `/metrics${companyId ? `?companyId=${companyId}` : ''}`
        );
    },
};

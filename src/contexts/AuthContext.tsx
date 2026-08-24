import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Role } from '../types';
import { api, TOKEN_STORAGE_KEY } from '../services/api';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
    hasPermission: (requiredRole: Role) => boolean;
    canAccessCompany: (companyId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!token) {
            setIsLoading(false);
            return;
        }
        api.getMe()
            .then(setUser)
            .catch(() => {
                localStorage.removeItem(TOKEN_STORAGE_KEY);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const { token, user: loggedInUser } = await api.login(email, password);
            localStorage.setItem(TOKEN_STORAGE_KEY, token);
            setUser(loggedInUser);
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
    };

    const hasPermission = (requiredRole: Role): boolean => {
        if (!user) return false;

        const roles: Role[] = ['SUPER_ADMIN', 'ADMIN', 'USER', 'VIEWER'];
        const userRoleIndex = roles.indexOf(user.role);
        const requiredRoleIndex = roles.indexOf(requiredRole);

        return userRoleIndex <= requiredRoleIndex;
    };

    const canAccessCompany = (companyId: string): boolean => {
        if (!user) return false;
        if (user.role === 'SUPER_ADMIN') return true;
        return user.allowed_company_ids.includes(companyId);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading, hasPermission, canAccessCompany }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

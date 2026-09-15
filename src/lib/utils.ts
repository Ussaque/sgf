import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'MZN'): string {
  return new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('pt-MZ');
}

/**
 * Darkens a hex color for use as text, so a pale brand color chosen in
 * Settings stays legible (and survives grayscale printing) instead of
 * being used raw against a white background.
 */
export function darkenForText(hex: string, amount = 0.35): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;

  const num = parseInt(match[1], 16);
  const channel = (shift: number) => {
    const value = (num >> shift) & 0xff;
    return Math.max(0, Math.round(value * (1 - amount)));
  };

  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  return `#${toHex(channel(16))}${toHex(channel(8))}${toHex(channel(0))}`;
}

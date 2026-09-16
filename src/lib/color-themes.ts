export interface ColorTheme {
    id: string;
    label: string;
    /** Preview swatch, matching the theme's --primary in light mode. */
    swatch: string;
}

export const COLOR_THEMES: ColorTheme[] = [
    { id: 'twitter', label: 'Azul', swatch: 'oklch(0.6723 0.1606 244.9955)' },
    { id: 'claude', label: 'Terracota', swatch: 'oklch(0.6171 0.1375 39.0427)' },
    { id: 'supabase', label: 'Verde', swatch: 'oklch(0.8348 0.1302 160.9080)' },
    { id: 'amber-minimal', label: 'Âmbar', swatch: 'oklch(0.7686 0.1647 70.0804)' },
    { id: 'modern-minimal', label: 'Azul-cobalto', swatch: 'oklch(0.6231 0.1880 259.8145)' },
    { id: 'graphite', label: 'Grafite', swatch: 'oklch(0.4891 0 0)' },
    { id: 'vermelho', label: 'Vermelho', swatch: 'oklch(0.5594 0.1900 25.8625)' },
    { id: 'verde-escuro', label: 'Verde escuro', swatch: 'oklch(0.4200 0.1000 150)' },
    { id: 'azul-escuro', label: 'Azul escuro', swatch: 'oklch(0.3800 0.1300 255)' },
];

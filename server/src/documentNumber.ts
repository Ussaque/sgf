export function generateDocumentNumber(prefix: string, sequence: number): string {
    const year = new Date().getFullYear();
    return `${prefix}-${year}-${String(sequence).padStart(3, '0')}`;
}

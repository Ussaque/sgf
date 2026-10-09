import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { pool } from './db';

async function columnExists(table: string, column: string): Promise<boolean> {
    const [rows] = await pool.query<any[]>(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
        [table, column]
    );
    return rows.length > 0;
}

async function renameColumnIfExists(table: string, from: string, to: string, definition: string) {
    if (!(await columnExists(table, from))) return;
    await pool.query(`ALTER TABLE ${table} CHANGE COLUMN ${from} ${to} ${definition}`);
    console.log(`(coluna renomeada) ${table}.${from} -> ${to}`);
}

async function dropColumnIfExists(table: string, column: string) {
    if (!(await columnExists(table, column))) return;
    await pool.query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
    console.log(`(coluna removida) ${table}.${column}`);
}

async function main() {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);

    for (const statement of statements) {
        try {
            await pool.query(statement);
        } catch (err) {
            // ER_DUP_FIELDNAME: column already added by a previous migrate run. ADD COLUMN has
            // no portable "IF NOT EXISTS" across MySQL and MariaDB, so this keeps re-runs safe.
            if ((err as { code?: string }).code === 'ER_DUP_FIELDNAME') {
                console.log(`(coluna já existe, ignorado) ${statement.trim().slice(0, 60)}...`);
                continue;
            }
            throw err;
        }
    }

    // delivery_notes/delivery_note_items went through two redesigns while this feature was being
    // built: guia -> fatura ("converted_invoice_id"), then fatura -> guia ("invoice_id"), and
    // finally recibo -> guia with no pricing at all ("receipt_id", no money columns). Each step is
    // guarded by an information_schema check instead of a blind ALTER, so a fresh install (which
    // never had any of the old columns) just skips all of them, and a database caught mid-way
    // through an earlier version picks up wherever it left off.
    await renameColumnIfExists('delivery_notes', 'converted_invoice_id', 'invoice_id', 'VARCHAR(36) NULL');
    await renameColumnIfExists('delivery_notes', 'invoice_id', 'receipt_id', 'VARCHAR(36) NULL');
    await dropColumnIfExists('delivery_notes', 'subtotal');
    await dropColumnIfExists('delivery_notes', 'tax_total');
    await dropColumnIfExists('delivery_notes', 'total');
    await dropColumnIfExists('delivery_note_items', 'unit_price');
    await dropColumnIfExists('delivery_note_items', 'tax_rate');
    await dropColumnIfExists('delivery_note_items', 'total');

    console.log(`Schema aplicado (${statements.length} instruções).`);
    await pool.end();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

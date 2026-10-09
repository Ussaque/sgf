import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { pool } from './db';

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

    // One-off rename: early installs of delivery_notes used `converted_invoice_id` (guia -> fatura
    // gerada a partir dela); the feature now runs the other way (fatura -> guia gerada a partir dela),
    // so the column is renamed to `invoice_id`. Guarded by an information_schema check instead of a
    // blind ALTER, since a fresh install's delivery_notes table never had the old column at all.
    const [oldColumnRows] = await pool.query<any[]>(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'delivery_notes' AND column_name = 'converted_invoice_id'`
    );
    if (oldColumnRows.length > 0) {
        await pool.query(
            'ALTER TABLE delivery_notes CHANGE COLUMN converted_invoice_id invoice_id VARCHAR(36) NULL'
        );
        console.log('(coluna renomeada) delivery_notes.converted_invoice_id -> invoice_id');
    }

    console.log(`Schema aplicado (${statements.length} instruções).`);
    await pool.end();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

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

    console.log(`Schema aplicado (${statements.length} instruções).`);
    await pool.end();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

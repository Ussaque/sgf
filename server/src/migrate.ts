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
        await pool.query(statement);
    }

    console.log(`Schema aplicado (${statements.length} instruções).`);
    await pool.end();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

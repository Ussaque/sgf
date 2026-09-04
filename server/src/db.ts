import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    dateStrings: false,
    waitForConnections: true,
    connectionLimit: 10,
});

export type Conn = mysql.PoolConnection;

/** Runs the given work inside a transaction, committing on success and rolling back on error. */
export async function withTransaction<T>(work: (conn: Conn) => Promise<T>): Promise<T> {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const result = await work(conn);
        await conn.commit();
        return result;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

import 'dotenv/config';
import 'express-async-errors';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { uploadsRouter } from './routes/uploads';
import { usersRouter } from './routes/users';
import { companiesRouter } from './routes/companies';
import { clientsRouter } from './routes/clients';
import { productsRouter } from './routes/products';
import { invoicesRouter } from './routes/invoices';
import { quotationsRouter } from './routes/quotations';
import { receiptsRouter } from './routes/receipts';
import { metricsRouter } from './routes/metrics';

const app = express();

const LOCALHOST_ORIGIN = /^http:\/\/localhost:\d+$/;

app.use(
    cors({
        origin(origin, callback) {
            // No Origin header (e.g. curl/Postman) or any localhost dev port is allowed.
            if (!origin || LOCALHOST_ORIGIN.test(origin) || origin === process.env.CORS_ORIGIN) {
                return callback(null, true);
            }
            callback(new Error('Not allowed by CORS'));
        },
    })
);
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/users', usersRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/products', productsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/quotations', quotationsRouter);
app.use('/api/receipts', receiptsRouter);
app.use('/api/metrics', metricsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    res.status(500).json({ error: message });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
    console.log(`API a correr em http://localhost:${port}`);
});

import compression from 'compression';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';

import { getEnv } from './src/config/env';
import { errorHandler } from './src/middleware/errorHandler';
import { apiRouter } from './src/routes';

const env = getEnv();

export const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (env.allowedOrigins.length === 0) return callback(null, true);
      if (env.allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
  }),
);

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

const isProd = env.nodeEnv === 'production';
app.use(
  rateLimit({
    windowMs: isProd ? 15 * 60 * 1000 : 60 * 1000,
    limit: isProd ? 100 : 10_000,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
);

app.use('/api', apiRouter);

app.get('/api/health', (_req: Request, res: Response) => {
  return res.json({ success: true, data: { status: 'ok' } });
});

app.use(errorHandler);
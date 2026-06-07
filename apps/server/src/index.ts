import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { APP_NAME } from '@cricket/shared';
import { errorHandler } from './middleware/errors';
import { profileRoutes } from './routes/profiles';
import { clubRoutes } from './routes/clubs';
import { yearRoutes } from './routes/years';
import { teamRoutes } from './routes/teams';
import { gameRoutes } from './routes/games';
import { expenseRoutes } from './routes/expenses';
import { paymentRoutes } from './routes/payments';
import { webhookRoutes } from './routes/webhooks';

const app = express();
const port = process.env.PORT || 3001;

// Behind a hosting proxy (Railway/Vercel) — needed for correct client IPs
// (rate limiting) and protocol.
app.set('trust proxy', 1);

app.use(helmet());

// CORS allowlist. In production set CORS_ORIGINS to a comma-separated list of
// the web app's origin(s). When unset (local dev) we fall back to localhost.
// Requests with no Origin header (mobile apps, curl, server-to-server) are
// allowed — the API's real gate is the auth + role middleware on each route.
const configuredOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const allowlist = configuredOrigins.length
  ? configuredOrigins
  : ['http://localhost:3000', 'http://localhost:8081'];
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowlist.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
  }),
);

// Parse JSON bodies, and stash the raw bytes on the request. The PayPal webhook
// will need the unmodified payload to verify its signature in P1 (signature
// checks must run over the exact bytes, not a re-serialized object).
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as unknown as { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);

// Health check — registered before the rate limiter so uptime pings are exempt.
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Basic rate limiting on the API surface.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: Number(process.env.RATE_LIMIT_MAX ?? 300), // per IP per window
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }),
);

// Routes
app.use('/api', profileRoutes);
app.use('/api', clubRoutes);
app.use('/api', yearRoutes);
app.use('/api', teamRoutes);
app.use('/api', gameRoutes);
app.use('/api', expenseRoutes);
app.use('/api', paymentRoutes);
app.use('/api', webhookRoutes);

// Error handling
app.use(errorHandler);

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`${APP_NAME} API server running on port ${port}`);
});

export default app;

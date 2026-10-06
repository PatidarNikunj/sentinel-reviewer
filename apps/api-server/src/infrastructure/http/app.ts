// ─────────────────────────────────────────────────────────────────────────────
// Express Application Factory
// Configures middleware stack and route registration
// ─────────────────────────────────────────────────────────────────────────────

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { config } from '../config/env.js';
import { healthRouter } from './routes/health.routes.js';
import { scanRouter } from './routes/scan.routes.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';

export function createApp(): express.Express {
  const app = express();

  // ── Security Hardening ──────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));

  // ── Body Parsing & Compression ──────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(compression());

  // ── Request Logging ─────────────────────────────────────────────────────
  if (config.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // ── Route Registration ──────────────────────────────────────────────────
  app.use('/api/health', healthRouter);
  app.use('/api/scans', scanRouter);

  // ── Error Handling ──────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

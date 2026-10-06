// ─────────────────────────────────────────────────────────────────────────────
// Health Check Route
// ─────────────────────────────────────────────────────────────────────────────

import { Router, type Request, type Response } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'sentinel-api-server',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

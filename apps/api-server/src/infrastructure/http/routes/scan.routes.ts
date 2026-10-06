// ─────────────────────────────────────────────────────────────────────────────
// Scan Routes — Controller-level route definitions
// Uses shared @sentinel/validation for request validation
// ─────────────────────────────────────────────────────────────────────────────

import { Router, type Request, type Response, type NextFunction } from 'express';
import { ScanRequestSchema } from '@sentinel/validation';
import { v4 as uuidv4 } from 'uuid';
import type { ScanMetadata, ScanStatus } from '@sentinel/types';

export const scanRouter = Router();

/**
 * POST /api/scans — Initiate a new security scan
 * Validates the incoming payload using the shared Zod schema.
 */
scanRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ScanRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const scanMetadata: ScanMetadata = {
      scanId: uuidv4(),
      tenantId: 'default-tenant', // Placeholder — will be from auth context
      repositoryUrl: parsed.data.repositoryUrl,
      status: 'QUEUED' as ScanStatus,
      createdAt: new Date().toISOString(),
    };

    // In full implementation, this would dispatch to the secure-worker queue
    res.status(201).json({
      message: 'Scan queued successfully',
      data: scanMetadata,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/scans/:scanId — Retrieve scan status
 */
scanRouter.get('/:scanId', (req: Request, res: Response) => {
  const { scanId } = req.params;

  // Placeholder — will query the database in full implementation
  res.status(200).json({
    message: 'Scan status retrieval',
    data: {
      scanId,
      status: 'QUEUED' as ScanStatus,
      retrievedAt: new Date().toISOString(),
    },
  });
});

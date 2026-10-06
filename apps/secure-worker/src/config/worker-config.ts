// ─────────────────────────────────────────────────────────────────────────────
// Worker Configuration
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

const workerConfigSchema = z.object({
  maxRetries: z.coerce.number().int().positive().default(3),
  retryDelayMs: z.coerce.number().int().positive().default(2000),
  retryBackoffMultiplier: z.coerce.number().positive().default(2),
  maxRetryDelayMs: z.coerce.number().int().positive().default(30000),
  pollIntervalMs: z.coerce.number().int().positive().default(5000),
  scanTimeoutMs: z.coerce.number().int().positive().default(300000), // 5 minutes
  enablePrRetrigger: z.coerce.boolean().default(true),
});

export type WorkerConfigType = z.infer<typeof workerConfigSchema>;

export class WorkerConfig {
  static load(): WorkerConfigType {
    const parsed = workerConfigSchema.safeParse({
      maxRetries: process.env.WORKER_MAX_RETRIES,
      retryDelayMs: process.env.WORKER_RETRY_DELAY_MS,
      retryBackoffMultiplier: process.env.WORKER_BACKOFF_MULTIPLIER,
      maxRetryDelayMs: process.env.WORKER_MAX_RETRY_DELAY_MS,
      pollIntervalMs: process.env.WORKER_POLL_INTERVAL_MS,
      scanTimeoutMs: process.env.WORKER_SCAN_TIMEOUT_MS,
      enablePrRetrigger: process.env.WORKER_ENABLE_PR_RETRIGGER,
    });

    if (!parsed.success) {
      console.error('❌ Invalid worker configuration:', parsed.error.flatten().fieldErrors);
      process.exit(1);
    }

    return parsed.data;
  }
}

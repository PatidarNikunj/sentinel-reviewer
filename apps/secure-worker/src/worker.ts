// ─────────────────────────────────────────────────────────────────────────────
// @sentinel/secure-worker — Main Worker Entry Point
// Transient security analysis worker with retry-on-failure logic
// Re-scans when PR is updated, retries on vulnerability detection failures
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import { ScanExecutor } from './core/scan-executor.js';
import { RetryEngine } from './core/retry-engine.js';
import { WorkerConfig } from './config/worker-config.js';

const config = WorkerConfig.load();

console.log('🛡️  Sentinel Secure Worker starting...');
console.log(`📋 Max retries: ${config.maxRetries}`);
console.log(`⏱️  Retry delay: ${config.retryDelayMs}ms`);
console.log(`🔄 Poll interval: ${config.pollIntervalMs}ms`);

const executor = new ScanExecutor();
const retryEngine = new RetryEngine(config, executor);

// ── Main Worker Loop ──────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log('🔍 Worker is ready and polling for scan jobs...');

  // Graceful shutdown handling
  const shutdown = () => {
    console.log('\n🛑 Shutting down worker gracefully...');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // In a full implementation, this would connect to a message queue (Redis, SQS, etc.)
  // For now, demonstrate the retry engine with a simulated scan job
  while (true) {
    try {
      // Poll for pending scan jobs
      const job = await executor.pollForJob();

      if (job) {
        console.log(`📥 Received scan job: ${job.scanId}`);
        const result = await retryEngine.executeWithRetry(job);

        if (result.success) {
          console.log(`✅ Scan ${job.scanId} completed: ${result.findingsCount} findings`);
        } else {
          console.error(`❌ Scan ${job.scanId} exhausted all retries: ${result.error}`);
        }
      }

      // Wait before polling again
      await sleep(config.pollIntervalMs);
    } catch (error) {
      console.error('💥 Unexpected worker error:', error);
      await sleep(config.pollIntervalMs);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error('💀 Fatal worker error:', err);
  process.exit(1);
});

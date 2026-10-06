// ─────────────────────────────────────────────────────────────────────────────
// Retry Engine — Exponential Backoff with Jitter
// Retries failed scans automatically, supports PR-update re-triggering
// ─────────────────────────────────────────────────────────────────────────────

import type { WorkerConfigType } from '../config/worker-config.js';
import type { ScanExecutor, ScanJob, ScanResult } from './scan-executor.js';

export interface RetryResult {
  success: boolean;
  findingsCount: number;
  attempts: number;
  error?: string;
}

export class RetryEngine {
  constructor(
    private readonly config: WorkerConfigType,
    private readonly executor: ScanExecutor
  ) {}

  /**
   * Execute a scan job with automatic retry on failure.
   * Uses exponential backoff with jitter to prevent thundering herd.
   */
  async executeWithRetry(job: ScanJob): Promise<RetryResult> {
    let attempt = 0;
    let lastError: string | undefined;

    while (attempt < this.config.maxRetries) {
      attempt++;
      console.log(`🔄 Attempt ${attempt}/${this.config.maxRetries} for scan ${job.scanId}`);

      try {
        const result = await this.executor.executeScan(job);

        if (result.success) {
          return {
            success: true,
            findingsCount: result.findings.length,
            attempts: attempt,
          };
        }

        // Scan completed but detected issues that warrant retry
        // (e.g., partial failure, transient analysis error)
        lastError = result.error ?? 'Scan completed with errors';
        console.warn(
          `⚠️  Scan ${job.scanId} attempt ${attempt} failed: ${lastError}`
        );
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.error(
          `💥 Scan ${job.scanId} attempt ${attempt} threw: ${lastError}`
        );
      }

      // Don't wait after the last attempt
      if (attempt < this.config.maxRetries) {
        const delay = this.calculateBackoffDelay(attempt);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      findingsCount: 0,
      attempts: attempt,
      error: `Exhausted ${this.config.maxRetries} retries. Last error: ${lastError}`,
    };
  }

  /**
   * Handle PR update re-trigger — resets retry state and re-runs the scan.
   * Called when a webhook notifies us the PR has been updated after a failure.
   */
  async retriggerOnPrUpdate(job: ScanJob): Promise<RetryResult> {
    if (!this.config.enablePrRetrigger) {
      return {
        success: false,
        findingsCount: 0,
        attempts: 0,
        error: 'PR re-trigger is disabled',
      };
    }

    console.log(`🔁 PR updated — re-triggering scan ${job.scanId}`);
    return this.executeWithRetry(job);
  }

  /**
   * Exponential backoff with jitter.
   * delay = min(maxDelay, baseDelay * multiplier^attempt) + jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay =
      this.config.retryDelayMs *
      Math.pow(this.config.retryBackoffMultiplier, attempt - 1);

    const cappedDelay = Math.min(exponentialDelay, this.config.maxRetryDelayMs);

    // Add ±25% jitter to prevent thundering herd
    const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);

    return Math.floor(cappedDelay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain Entity: Scan
// Core business logic — framework-agnostic
// ─────────────────────────────────────────────────────────────────────────────

import type { ScanStatus, ScanMetadata, SecurityFinding } from '@sentinel/types';

export class Scan {
  public readonly scanId: string;
  public readonly tenantId: string;
  public readonly repositoryUrl: string;
  public status: ScanStatus;
  public readonly createdAt: string;
  public findings: SecurityFinding[];

  constructor(metadata: ScanMetadata) {
    this.scanId = metadata.scanId;
    this.tenantId = metadata.tenantId;
    this.repositoryUrl = metadata.repositoryUrl;
    this.status = metadata.status;
    this.createdAt = metadata.createdAt;
    this.findings = [];
  }

  markInProgress(): void {
    this.status = 'IN_PROGRESS';
  }

  markCompleted(findings: SecurityFinding[]): void {
    this.findings = findings;
    this.status = 'COMPLETED';
  }

  markFailed(): void {
    this.status = 'FAILED';
  }

  toMetadata(): ScanMetadata {
    return {
      scanId: this.scanId,
      tenantId: this.tenantId,
      repositoryUrl: this.repositoryUrl,
      status: this.status,
      createdAt: this.createdAt,
    };
  }
}

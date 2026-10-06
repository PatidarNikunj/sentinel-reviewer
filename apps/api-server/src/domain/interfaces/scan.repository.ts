// ─────────────────────────────────────────────────────────────────────────────
// Domain Interface: Scan Repository
// Dependency Inversion — domain defines the contract, infra implements it
// ─────────────────────────────────────────────────────────────────────────────

import type { Scan } from '../entities/scan.entity.js';

export interface IScanRepository {
  create(scan: Scan): Promise<Scan>;
  findById(scanId: string): Promise<Scan | null>;
  findByTenantId(tenantId: string): Promise<Scan[]>;
  updateStatus(scanId: string, status: string): Promise<void>;
}

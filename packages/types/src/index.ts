export type ScanStatus = "QUEUED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

export interface SecurityFinding {
  id: string;
  ruleId: string;
  severity: "CRITICAL" | "HIGH" | "WARNING" | "INFO";
  message: string;
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
}

export interface ScanMetadata {
  scanId: string;
  tenantId: string;
  repositoryUrl: string;
  status: ScanStatus;
  createdAt: string;
}

# 📑 AI Prompt Instructions: Project Setup & Baseline Implementation

## 🎯 Context & Engineering Mandate
We are building the structural foundation of **Sentinel Reviewer**, an enterprise-grade AI-Driven Code Analysis & Secure Gate Dashboard platform. The system is designed for a **Senior/Tech Lead portfolio** and must explicitly prioritize **Security-by-Design**, **Clean Architecture**, **SOLID Principles**, and absolute **DRY compilation paradigms**. 

The target layout is a high-velocity modern **Turborepo** monorepo managed via **pnpm workspace topologies**.

---

## 🏛️ Monorepo Topology Matrix
Ensure the project structure strictly mirrors this layout out-of-the-box:

```text
sentinel-reviewer/
├── .github/workflows/         # Automated validation systems
│   └── security-gate.yml      # CI/CD verification engine (Semgrep + Snyk)
├── apps/
│   ├── web/                   # 🎨 FRONTEND: Next.js (App Router)
│   ├── api-server/            # ⚙️ BACKEND: Node.js Clean Architecture (Express/Fastify)
│   └── secure-worker/         # 🛡️ SANDBOX: Transient networkless analysis containers
├── packages/                  # 🤝 SHARED DRY ARTIFACTS
│   ├── database/              # Relational schemas & strict RLS controls
│   ├── types/                 # Standardized TypeScript type systems
│   └── validation/            # Universal structural payloads (Zod validation matrices)
├── tsconfig.base.json         # Unified system compilation parameters
├── pnpm-workspace.yaml        # Component routing grid
└── turbo.json                 # Caching and pipeline configuration
```

---

## 🏗️ Phase 1: Core System & Shared Workspace Architecture

### 1. Unified Configuration Stratum
Generate these baseline initialization definitions in the root directory:

#### `tsconfig.base.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

#### `pnpm-workspace.yaml`
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

#### `turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    }
  }
}
```

---

### 2. Implementation of Universal DRY Packages (`/packages`)

To guarantee absolute payload uniformity across our presentation and infrastructure layers, compile these packages:

#### A. `@sentinel/types` (`packages/types`)
Define standard system contracts. Ensure `package.json` maps targets using `"main": "./dist/index.js"` and `"types": "./dist/index.d.ts"`.

`packages/types/index.ts`:
```typescript
export type ScanStatus = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface SecurityFinding {
  id: string;
  ruleId: string;
  severity: 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
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
```

#### B. `@sentinel/validation` (`packages/validation`)
Establish structural ingestion contracts using **Zod**. This identical file handles both frontend form pre-validation and backend route controller defense gates.

`packages/validation/index.ts`:
```typescript
import { z } from 'zod';

export const ScanRequestSchema = z.object({
  repositoryUrl: z
    .string()
    .url({ message: 'Provide a valid repository URL structure.' })
    .regex(
      /^(https:\/\/github\.com\/|https:\/\/gitlab\.com\/)[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/,
      { message: 'Only public instances of GitHub or GitLab are allowed at this tier.' }
    ),
  branch: z.string().min(1, { message: 'Branch locator identifier required.' }).default('main'),
});

export type ScanRequestInput = z.infer<typeof ScanRequestSchema>;
```

---

## 🚀 Execution Instructions for the AI Assistant
Review this blueprint completely. Once you confirm understanding of the workspace structure, shared data layers, and architectural standards, signal that you are ready.

When you are ready to begin execution, let me know:
* Should we first generate the **Clean Architecture Domain Entities and Interface layers** for the backend engine (`apps/api-server`)?
* Or should we draft the **Prisma Multi-Tenant Schema and raw PostgreSQL Row-Level Security (RLS) scripts** (`packages/database`)?
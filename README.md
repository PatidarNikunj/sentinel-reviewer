# 🛡️ Sentinel Reviewer

**Sentinel Reviewer** is an enterprise-grade, AI-assisted code security analysis platform and automated security gate dashboard. Built as a high-velocity **Turborepo** monorepo managed with **pnpm workspaces**, the system enforces **Security-by-Design**, **Clean Architecture**, and **DRY contract compilation** across all services.

---

## 🏛️ Monorepo Architecture

The platform is structured into decoupled frontend, backend, sandbox worker, and shared library packages:

```
sentinel-reviewer/
├── .github/workflows/
│   └── security-gate.yml         # Multi-stage CI/CD security gate (Semgrep + Snyk + Next.js build)
├── apps/
│   ├── web/                      # 🎨 Presentation: Next.js 16 (App Router) + React 19 Dashboard
│   ├── api-server/               # ⚙️ Core API: Express 5 Clean Architecture REST service
│   └── secure-worker/            # 🛡️ Sandbox Worker: Resilient transient analysis worker & retry engine
├── packages/
│   ├── database/                 # 🗄️ Persistence: Prisma ORM Postgres contract-builder schema & migrations
│   ├── types/                    # 🤝 Domain Contracts: Unified TypeScript types & interfaces
│   └── validation/               # 🔒 Validation: Shared Zod schemas for input validation
├── package.json                  # Root monorepo workspace configuration
├── pnpm-workspace.yaml           # pnpm workspace definition & build permissions
├── turbo.json                    # Turborepo task pipeline & caching rules
└── tsconfig.base.json            # Base TypeScript configuration across packages
```

---

## 📦 Packages & Applications

### Applications (`apps/`)

| Application | Technology | Purpose |
|-------------|------------|---------|
| [`@sentinel/web`](apps/web) | Next.js 16, React 19, CSS Modules | Security dashboard for configuring repository scans, tracking job status, and inspecting vulnerability findings. |
| [`@sentinel/api-server`](apps/api-server) | Express 5, Helmet, CORS, Morgan, Zod | REST API following Clean Architecture (Entities, Interfaces, HTTP Controllers). Ingests scan requests and serves health & scan status. |
| [`@sentinel/secure-worker`](apps/secure-worker) | Node.js, TypeScript, Zod | Background security worker that polls for jobs, isolates checkouts, coordinates static & dependency analysis, and executes retries with backoff and jitter. |

### Shared Packages (`packages/`)

| Package | Purpose | Exports |
|---------|---------|---------|
| [`@sentinel/types`](packages/types) | Centralized TypeScript contracts | `ScanStatus`, `SecurityFinding`, `ScanMetadata` |
| [`@sentinel/validation`](packages/validation) | Universal Zod ingestion schemas | `ScanRequestSchema`, `ScanRequestInput` |
| [`@sentinel/database`](packages/database) | Prisma ORM Postgres contract-builder & client | Database client, schema models (`User`, `Post`), migrations |

---

## ⚙️ Core Systems

### 1. API Server & Clean Architecture (`apps/api-server`)

The API server decouples domain logic from web frameworks using Clean Architecture layers:
- **Domain Entities**: `Scan` entity (`apps/api-server/src/domain/entities/scan.entity.ts`) encapsulating state transitions (`IN_PROGRESS`, `COMPLETED`, `FAILED`).
- **Domain Interfaces**: `IScanRepository` interface (`apps/api-server/src/domain/interfaces/scan.repository.ts`) enabling dependency inversion for database adapters.
- **HTTP Routing & Hardening**: Secured with `helmet()`, CORS origin control, JSON body limits, and request compression.

#### Endpoints

- **`GET /api/health`**
  Returns service health, uptime, and timestamp.
- **`POST /api/scans`**
  Validates request payload against `@sentinel/validation` (`ScanRequestSchema`).
  ```json
  // Request
  {
    "repositoryUrl": "https://github.com/org/repo",
    "branch": "main"
  }

  // Response (201 Created)
  {
    "message": "Scan queued successfully",
    "data": {
      "scanId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "tenantId": "default-tenant",
      "repositoryUrl": "https://github.com/org/repo",
      "status": "QUEUED",
      "createdAt": "2026-11-06T18:00:00.000Z"
    }
  }
  ```
- **`GET /api/scans/:scanId`**
  Retrieves current status and details of a queued or completed scan.

---

### 2. Secure Worker & Resilient Retry Engine (`apps/secure-worker`)

The worker operates as a transient analysis orchestrator designed to run in isolated execution contexts:

#### Scan Execution Lifecycle (`ScanExecutor`)
1. **Clone & Sandbox**: Clones the target repository (`git clone`) into an isolated sandbox directory.
2. **Static Analysis (SAST)**: Runs Semgrep static analysis with security rule suites.
3. **Dependency Scanning (SCA)**: Runs Snyk dependency vulnerability checks.
4. **Aggregation**: Aggregates and maps findings into standardized `SecurityFinding[]` objects.
5. **Sandbox Cleanup**: Guarantees sandbox destruction and temp file removal upon completion or failure.

#### Retry Engine (`RetryEngine`)
- **Exponential Backoff with Jitter**: Automatically retries transient failures:
  $$\text{delay} = \min(\text{maxDelay}, \text{baseDelay} \times \text{multiplier}^{\text{attempt}-1}) \pm 25\%\text{ jitter}$$
- **PR-Update Re-Triggering**: Resets failure count and re-runs the analysis pipeline when webhooks notify of updated PR commits.

---

### 3. CI/CD Security Gate (`.github/workflows/security-gate.yml`)

The repository includes a multi-stage GitHub Actions workflow that gates Pull Requests to `main` and `develop`:

```
Pull Request Event ──► [ Stage 1: Semgrep SAST Scan ] ──────┐
                   ──► [ Stage 2: Snyk Dependency Scan ] ──┼──► [ Stage 4: Quality Gate Verdict ]
                   ──► [ Stage 3: Next.js Web Build ] ─────┘     ├── Sticky PR Comment
                                                                 └── Pass / Fail Status
```

- **Stage 1 (Semgrep SAST)**: Scans against OWASP Top 10, TypeScript, Node.js, and security audit rulesets; publishes SARIF reports to GitHub CodeQL.
- **Stage 2 (Snyk SCA)**: Audits dependencies for high and critical vulnerabilities; outputs step summaries.
- **Stage 3 (Next.js Build)**: Validates frontend buildability and verifies cache layers.
- **Stage 4 (Verdict Engine)**: Aggregates results, enforces gate pass/fail criteria, and posts a sticky pull-request summary comment with automatic re-evaluation on commit push (`synchronize`).

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js**: `>= 20.0.0` (v22 recommended)
- **pnpm**: `>= 12.6.0`
- **PostgreSQL**: `>= 15` (optional, for `@sentinel/database` local migrations)

### Installation

Clone the repository and install all workspace dependencies:

```bash
git clone https://github.com/PatidarNikunj/sentinel-reviewer.git
cd sentinel-reviewer
pnpm install
```

---

## ⚙️ Environment Configuration

### API Server (`apps/api-server/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port for the API server | `4000` |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | `development` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `LOG_LEVEL` | Morgan & application log verbosity (`debug`, `info`, `warn`, `error`) | `info` |

### Secure Worker (`apps/secure-worker/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `WORKER_MAX_RETRIES` | Maximum retry attempts for transient scan errors | `3` |
| `WORKER_RETRY_DELAY_MS` | Initial backoff delay in milliseconds | `2000` |
| `WORKER_BACKOFF_MULTIPLIER` | Exponential backoff multiplier | `2` |
| `WORKER_MAX_RETRY_DELAY_MS` | Maximum backoff delay cap | `30000` |
| `WORKER_POLL_INTERVAL_MS` | Job polling interval in milliseconds | `5000` |
| `WORKER_SCAN_TIMEOUT_MS` | Maximum scan execution timeout (5 minutes) | `300000` |
| `WORKER_ENABLE_PR_RETRIGGER` | Whether PR updates trigger automatic re-scans | `true` |

### Database (`packages/database/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@localhost:5432/sentinel_reviewer` |

---

## 💻 Development & Build Scripts

Run commands across all packages using Turborepo from the monorepo root:

```bash
# Start all applications in watch/dev mode
pnpm dev

# Build all applications and packages
pnpm build

# Lint all workspace projects
pnpm lint
```

### Running Specific Services

```bash
# Run Next.js web dashboard
pnpm --filter @sentinel/web dev

# Run Express API server (via tsx watch)
pnpm --filter @sentinel/api-server dev

# Run Secure Worker
pnpm --filter @sentinel/secure-worker dev

# Typecheck shared contracts
pnpm --filter @sentinel/types typecheck
pnpm --filter @sentinel/validation typecheck

# Database migrations & contract generation
pnpm --filter @sentinel/database db:generate
pnpm --filter @sentinel/database db:migrate
```

---

## 🔒 Security & Quality Standards

- **Input Defense**: All scan targets must conform to public GitHub or GitLab repository URL structures validated at both the boundary routes and domain layers.
- **Fail-Closed Gate**: Pull requests containing unaddressed critical SAST/SCA findings or build errors are blocked from merging by the automated GitHub Actions quality gate.
- **Ephemeral Sandbox Isolation**: Repositories scanned by the worker run in transient, isolated scratch environments cleaned up immediately upon completion.

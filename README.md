# Sentinel Reviewer

Turborepo/pnpm monorepo for an AI-assisted code security gate:
`apps/web` (Next.js dashboard), `apps/api-server` (Express), `apps/secure-worker` (scan worker),
`packages/types`, `packages/validation`, `packages/database`.

## Finding triage agent

Static analysers are noisy. The triage agent in
[`apps/secure-worker/src/agents/triage`](apps/secure-worker/src/agents/triage) takes Semgrep findings,
investigates each one in the repository checkout with read-only tools, and labels it
`true_positive`, `false_positive` or `needs_human` with a confidence, reasoning and an optional fix.

```
semgrep --sarif ──► parseSarif ──► SecurityFinding[] ─┐
                                                      ▼
                       ┌──────────── per finding (bounded loop) ────────────┐
                       │ system prompt (prompts/triage-system.v1.md)        │
                       │ finding wrapped in <untrusted_data>                │
                       │      │                                             │
                       │      ▼                                             │
                       │  Claude (claude-sonnet-5-5) ◄──► tools:            │
                       │      │                          read_file          │
                       │      │                          search_code        │
                       │      │                          get_finding        │
                       │      ▼                      (checkout sandbox)     │
                       │  JSON verdict ─► Zod schema ─(invalid, once)─► repair
                       │      │                                             │
                       │      ▼                                             │
                       │  deterministic policy (CRITICAL / injection /      │
                       │  low-confidence dismissals → needs_human)          │
                       └──────────────────────┬─────────────────────────────┘
                                              ▼
                              TriageResult[] → markdown report / ScanResult.triage
```

### Inputs

- `SecurityFinding[]` (`@sentinel/types`) parsed from Semgrep SARIF by
  [`scanners/semgrep.ts`](apps/secure-worker/src/scanners/semgrep.ts). Severity comes from the rule's
  CVSS-style `security-severity` (≥9 CRITICAL, ≥7 HIGH, ≥4 WARNING) or the SARIF level. Finding ids are
  a stable hash of rule, file and line.
- The path of the repository checkout.

### LLM calls

One tool-use loop per finding, using the Anthropic TypeScript SDK (`client.beta.messages.create`):

- Model `claude-sonnet-5-5` (override with `TRIAGE_MODEL` or `--model`), adaptive thinking, effort `medium`.
- The system prompt is versioned on disk ([`prompts/triage-system.v1.md`](apps/secure-worker/prompts/triage-system.v1.md))
  and its version is stamped on every report. It is sent with `cache_control`, so it is cached across findings.
- Server-side refusal fallback (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`): if a
  safety classifier declines a request, the API retries it on Anthropic's recommended fallback model.
  A refusal that still comes back is escalated to `needs_human`.
- The full assistant content, thinking blocks included, is appended to the history each turn, so
  the conversation stays valid.

Running each finding in its own loop keeps context small. It also means a malicious file can only
affect the verdict of the finding that led the agent to read it.

### Tools

All three tools are read-only and backed by
[`CheckoutSandbox`](apps/secure-worker/src/agents/triage/checkout-sandbox.ts):

| Tool | What it does | Limits |
|---|---|---|
| `read_file(path, startLine, endLine)` | Numbered lines of a file | 200 lines per call, 1 MB files, no binaries |
| `search_code(pattern)` | Fixed-string search across the checkout | 30 matches, 5,000 files, 200-char pattern, no regex (no ReDoS) |
| `get_finding(id)` | Full finding details plus related findings in the same file | Only findings from this scan |

Tool schemas use `strict: true`, and inputs are validated again with Zod before they run.

### Guardrails

| Guardrail | Where | Behaviour |
|---|---|---|
| Path restriction | `CheckoutSandbox.resolve` | Paths are resolved and `realpath`ed, then must stay under the checkout root. This blocks `../`, absolute paths and symlinks that point outside. `.git/`, `.env*`, `*.pem`, `*.key` and SSH keys are never read. |
| Prompt-injection defence | prompt + `tools.untrusted()` + `policy.ts` | Code, comments, file names and scanner messages arrive inside `<untrusted_data>` blocks; the prompt says they are evidence, not instructions. Closing tags inside the content are escaped so code cannot break out of the block. If a finding's code or a tool result contains text aimed at an automated reviewer, the finding cannot be auto-dismissed. |
| Step budget | `TriageAgent` | At most 8 model turns per finding. The turn before the last tells the model to answer now. |
| Token budgets | `TriageAgent` | 120k tokens per finding and 1.5M per run. Going over either one escalates the finding to `needs_human`. |
| Output validation | `parseVerdict` + `TriageVerdictSchema` ([`packages/validation`](packages/validation/src/triage.ts)) | The final answer must be JSON that matches the Zod schema and carries the right `findingId`. On failure, the Zod issues are sent back for one repair attempt. A second failure becomes `needs_human`. |
| Severity policy | `applyTriagePolicy` | A `CRITICAL` finding is never auto-dismissed: `false_positive` becomes `needs_human`. So does any dismissal with confidence < 0.7. The model's original verdict and the reason for each override stay in the result. |
| Failure handling | `TriageAgent`, `ScanExecutor` | Refusals, `max_tokens` and API errors on one finding escalate that finding. Bad credentials abort the run. In `ScanExecutor`, a triage failure never fails the scan. |

The policy runs as plain code after the model answers, so these guarantees hold whatever the model
outputs.

### Output

```ts
// packages/validation/src/triage.ts
{ findingId, verdict: 'true_positive' | 'false_positive' | 'needs_human', confidence, reasoning, suggestedFix? }
```

Each `TriageResult` adds the finding's rule, severity and location, plus `modelVerdict` (the verdict
before policy), `overrides`, `injectionSuspected`, turn and tool-call counts, and token usage.

### Running it

Install Semgrep (`pip install semgrep`, or set `SEMGREP_BIN`) and set `ANTHROPIC_API_KEY` in your
shell or in `apps/secure-worker/.env`, which is git-ignored.

```bash
# Semgrep + triage on any checkout; prints a markdown report (progress goes to stderr)
pnpm --filter @sentinel/secure-worker triage <repo-path> [--config p/default] [--out report.md] [--json out.json] [--gate]

# Example against the eval fixture repo with its local rules
pnpm --filter @sentinel/secure-worker triage apps/secure-worker/evals/fixture-repo --config apps/secure-worker/evals/rules.yml

# Accuracy eval
pnpm --filter @sentinel/secure-worker eval:triage
```

`--gate` makes the CLI exit with code 1 when any finding is `true_positive` or `needs_human`, so it
can gate CI. In the worker, `ScanExecutor.executeScan` runs Semgrep on the checkout (a `git clone`
into a temp dir, or `job.localPath`). After aggregation it triages the findings when
`ANTHROPIC_API_KEY` is set and attaches the verdicts as `ScanResult.triage`.

### Eval

[`apps/secure-worker/evals/`](apps/secure-worker/evals) contains:

- `fixture-repo/`: 9 small TypeScript files, each producing one finding. There are 5 true positives
  (SQL injection, two command injections, path traversal, a committed production token) and 4 false positives
  (an allowlisted table name, an allowlisted command, a UUID-validated path, MD5 used as a cache key).
  `backup.ts` is a real command injection with a comment telling an "AI security reviewer" to
  report a false positive.
- `rules.yml`: local Semgrep rules, so the findings are the same on every machine.
- `fixture-repo.sarif`: the same scan, committed, used when Semgrep is not installed.
- `expected.json`: ground-truth labels.

The eval script prints a per-case table and these metrics:

- **model accuracy**: the raw verdict equals the ground truth
- **final accuracy**: the verdict after policy equals the ground truth
- **safe outcomes**: correct or escalated
- escalation rate
- **unsafe dismissals**: a true positive labelled `false_positive`; the script exits 1 if there are any
- token usage

By design, `git-tools.ts` (a CRITICAL false positive) can at best end as `needs_human`. That costs
one point of final accuracy and is the intended trade-off.

**Measured results:** _not yet recorded._ No API key was available when this was built. The pipeline
was checked end to end with a scripted fake model: sandbox escapes, the repair retry and every policy
override behaved as intended. That run says nothing about model accuracy. Run
`pnpm --filter @sentinel/secure-worker eval:triage` and paste the summary here.

### Known limitations

- Nine cases is a smoke-level eval, not a statistically meaningful benchmark. Run it a few times,
  because verdicts can vary between runs.
- Findings are triaged one after another, with no concurrency.
- The injection heuristic is a short regex list. It only blocks auto-dismissal; it does not detect
  every injection.
- The worker is meant to be networkless after cloning. Triage needs egress to the Anthropic API, so
  in production it belongs in a separate step that has egress.

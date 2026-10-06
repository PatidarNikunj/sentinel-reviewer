// ─────────────────────────────────────────────────────────────────────────────
// @sentinel/api-server — Application Entry Point
// Express.js server with Clean Architecture foundations
// ─────────────────────────────────────────────────────────────────────────────

import { createApp } from './infrastructure/http/app.js';
import { config } from './infrastructure/config/env.js';

const PORT = config.PORT;

const app = createApp();

app.listen(PORT, () => {
  console.log(`🛡️  Sentinel API Server running on http://localhost:${PORT}`);
  console.log(`📋 Environment: ${config.NODE_ENV}`);
});

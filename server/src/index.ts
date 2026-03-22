import { createApp } from './app.js';
import { getLlmApiBaseUrl } from './lib/llmConfig.js';

const PORT = Number(process.env.APP_PORT ?? process.env.API_PORT ?? 3001);
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`TestAlly server running on port ${PORT}`);
  const llmBase = getLlmApiBaseUrl();
  if (llmBase) {
    console.log(`Raw-fetch LLM base URL: ${llmBase.origin}${llmBase.pathname.replace(/\/$/, '') || ''}`);
  } else {
    console.log(
      'Raw-fetch LLM not configured — set LLM_API_URL or INFERENCE_LLM_PROVIDER_* / CLOUDFEST_HOST',
    );
  }
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\n[TestAlly] Port ${PORT} is already in use (EADDRINUSE). The API never starts, so Chat/infer cannot reach any LLM.\n` +
        `  • Stop whatever owns the port:  lsof -i :${PORT}   then kill that PID, or stop Docker using it.\n` +
        `  • Or use another port: set API_PORT=3002 in repo-root .env (Vite reads API_PORT for /api proxy).\n`,
    );
  }
});

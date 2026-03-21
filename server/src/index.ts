import { createApp } from './app.js';
import { getLlmApiBaseUrl } from './lib/llmConfig.js';

const PORT = Number(process.env.API_PORT ?? 3001);
const app = createApp();

app.listen(PORT, () => {
  console.log(`TestAlly server running on port ${PORT}`);
  const llmBase = getLlmApiBaseUrl();
  if (llmBase) {
    console.log(`LLM API base URL: ${llmBase.origin}`);
  } else {
    console.log(
      'LLM_API_URL not set — configure LLM_API_URL (and optional LLM_TOKEN) for generation',
    );
  }
});

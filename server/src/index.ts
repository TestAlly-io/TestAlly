import { createApp } from './app.js';
import { getRoleBaseUrl } from './lib/llm/config.js';

const PORT = Number(process.env.API_PORT ?? 3001);
const app = createApp();

app.listen(PORT, () => {
  console.log(`TestAlly server running on port ${PORT}`);
  const inferenceBase = getRoleBaseUrl('inference');
  if (inferenceBase) {
    console.log(`Inference LLM base URL: ${inferenceBase}`);
  } else {
    console.log(
      'Inference LLM not configured — set INFERENCE_LLM_PROVIDER_HOST or CLOUDFEST_HOST',
    );
  }
});

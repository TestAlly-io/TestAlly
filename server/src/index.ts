import { createApp } from './app.js';

const PORT = Number(process.env.API_PORT ?? 3001);
const app = createApp();

app.listen(PORT, () => {
  console.log(`TestAlly server running on port ${PORT}`);
});

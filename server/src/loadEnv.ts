import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Repo-root `.env` (works when cwd is `server/` or from `build/server`). */
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

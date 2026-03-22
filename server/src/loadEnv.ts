import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = path.resolve(__dirname, '../..');

const mode = process.env.NODE_ENV || 'development';

/**
 * Load in ascending priority (each subsequent file overrides the previous):
 *   .env              – shared defaults
 *   .env.local        – local overrides (not committed)
 *   .env.{mode}       – mode-specific (e.g. .env.production)
 *   .env.{mode}.local – mode-specific local overrides
 */
const envFiles = [
  '.env',
  '.env.local',
  `.env.${mode}`,
  `.env.${mode}.local`,
];

for (const file of envFiles) {
  dotenv.config({ path: path.join(root, file), override: true });
}

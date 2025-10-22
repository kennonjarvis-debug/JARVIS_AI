import { build } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  plugins: [],
  alias: {
    '@jarvis/shared': path.resolve(__dirname, './packages/shared/dist/index.js'),
  },
};

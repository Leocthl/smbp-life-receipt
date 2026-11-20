import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 5196 belongs to another project on this machine; coordinator assigned 5198.
  server: { host: '127.0.0.1', port: 5198, strictPort: true },
  test: { include: ['tests/**/*.test.ts'] },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/German_vocab/', // For subdirectory deployment
  plugins: [react()],
});

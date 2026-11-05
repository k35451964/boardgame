import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 주소가 https://<아이디>.github.io/boardgame/ 이므로 base를 맞춰 준다.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/boardgame/',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});

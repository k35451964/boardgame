import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 주소가 https://<아이디>.github.io/boardgame/ 이므로 base를 맞춰 준다.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/boardgame/',
  plugins: [react()],
  build: {
    // Firebase SDK가 들어가서 500kB를 조금 넘는다 (압축하면 약 155kB). 이 정도는 괜찮다.
    chunkSizeWarningLimit: 700,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});

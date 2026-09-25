import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
  },
  server: {
    port: 3000,
    open: false,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor: React runtime
          'vendor-react': ['react', 'react-dom'],
          // Vendor: Lucide icons
          'vendor-icons': ['lucide-react'],
          // Vendor: DOCX parser
          'vendor-mammoth': ['mammoth'],
        },
      },
    },
  },
});

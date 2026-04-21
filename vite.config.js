import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        content: resolve(__dirname, 'src/content.js'),
        background: resolve(__dirname, 'src/background.js'),
      },
      output: {
        entryFileNames: (chunk) =>
          ['content', 'background'].includes(chunk.name)
            ? '[name].js'
            : 'assets/[name]-[hash].js',
      },
    },
  },
});

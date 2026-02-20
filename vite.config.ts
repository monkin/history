import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'HistoryList',
      fileName: (format) => `history-list.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
  },
})

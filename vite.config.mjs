import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'vite';
import external from 'vite-plugin-external';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    minify: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
      fileName: '[name]'
    }
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.build.json'
    }),
    external({
      nodeBuiltins: true
    })
  ],
  test: {
    name: 'fs-manip',
    dir: './test',
    environment: 'node'
  }
});

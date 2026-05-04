import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./Unit Testing/setup.jsx'],
    include: ['**/*.test.{js,jsx}'],
    env: {
      JWT_SECRET: 'test-secret-key-123',
      NODE_ENV: 'test',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../frontend/src'),
      '@backend': path.resolve(__dirname, '../backend'),
      '@frontend': path.resolve(__dirname, '../frontend/src'),
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom'),
      'axios': path.resolve(__dirname, 'node_modules/axios'),
      'react-chartjs-2': path.resolve(__dirname, 'Unit Testing/mocks/react-chartjs-2.js'),
      'nodemailer': path.resolve(__dirname, '../backend/node_modules/nodemailer'),
      'node-fetch': path.resolve(__dirname, 'node_modules/node-fetch'),
      '@react-oauth/google': path.resolve(__dirname, 'Unit Testing/mocks/@react-oauth-google.js'),
      'react-canvas-draw': path.resolve(__dirname, 'Unit Testing/mocks/react-canvas-draw.jsx'),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom', 'axios', 'react-chartjs-2', 'nodemailer', 'node-fetch', '@react-oauth/google', 'react-canvas-draw'],
  },
});

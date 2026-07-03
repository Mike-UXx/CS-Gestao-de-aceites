import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // Em dev/preview local fica em '/'. Para GitHub Pages (subpasta do repo),
  // buildar com VITE_GH_BASE='/CS-Gestao-de-aceites/'.
  base: process.env.VITE_GH_BASE || '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

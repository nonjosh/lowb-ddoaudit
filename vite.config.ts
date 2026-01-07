import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEFAULT_REPO_NAME = 'lowb-ddoaudit'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const githubRepo = env.GITHUB_REPOSITORY
  const repoName = githubRepo?.split('/')?.[1] || DEFAULT_REPO_NAME

  return {
    base: mode === 'production' ? `/${repoName}/` : '/',
    plugins: [react()],
    server: {
      host: true,
    },
    preview: {
      host: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})

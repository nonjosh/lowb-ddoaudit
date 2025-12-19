import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

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
  }
})

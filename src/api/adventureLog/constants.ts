/**
 * Adventure log API (Cloud Run). The base URL is public; the write password is
 * never bundled and is supplied by the user at edit time.
 */

const DEFAULT_BASE_URL = 'https://ddo-log-325677774747.us-central1.run.app'

const envBaseUrl = (import.meta.env as Record<string, string | undefined>).VITE_ADVENTURE_LOG_API_URL

export const ADVENTURE_LOG_API_URL = (envBaseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')

export const ADVENTURE_LOG_PASSWORD_STORAGE_KEY = 'lowb-adventure-log-password'

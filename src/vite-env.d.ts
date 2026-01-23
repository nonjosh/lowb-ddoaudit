/// <reference types="vite/client" />

// Type declarations for data files
declare module '@/data/lowb.json' {
  const value: Record<string, string[]>
  export default value
}

declare module '@/data/character_ids.csv?raw' {
  const content: string
  export default content
}

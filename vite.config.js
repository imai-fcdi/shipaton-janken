import { defineConfig } from 'vite'

// SUPABASE_* を VITE_ 接頭辞なしでクライアントに公開する（公開可能なキーのみ使用）
export default defineConfig({
  envPrefix: ['VITE_', 'SUPABASE_PROJECT_URL', 'SUPABASE_PUBLISHABLE_KEY'],
})

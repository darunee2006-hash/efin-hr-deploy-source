import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kiupksenfqcmdgyxvzuw.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpdXBrc2VuZnFjbWRneXh2enV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDA0NjAsImV4cCI6MjA5MzYxNjQ2MH0.MWBknNsruJeZSSykE_YIcTK2R2WMdG5t4TI_IP42YS4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'efin-hr-auth',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: (name, acquireTimeout, fn) => fn(),
  }
})

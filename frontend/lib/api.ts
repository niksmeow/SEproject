import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
})

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  
  return config
})

export default api

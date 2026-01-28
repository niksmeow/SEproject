import axios from 'axios'
import { supabase } from './supabase'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  
  return config
})

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response, // Success - pass through
  async (error) => {
    const originalRequest = error.config
    
    // Check if this is an optional endpoint that can fail silently
    const isOptionalEndpoint = originalRequest?.url?.includes('/application-status')
    
    // If 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        // Get current session first
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        
        if (!currentSession) {
          // For optional endpoints, fail silently instead of redirecting
          if (isOptionalEndpoint) {
            return Promise.reject(error) // Let the caller handle it
          }
          // No session - redirect to login
          window.location.href = '/login'
          return Promise.reject(new Error('No active session'))
        }
        
        // Try to refresh the session
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
        
        if (refreshError || !session) {
          // For optional endpoints, fail silently instead of redirecting
          if (isOptionalEndpoint) {
            return Promise.reject(error) // Let the caller handle it
          }
          // Refresh failed - redirect to login
          window.location.href = '/login'
          return Promise.reject(refreshError || new Error('Session expired'))
        }
        
        // Update the authorization header with new token
        originalRequest.headers.Authorization = `Bearer ${session.access_token}`
        
        // Retry the original request
        return api(originalRequest)
      } catch (refreshErr) {
        // For optional endpoints, fail silently instead of redirecting
        if (isOptionalEndpoint) {
          return Promise.reject(error) // Let the caller handle it
        }
        // Refresh failed - redirect to login
        window.location.href = '/login'
        return Promise.reject(refreshErr)
      }
    }
    
    // For other errors, just reject
    return Promise.reject(error)
  }
)

export default api

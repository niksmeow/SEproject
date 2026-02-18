import { useState, useEffect } from 'react'

// Mock user type
interface MockUser {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
  }
}

export function useAuth() {
  const [user, setUser] = useState<MockUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading delay
    setTimeout(() => {
      // Return mock user (demo mode)
      setUser({
        id: 'mock-user-id',
        email: 'demo@example.com',
        user_metadata: {
          full_name: 'Demo User',
        },
      })
      setLoading(false)
    }, 100)
  }, [])

  const signOut = async () => {
    // Demo mode - just clear user
    setUser(null)
  }

  return { user, loading, signOut }
}

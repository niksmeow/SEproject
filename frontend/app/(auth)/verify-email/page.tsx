'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function VerifyEmailPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    // Check if there's a token in the URL (from email link)
    const token = searchParams.get('token')
    const type = searchParams.get('type')

    if (token && type === 'email') {
      handleVerifyEmail(token)
    }
  }, [searchParams])

  const handleVerifyEmail = async (token: string) => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email',
      })

      if (error) throw error

      setMessage('Email verified! Redirecting to dashboard...')
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResendEmail = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Please sign up first')
        return
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email!,
      })

      if (error) throw error

      setMessage('Verification email sent! Check your inbox.')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 glass p-8 rounded-2xl shadow-lg">
        <div>
          <h2 className="text-3xl font-bold text-center">Verify your email</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We sent a verification link to your email address
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {message}
          </div>
        )}

        <div className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            Click the link in your email to verify your account. If you didn't receive the email, check your spam folder or resend it.
          </p>

          <button
            onClick={handleResendEmail}
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Resend verification email'}
          </button>

          <Link
            href="/login"
            className="block text-center text-sm text-blue-600 hover:text-blue-500"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}

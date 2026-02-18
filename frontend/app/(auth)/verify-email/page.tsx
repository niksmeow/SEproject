'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function VerifyEmailPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Auto-redirect to dashboard (demo mode)
    const timer = setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
    return () => clearTimeout(timer)
  }, [router])

  const handleResendEmail = async () => {
    setLoading(true)
    // Simulate sending email
    await new Promise(resolve => setTimeout(resolve, 500))
    setMessage('Verification email sent! (Demo mode)')
    setLoading(false)
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

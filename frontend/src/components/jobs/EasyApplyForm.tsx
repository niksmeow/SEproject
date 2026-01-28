import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '@/lib/api'
import { supabase } from '@/lib/supabase'

interface EasyApplyFormProps {
  jobId: string
  jobTitle: string
  jobCompany: string
  onSuccess: () => void
  onCancel: () => void
}

export default function EasyApplyForm({ jobId, jobTitle, jobCompany, onSuccess, onCancel }: EasyApplyFormProps) {
  const [resumes, setResumes] = useState<any[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string>('')
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    cover_letter: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadResumes()
    loadUserProfile()
  }, [])

  const loadResumes = async () => {
    try {
      const response = await api.get('/api/resume')
      setResumes(response.data)
      if (response.data.length > 0) {
        setSelectedResumeId(response.data[0].id)
      }
    } catch (err) {
      console.error('Error loading resumes:', err)
    }
  }

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setFormData(prev => ({
          ...prev,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || '',
        }))
      }
    } catch (err) {
      console.error('Error loading user profile:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!selectedResumeId) {
      setError('Please select a resume')
      setLoading(false)
      return
    }

    try {
      await api.post(`/api/applications/easy-apply/${jobId}`, {
        resume_id: selectedResumeId,
        answers: {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          cover_letter: formData.cover_letter,
        }
      })
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit application')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Easy Apply</h2>
            <p className="text-sm text-gray-600 mt-1">
              {jobTitle} at {jobCompany}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Resume Selection */}
          <div>
            <label htmlFor="resume" className="block text-sm font-medium text-gray-700 mb-2">
              Select Resume *
            </label>
            <select
              id="resume"
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {resumes.length === 0 ? (
                <option value="">No resumes available. Please upload a resume first.</option>
              ) : (
                resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    Resume {new Date(resume.created_at).toLocaleDateString()}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              id="full_name"
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* Cover Letter */}
          <div>
            <label htmlFor="cover_letter" className="block text-sm font-medium text-gray-700 mb-2">
              Cover Letter (Optional)
            </label>
            <textarea
              id="cover_letter"
              value={formData.cover_letter}
              onChange={(e) => setFormData({ ...formData, cover_letter: e.target.value })}
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tell us why you're interested in this position..."
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || resumes.length === 0}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

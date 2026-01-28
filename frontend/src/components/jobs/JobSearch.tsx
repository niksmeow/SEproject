import { useState } from 'react'
import { motion } from 'framer-motion'
import api from '@/lib/api'

interface JobSearchProps {
  onSuccess: () => void
  onCancel: () => void
}

export default function JobSearch({ onSuccess, onCancel }: JobSearchProps) {
  const [formData, setFormData] = useState({
    keywords: '', // Optional keywords for specific field (e.g., "artificial intelligence")
    location: '', // Optional location
    skip_duplicates: true
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      // Use the new discover endpoint that finds jobs based on resume skills and keywords
      const response = await api.post('/api/jobs/discover', {
        keywords: formData.keywords || '', // Optional keywords for specific field
        location: formData.location || '', // Optional location
        limit: 50 // Get more jobs for better matching
      })
      setResults(response.data)
      // Show success message
      if (formData.keywords) {
        alert(`Found ${response.data.jobs?.length || 0} jobs for "${formData.keywords}". Old search results have been replaced.`)
      }
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to discover jobs. Make sure you have uploaded a resume with skills.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6 rounded-lg"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Discover Jobs</h2>
          <p className="text-sm text-gray-600 mt-1">
            Find jobs based on your resume skills and career profile (LinkedIn-style)
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
        {/* Keywords (Optional) */}
        <div>
          <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-2">
            Job Field / Keywords <span className="text-gray-400 text-xs">(Optional - leave empty to use only your skills)</span>
          </label>
          <input
            id="keywords"
            type="text"
            value={formData.keywords}
            onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="e.g., Artificial Intelligence, Data Science, Machine Learning, Software Engineer"
          />
          <p className="text-xs text-gray-500 mt-1">
            Specify a field to focus your search (e.g., "artificial intelligence" for AI jobs, "data science" for data jobs)
          </p>
        </div>

        {/* Location (Optional) */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
            Location <span className="text-gray-400 text-xs">(Optional - leave empty for global search)</span>
          </label>
          <input
            id="location"
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="e.g., San Francisco, Remote, New York (or leave empty for anywhere)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Jobs will be discovered based on your resume skills {formData.keywords ? `and "${formData.keywords}" field` : ''}, similar to LinkedIn recommendations
          </p>
        </div>

        {/* Skip Duplicates */}
        <div className="flex items-center">
          <input
            id="skip_duplicates"
            type="checkbox"
            checked={formData.skip_duplicates}
            onChange={(e) => setFormData({ ...formData, skip_duplicates: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="skip_duplicates" className="ml-2 text-sm text-gray-700">
            Skip duplicate jobs
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-50 border border-green-200 rounded-lg"
          >
            <div className="text-sm text-green-800">
              <p className="font-semibold">✓ {results.message}</p>
              {results.skills_used && (
                <p className="mt-1 text-xs">Based on skills: {results.skills_used.join(', ')}</p>
              )}
              {results.skipped > 0 && (
                <p className="mt-1">Skipped {results.skipped} duplicate job(s)</p>
              )}
              {results.total_found && (
                <p className="mt-1">Found {results.total_found} job(s) total</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Discovering Jobs...
              </span>
            ) : (
              'Discover Jobs'
            )}
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
  )
}

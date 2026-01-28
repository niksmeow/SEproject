import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import api from '@/lib/api'

interface JobCardProps {
  job: {
    id: string
    title: string
    company: string
    match_score?: number
    classification: 'green' | 'yellow' | 'red'
    url?: string
    has_applied?: boolean
    application_status?: string
  }
  onApply?: () => void
}

export default function JobCard({ job, onApply }: JobCardProps) {
  const [applying, setApplying] = useState(false)

  const getClassificationColor = () => {
    switch (job.classification) {
      case 'green':
        return 'border-green-200 bg-green-50/50'
      case 'yellow':
        return 'border-yellow-200 bg-yellow-50/50'
      case 'red':
        return 'border-red-200 bg-red-50/50'
      default:
        return 'border-gray-200 bg-white/50'
    }
  }

  const getMatchPercentage = () => {
    if (job.match_score !== undefined) {
      return Math.round(job.match_score * 100)
    }
    return null
  }

  const canApply = (job.classification === 'green' || job.classification === 'yellow') && !job.has_applied

  const handleExternalApply = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!job.url) return
    
    setApplying(true)
    try {
      const response = await api.post(`/api/applications/external/${job.id}`)
      if (response.data.external_url) {
        window.open(response.data.external_url, '_blank')
      }
      if (onApply) {
        onApply()
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to apply')
    } finally {
      setApplying(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link to={`/jobs/${job.id}`}>
        <div className={`glass p-4 rounded-lg cursor-pointer hover:shadow-lg transition-all duration-300 ${getClassificationColor()}`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{job.title}</h3>
                {job.has_applied && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Applied
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">{job.company}</p>
            </div>
            {getMatchPercentage() !== null && (
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {getMatchPercentage()}%
                </div>
                <div className="text-xs text-gray-500">match</div>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center text-xs text-gray-500">
              <span className="capitalize">{job.classification}</span>
              <span className="mx-2">•</span>
              <span>View details →</span>
            </div>
            {canApply && job.url && (
              <button
                onClick={handleExternalApply}
                disabled={applying}
                className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {applying ? 'Applying...' : 'Apply'}
              </button>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

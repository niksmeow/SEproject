import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { motion } from 'framer-motion'

interface ResumeCardProps {
  resume: {
    id: string
    filename: string
    file_type: 'pdf' | 'docx' | null
    skills: string[]
    skills_count: number
    is_optimized: boolean
    created_at: string
  }
  onDelete: (id: string) => void
}

export default function ResumeCard({ resume, onDelete }: ResumeCardProps) {
  const navigate = useNavigate()
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const response = await api.get(`/api/resume/${resume.id}/download`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', resume.filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading resume:', error)
      alert('Failed to download resume')
    } finally {
      setDownloading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${resume.filename}"?`)) {
      return
    }

    setDeleting(true)
    try {
      await api.delete(`/api/resume/${resume.id}`)
      onDelete(resume.id)
    } catch (error) {
      console.error('Error deleting resume:', error)
      alert('Failed to delete resume')
    } finally {
      setDeleting(false)
    }
  }

  const handleView = () => {
    navigate(`/resumes/view?id=${resume.id}`)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6 rounded-lg border border-gray-200 hover:border-gray-300 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {resume.filename}
            </h3>
            {resume.is_optimized && (
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                Optimized
              </span>
            )}
            {resume.file_type && (
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded uppercase">
                {resume.file_type}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Uploaded {formatDate(resume.created_at)}
          </p>
          {resume.skills_count > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {resume.skills_count} skill{resume.skills_count !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {resume.skills && resume.skills.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {resume.skills.slice(0, 5).map((skill, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
              >
                {skill}
              </span>
            ))}
            {resume.skills.length > 5 && (
              <span className="px-2 py-1 text-xs text-gray-500">
                +{resume.skills.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleView}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          View
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {downloading ? 'Downloading...' : 'Download'}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </motion.div>
  )
}

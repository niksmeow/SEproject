import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import api from '@/lib/api'
import { motion } from 'framer-motion'

interface ResumeUploadProps {
  onSuccess?: () => void
}

export default function ResumeUpload({ onSuccess }: ResumeUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setUploading(true)
    setError(null)
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append('file', file)

      await api.post('/api/resume/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setSuccess(true)
      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 1500)
      } else {
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload resume')
    } finally {
      setUploading(false)
    }
  }, [onSuccess])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  })

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`glass p-8 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-300 ${
          isDragActive
            ? 'border-blue-400 bg-blue-50/50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          {uploading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600">Uploading and parsing resume...</p>
            </motion.div>
          ) : success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-2"
            >
              <div className="text-green-600 text-4xl">✓</div>
              <p className="text-green-600 font-medium">Resume uploaded successfully!</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <div className="text-4xl text-gray-400">📄</div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive ? 'Drop your resume here' : 'Upload your resume'}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Drag and drop a PDF or DOCX file, or click to select
                </p>
                <p className="text-xs text-gray-400 mt-1">Max file size: 5MB</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
        >
          {error}
        </motion.div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import api from '@/lib/api'
import ResumeUpload from '@/components/resume/ResumeUpload'
import ResumeCard from '@/components/resume/ResumeCard'
import { motion } from 'framer-motion'

interface Resume {
  id: string
  filename: string
  file_type: 'pdf' | 'docx' | null
  skills: string[]
  skills_count: number
  is_optimized: boolean
  created_at: string
}

export default function ResumeManagement() {
  const navigate = useNavigate()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    checkUser()
    loadResumes()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      navigate('/login')
    }
  }

  const loadResumes = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/resume')
      setResumes(response.data || [])
    } catch (error) {
      console.error('Error loading resumes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (resumeId: string) => {
    setResumes(resumes.filter(r => r.id !== resumeId))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="glass border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Resumes</h1>
              <p className="text-sm text-gray-600">Manage your uploaded and optimized resumes</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Dashboard
              </button>
              <button
                onClick={() => setShowUpload(!showUpload)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                {showUpload ? 'Cancel' : 'Upload Resume'}
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8"
          >
            <ResumeUpload
              onSuccess={() => {
                setShowUpload(false)
                loadResumes()
              }}
            />
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass p-6 rounded-lg">
            <div className="text-3xl font-bold text-gray-900">{resumes.length}</div>
            <div className="text-sm text-gray-600 mt-1">Total Resumes</div>
          </div>
          <div className="glass p-6 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">
              {resumes.filter(r => r.is_optimized).length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Optimized</div>
          </div>
          <div className="glass p-6 rounded-lg">
            <div className="text-3xl font-bold text-gray-900">
              {resumes.filter(r => !r.is_optimized).length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Original</div>
          </div>
        </div>

        {/* Empty State */}
        {resumes.length === 0 && !showUpload && (
          <div className="glass p-12 rounded-lg text-center">
            <div className="text-4xl text-gray-400 mb-4">📄</div>
            <p className="text-gray-600 text-lg mb-4">No resumes uploaded yet</p>
            <p className="text-gray-500 mb-6">
              Upload your first resume to get started with job matching and optimization
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Upload Resume
            </button>
          </div>
        )}

        {/* Resume Grid */}
        {resumes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume) => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

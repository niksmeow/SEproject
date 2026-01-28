'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import JobColumns from '@/components/dashboard/JobColumns'
import ResumeUpload from '@/components/resume/ResumeUpload'
import AddJobForm from '@/components/jobs/AddJobForm'
import { motion } from 'framer-motion'

interface Job {
  id: string
  title: string
  company: string
  match_score?: number
  classification: 'green' | 'yellow' | 'red'
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [resumes, setResumes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [showAddJob, setShowAddJob] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadData()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      setUser(user)
    }
  }

  const loadData = async () => {
    try {
      // Load resumes
      const resumesRes = await api.get('/api/resume')
      setResumes(resumesRes.data)

      // Load jobs
      const jobsRes = await api.get('/api/jobs')
      const jobsData = jobsRes.data

      // Match resumes to jobs if we have both
      if (resumesRes.data.length > 0 && jobsData.length > 0) {
        const resumeId = resumesRes.data[0].id
        const jobIds = jobsData.map((j: any) => j.id)

        try {
          const matchRes = await api.post('/api/matching/match', {
            resume_id: resumeId,
            job_ids: jobIds,
          })

          // Update jobs with match data
          const matches = matchRes.data.matches || []
          const jobsWithMatches = jobsData.map((job: any) => {
            const match = matches.find((m: any) => m.job_id === job.id)
            return {
              ...job,
              match_score: match?.match_score,
              classification: match?.classification || 'red',
            }
          })
          setJobs(jobsWithMatches)
        } catch (err) {
          // If matching fails, just show jobs without matches
          setJobs(jobsData.map((j: any) => ({ ...j, classification: 'red' as const })))
        }
      } else {
        setJobs(jobsData.map((j: any) => ({ ...j, classification: 'red' as const })))
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const eligibleJobs = jobs.filter((j) => j.classification === 'green')
  const closeJobs = jobs.filter((j) => j.classification === 'yellow')
  const lockedJobs = jobs.filter((j) => j.classification === 'red')

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
              <h1 className="text-2xl font-bold text-gray-900">CareerOS</h1>
              <p className="text-sm text-gray-600">AI-Powered Career Platform</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAddJob(!showAddJob)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Add Job
              </button>
              <button
                onClick={() => setShowUpload(!showUpload)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {resumes.length > 0 ? 'Upload New Resume' : 'Upload Resume'}
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
            <ResumeUpload />
          </motion.div>
        )}

        {/* Add Job Section */}
        {showAddJob && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8"
          >
            <AddJobForm
              onSuccess={() => {
                setShowAddJob(false)
                loadData()
              }}
              onCancel={() => setShowAddJob(false)}
            />
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass p-6 rounded-lg">
            <div className="text-3xl font-bold text-gray-900">{jobs.length}</div>
            <div className="text-sm text-gray-600 mt-1">Total Jobs</div>
          </div>
          <div className="glass p-6 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{eligibleJobs.length}</div>
            <div className="text-sm text-gray-600 mt-1">Eligible</div>
          </div>
          <div className="glass p-6 rounded-lg">
            <div className="text-3xl font-bold text-gray-900">{resumes.length}</div>
            <div className="text-sm text-gray-600 mt-1">Resumes</div>
          </div>
        </div>

        {/* Job Columns */}
        <JobColumns
          eligibleJobs={eligibleJobs}
          closeJobs={closeJobs}
          lockedJobs={lockedJobs}
        />
      </main>
    </div>
  )
}

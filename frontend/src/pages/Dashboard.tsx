import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '@/lib/api'
import JobColumns from '@/components/dashboard/JobColumns'
import ResumeUpload from '@/components/resume/ResumeUpload'
import AddJobForm from '@/components/jobs/AddJobForm'
import JobSearch from '@/components/jobs/JobSearch'
import Footer from '@/components/layout/Footer'
import AdSlot from '@/components/ads/AdSlot'
import { motion } from 'framer-motion'

interface Job {
  id: string
  title: string
  company: string
  match_score?: number
  classification: 'green' | 'yellow' | 'red'
  url?: string
  has_applied?: boolean
  application_status?: string
  search_keywords?: string
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [resumes, setResumes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [showAddJob, setShowAddJob] = useState(false)
  const [showJobSearch, setShowJobSearch] = useState(false)
  const navigate = useNavigate()
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    
    // Create new AbortController for this effect
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal
    
    loadData(signal)
    
    // Cleanup function
    return () => {
      isMountedRef.current = false
      // Abort any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])  // Load once on mount
  
  // Function to reload data (exposed for JobSearch callback)
  const reloadData = async () => {
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal
    await loadData(signal)
  }

  const loadData = async (signal?: AbortSignal) => {
    // Check if already aborted
    if (signal?.aborted) {
      return
    }

    try {
      console.log('Loading data...')
      
      // Load resumes
      console.log('Fetching resumes...')
      const resumesRes = await api.get('/api/resume', { signal })
      
      // Check if component is still mounted and not aborted
      if (!isMountedRef.current || signal?.aborted) return
      
      console.log('Resumes response:', resumesRes.data)
      if (isMountedRef.current) {
        setResumes(resumesRes.data)
      }

      // Load all jobs (search results)
      console.log('Fetching jobs...')
      const jobsRes = await api.get(`/api/jobs?job_type=search`, { signal })
      
      // Check if component is still mounted and not aborted
      if (!isMountedRef.current || signal?.aborted) return
      
      console.log('Jobs response:', jobsRes)
      console.log('Jobs data:', jobsRes.data)
      const jobsData = jobsRes.data || []

      console.log(`Found ${jobsData.length} jobs`)

      // Match resumes to jobs for both tabs if resume exists
      // "For You" tab: filter to only show good matches
      // "Search Results" tab: show all jobs but with match scores
      let jobsWithMatches: any[] = []
      if (resumesRes.data.length > 0 && jobsData.length > 0) {
        const resumeId = resumesRes.data[0].id
        const jobIds = jobsData.map((j: any) => j.id)

        try {
          console.log('Matching resumes to jobs...')
          const matchRes = await api.post('/api/matching/match', {
            resume_id: resumeId,
            job_ids: jobIds,
          }, { signal })
          
          // Check if component is still mounted and not aborted
          if (!isMountedRef.current || signal?.aborted) return
          
          console.log('Match response:', matchRes.data)

          // Update jobs with match data
          const matches = matchRes.data.matches || []
          jobsWithMatches = jobsData.map((job: any) => {
            const match = matches.find((m: any) => m.job_id === job.id)
            return {
              ...job,
              match_score: match?.match_score,
              classification: match?.classification || 'red',
            }
          })
          
          // Show all jobs but sort by match score (highest first)
          jobsWithMatches.sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
          console.log(`Showing ${jobsWithMatches.length} jobs with match scores`)
        } catch (err: any) {
          // Don't log AbortError as it's expected during cleanup
          if (err.name === 'AbortError' || err.name === 'CanceledError' || signal?.aborted) {
            return
          }
          console.error('Matching error:', err)
          console.log('Setting jobs without matches due to matching error')
          // If matching fails, just show jobs without matches
          jobsWithMatches = jobsData.map((j: any) => ({ ...j, classification: 'red' as const }))
        }
      } else {
        // No resume or no jobs, show jobs without matching
        console.log(`Setting jobs without matches (hasResume: ${resumesRes.data.length > 0})`)
        jobsWithMatches = jobsData.map((j: any) => ({ 
          ...j, 
          classification: 'red' as const,
          match_score: undefined
        }))
      }

      // Check if component is still mounted before setting state
      if (!isMountedRef.current || signal?.aborted) return

      // Set jobs first, then fetch application status in background (non-blocking)
      setJobs(jobsWithMatches)
      
      // Fetch application status for each job in background (don't block UI)
      // Use Promise.allSettled to handle individual failures gracefully
      Promise.allSettled(
        jobsWithMatches.map(async (job: any) => {
          // Check if aborted before each request
          if (signal?.aborted || !isMountedRef.current) {
            return {
              jobId: job.id,
              has_applied: false,
            }
          }
          
          try {
            const statusRes = await api.get(`/api/jobs/${job.id}/application-status`, { 
              signal,
              // Suppress 401 and 404 errors for application status - it's optional
              validateStatus: (status) => {
                // Return true for status codes that should NOT throw errors
                // Allow 401, 404, and 2xx to pass through without throwing
                // Only 5xx will throw errors
                return status < 500
              }
            })
            return {
              jobId: job.id,
              has_applied: statusRes.data.has_applied,
              application_status: statusRes.data.application?.status,
            }
          } catch (err: any) {
            // Don't log AbortError - it's expected during cleanup
            if (err.name === 'AbortError' || err.name === 'CanceledError' || signal?.aborted) {
              return {
                jobId: job.id,
                has_applied: false,
              }
            }
            // Silently fail for 401/404 errors - application status is optional
            // These errors are expected if user is not authenticated or job doesn't exist
            if (err.response?.status === 401 || err.response?.status === 404) {
              return {
                jobId: job.id,
                has_applied: false,
              }
            }
            // For other errors, also fail silently since application status is optional
            return {
              jobId: job.id,
              has_applied: false,
            }
          }
        })
      ).then((results) => {
        // Only update state if component is still mounted
        if (!isMountedRef.current || signal?.aborted) return
        
        // Extract successful results
        const statuses = results
          .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
          .map(result => result.value)
        
        // Update jobs with application status
        setJobs((prevJobs: any[]) => 
          prevJobs.map((job: any) => {
            const status = statuses.find((s: any) => s.jobId === job.id)
            return status ? {
              ...job,
              has_applied: status.has_applied,
              application_status: status.application_status,
            } : job
          })
        )
      }).catch((err) => {
        // Don't log AbortError - it's expected during cleanup
        if (err.name === 'AbortError' || err.name === 'CanceledError') {
          return
        }
        // Silently fail - application status is optional
      })
    } catch (error: any) {
      // Don't log AbortError - it's expected during cleanup
      if (error.name === 'AbortError' || error.name === 'CanceledError' || signal?.aborted) {
        return
      }
      
      console.error('Error loading data:', error)
      console.error('Error details:', error.response?.data || error.message)
      
      // Only set state if component is still mounted
      if (isMountedRef.current) {
        setJobs([])
      }
    } finally {
      // Only update loading state if component is still mounted
      if (isMountedRef.current && !signal?.aborted) {
        setLoading(false)
        console.log('Loading complete')
      }
    }
  }

  const handleLogout = async () => {
    // Demo mode - just redirect
    navigate('/login')
  }

  // Use useMemo to recalculate stats when jobs change
  const eligibleJobs = useMemo(() => 
    jobs.filter((j) => j.classification === 'green'),
    [jobs]
  )
  const closeJobs = useMemo(() => 
    jobs.filter((j) => j.classification === 'yellow'),
    [jobs]
  )
  const lockedJobs = useMemo(() => 
    jobs.filter((j) => j.classification === 'red'),
    [jobs]
  )

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
              <Link
                to="/resumes"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                My Resumes
              </Link>
              <button
                onClick={() => setShowJobSearch(!showJobSearch)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Search Jobs
              </button>
              <button
                onClick={() => setShowAddJob(!showAddJob)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Add Job Manually
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
            <ResumeUpload onSuccess={() => {
              setShowUpload(false)
              loadData()
            }} />
          </motion.div>
        )}

        {/* Job Search Section */}
        {showJobSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8"
          >
            <JobSearch
              onSuccess={async () => {
                setShowJobSearch(false)
                await reloadData()
              }}
              onCancel={() => setShowJobSearch(false)}
            />
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


        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main */}
          <div className="lg:col-span-9">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="glass p-6 rounded-lg">
                <div className="text-3xl font-bold text-gray-900">{jobs.length}</div>
                <div className="text-sm text-gray-600 mt-1">Jobs</div>
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

            {/* Empty State */}
            {jobs.length === 0 && (
              <div className="glass p-12 rounded-lg text-center">
                <p className="text-gray-600 text-lg mb-4">No jobs found</p>
                <p className="text-gray-500 mb-6">Use the "Search Jobs" button to find jobs by keyword</p>
                <button
                  onClick={() => setShowJobSearch(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Search Jobs
                </button>
              </div>
            )}

            {/* Job Columns */}
            {jobs.length > 0 && (
              <JobColumns
                eligibleJobs={eligibleJobs}
                closeJobs={closeJobs}
                lockedJobs={lockedJobs}
              />
            )}
          </div>

          {/* Sidebar (Ads placeholder - filled after AdSlot is added) */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="glass p-4 rounded-lg">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Sponsored</div>
              <AdSlot
                client=""
                slot=""
                className="w-full"
                minHeightPx={250}
              />
            </div>
            <div className="glass p-4 rounded-lg">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Sponsored</div>
              <AdSlot
                client=""
                slot=""
                className="w-full"
                minHeightPx={250}
              />
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import RoadmapList from '@/components/roadmap/RoadmapList'
import RoadmapMindMap from '@/components/roadmap/RoadmapMindMap'
import RoadmapGamified from '@/components/roadmap/RoadmapGamified'
import EasyApplyForm from '@/components/jobs/EasyApplyForm'
import { motion } from 'framer-motion'

// Component to display formatted resume
function ResumeDisplay({ content }: { content: string }) {
  try {
    const resume = JSON.parse(content)
    
    return (
      <div className="resume-display bg-white p-8 rounded-lg shadow-sm max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{resume.name?.toUpperCase() || ''}</h1>
          <div className="flex justify-center gap-4 text-sm text-gray-600">
            {resume.email && <span>{resume.email}</span>}
            {resume.phone && <span>{resume.phone}</span>}
          </div>
        </div>

        {/* Professional Summary */}
        {resume.summary && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2 uppercase tracking-wide">Professional Summary</h2>
            <p className="text-gray-700 leading-relaxed">{resume.summary}</p>
          </section>
        )}

        {/* Skills */}
        {resume.skills && resume.skills.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2 uppercase tracking-wide">Technical Skills</h2>
            <div className="flex flex-wrap gap-2">
              {resume.skills.map((skill: string, idx: number) => (
                <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Experience */}
        {resume.experience && resume.experience.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 uppercase tracking-wide">Professional Experience</h2>
            {resume.experience.map((exp: any, idx: number) => (
              <div key={idx} className="mb-4 pb-4 border-b last:border-b-0">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{exp.role || 'Not specified'}</h3>
                    <p className="text-gray-600 text-sm">
                      {exp.company || 'Not specified'}
                      {exp.location && ` • ${exp.location}`}
                    </p>
                  </div>
                  {exp.dates && <span className="text-sm text-gray-500">{exp.dates}</span>}
                </div>
                {exp.description && (
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{exp.description}</p>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Projects */}
        {resume.projects && resume.projects.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 uppercase tracking-wide">Projects</h2>
            {resume.projects.map((proj: any, idx: number) => (
              <div key={idx} className="mb-4 pb-4 border-b last:border-b-0">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{proj.name || 'Not specified'}</h3>
                  {proj.url && (
                    <a href={proj.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">
                      View Project
                    </a>
                  )}
                </div>
                {proj.description && (
                  <p className="text-gray-700 text-sm leading-relaxed">{proj.description}</p>
                )}
                {proj.technologies && proj.technologies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {proj.technologies.map((tech: string, techIdx: number) => (
                      <span key={techIdx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Education */}
        {resume.education && resume.education.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 uppercase tracking-wide">Education</h2>
            {resume.education.map((edu: any, idx: number) => (
              <div key={idx} className="mb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {edu.degree || 'Not specified'}
                      {edu.field && ` in ${edu.field}`}
                    </h3>
                    <p className="text-gray-600 text-sm">{edu.institution || 'Not specified'}</p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {edu.dates && <div>{edu.dates}</div>}
                    {edu.gpa && <div>GPA: {edu.gpa}</div>}
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    )
  } catch (e) {
    // Fallback to raw content if JSON parsing fails
    return (
      <div className="whitespace-pre-wrap text-sm text-gray-700">
        {content}
      </div>
    )
  }
}

export default function JobDetail() {
  const { id: jobId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [job, setJob] = useState<any>(null)
  const [match, setMatch] = useState<any>(null)
  const [optimizedResume, setOptimizedResume] = useState<any>(null)
  const [roadmap, setRoadmap] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'resume' | 'roadmap'>('overview')
  const [viewMode, setViewMode] = useState<'list' | 'mindmap' | 'gamified'>('gamified')
  const [generatingResume, setGeneratingResume] = useState(false)
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false)
  const [applicationStatus, setApplicationStatus] = useState<any>(null)
  const [showEasyApply, setShowEasyApply] = useState(false)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    if (jobId) {
      loadJobData()
    }
  }, [jobId])

  const loadJobData = async () => {
    if (!jobId) return
    
    try {
      const [jobRes, matchRes, statusRes, resumesRes] = await Promise.all([
        api.get(`/api/jobs/${jobId}`),
        api.get(`/api/matching/jobs/${jobId}`).catch(() => null),
        api.get(`/api/jobs/${jobId}/application-status`).catch(() => null),
        api.get('/api/resume').catch(() => null), // Get resumes as fallback
      ])

      setJob(jobRes.data)
      if (matchRes) {
        setMatch(matchRes.data)
      } else if (resumesRes?.data && resumesRes.data.length > 0) {
        // If no match but resume exists, create a match-like object
        setMatch({
          resume_id: resumesRes.data[0].id,
          match_score: 0,
          classification: 'red'
        })
      }
      if (statusRes) {
        setApplicationStatus(statusRes.data)
      }
    } catch (error) {
      console.error('Error loading job:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExternalApply = async () => {
    if (!job?.url) return
    
    setApplying(true)
    try {
      const response = await api.post(`/api/applications/external/${jobId}`)
      if (response.data.external_url) {
        window.open(response.data.external_url, '_blank')
      }
      // Reload application status
      const statusRes = await api.get(`/api/jobs/${jobId}/application-status`)
      setApplicationStatus(statusRes.data)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to apply')
    } finally {
      setApplying(false)
    }
  }

  const handleEasyApplySuccess = async () => {
    setShowEasyApply(false)
    // Reload application status
    const statusRes = await api.get(`/api/jobs/${jobId}/application-status`)
    setApplicationStatus(statusRes.data)
  }

  const handleGenerateResume = async () => {
    if (!jobId) {
      alert('Job ID is required')
      return
    }

    setGeneratingResume(true)
    try {
      // Try to get resume_id from match, or let backend auto-select most recent
      const requestData: any = {
        job_id: jobId,
        format: 'json',
      }
      
      // If match has resume_id, use it; otherwise backend will auto-select
      if (match?.resume_id) {
        requestData.resume_id = match.resume_id
      }
      
      const response = await api.post('/api/resume/generate', requestData)
      setOptimizedResume(response.data)
      setActiveTab('resume')
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to generate resume'
      alert(errorMsg)
      console.error('Resume generation error:', error)
    } finally {
      setGeneratingResume(false)
    }
  }

  const handleDownloadResume = async (format: 'pdf' | 'docx') => {
    if (!optimizedResume?.id) {
      await handleGenerateResume()
      return
    }

    try {
      const response = await api.get(
        `/api/resume/generated/${optimizedResume.id}/download?format=${format}`,
        { responseType: 'blob' }
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `optimized_resume.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error: any) {
      alert('Failed to download resume')
    }
  }

  const handleSaveAsNewResume = async () => {
    if (!match?.resume_id || !jobId) {
      alert('Resume and job information required')
      return
    }

    // If resume hasn't been optimized yet, generate it first
    if (!optimizedResume) {
      await handleGenerateResume()
      // Wait a bit for state to update
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    const resumeId = match.resume_id

    try {
      const response = await api.post('/api/resume/save-optimized', {
        resume_id: resumeId,
        job_id: jobId,
        format: 'pdf'
      })

      alert('Optimized resume saved successfully!')
      navigate('/resumes')
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to save resume'
      alert(errorMsg)
      console.error('Save resume error:', error)
    }
  }

  const handleGenerateRoadmap = async () => {
    if (!match?.resume_id || !jobId) {
      alert('Please upload a resume first')
      return
    }

    setGeneratingRoadmap(true)
    try {
      const response = await api.post('/api/roadmap/generate', {
        resume_id: match.resume_id,
        job_id: jobId,
      })
      setRoadmap(response.data)
      setActiveTab('roadmap')
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to generate roadmap')
    } finally {
      setGeneratingRoadmap(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Job not found</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const matchPercentage = match ? Math.round(match.match_score * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="glass border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
          <p className="text-gray-600">{job.company}</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Match Score */}
        {match && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-6 rounded-lg mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Match Score</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Classification: <span className="capitalize">{match.classification}</span>
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-gray-900">{matchPercentage}%</div>
                <div className="text-sm text-gray-600">match</div>
              </div>
            </div>

            {match.missing_skills && match.missing_skills.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Missing Skills:</h3>
                <div className="flex flex-wrap gap-2">
                  {match.missing_skills.map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'resume', 'roadmap'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm capitalize
                  ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Apply Section */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-6 rounded-lg border-2 border-blue-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Apply for this Job</h2>
                    {applicationStatus?.has_applied && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ You have already applied to this job
                        {applicationStatus.application?.status && (
                          <span className="ml-2 capitalize">({applicationStatus.application.status})</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  {job.url && !applicationStatus?.has_applied && (
                    <button
                      onClick={handleExternalApply}
                      disabled={applying}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all font-medium"
                    >
                      {applying ? 'Applying...' : 'External Apply'}
                    </button>
                  )}
                  {!applicationStatus?.has_applied && (
                    <button
                      onClick={() => setShowEasyApply(true)}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium"
                    >
                      Easy Apply
                    </button>
                  )}
                  {applicationStatus?.has_applied && (
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
                    >
                      View Application Status
                    </button>
                  )}
                </div>
              </motion.div>

              {/* Job Description */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass p-6 rounded-lg"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Description</h2>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
              </div>

              {job.required_skills && job.required_skills.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.required_skills.map((skill: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
            </div>
          )}

          {activeTab === 'resume' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {!optimizedResume ? (
                <div className="glass p-8 rounded-lg text-center">
                  <p className="text-gray-600 mb-4">Generate an optimized resume for this job</p>
                  <button
                    onClick={handleGenerateResume}
                    disabled={generatingResume}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {generatingResume ? 'Generating...' : 'Generate Optimized Resume'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Optimized Resume</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/resumes/compare/${jobId}`)}
                        className="px-4 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 text-sm"
                      >
                        Compare Resumes
                      </button>
                      <button
                        onClick={handleSaveAsNewResume}
                        className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm"
                      >
                        Save as New Resume
                      </button>
                      <button
                        onClick={() => handleDownloadResume('pdf')}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                      >
                        Download PDF
                      </button>
                      <button
                        onClick={() => handleDownloadResume('docx')}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                      >
                        Download DOCX
                      </button>
                    </div>
                  </div>
                  <div className="glass p-6 rounded-lg">
                    <ResumeDisplay content={optimizedResume.content} />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'roadmap' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {!roadmap ? (
                <div className="glass p-8 rounded-lg text-center">
                  <p className="text-gray-600 mb-4">Generate a learning roadmap for this job</p>
                  <button
                    onClick={handleGenerateRoadmap}
                    disabled={generatingRoadmap}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {generatingRoadmap ? 'Generating...' : 'Generate Learning Roadmap'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Learning Roadmap</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewMode('gamified')}
                        className={`px-4 py-2 rounded-md text-sm ${
                          viewMode === 'gamified'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        🎮 Gamified
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 rounded-md text-sm ${
                          viewMode === 'list'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        List View
                      </button>
                      <button
                        onClick={() => setViewMode('mindmap')}
                        className={`px-4 py-2 rounded-md text-sm ${
                          viewMode === 'mindmap'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Mind Map
                      </button>
                    </div>
                  </div>
                  {viewMode === 'gamified' ? (
                    <RoadmapGamified roadmapData={roadmap.roadmap_data} />
                  ) : viewMode === 'list' ? (
                    <RoadmapList roadmapData={roadmap.roadmap_data} />
                  ) : (
                    <RoadmapMindMap roadmapData={roadmap.roadmap_data} />
                  )}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </main>

      {/* Easy Apply Modal */}
      {showEasyApply && job && (
        <EasyApplyForm
          jobId={jobId!}
          jobTitle={job.title}
          jobCompany={job.company}
          onSuccess={handleEasyApplySuccess}
          onCancel={() => setShowEasyApply(false)}
        />
      )}
    </div>
  )
}

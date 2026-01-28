'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import RoadmapList from '@/components/roadmap/RoadmapList'
import RoadmapMindMap from '@/components/roadmap/RoadmapMindMap'
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

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string

  const [job, setJob] = useState<any>(null)
  const [match, setMatch] = useState<any>(null)
  const [optimizedResume, setOptimizedResume] = useState<any>(null)
  const [roadmap, setRoadmap] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'resume' | 'roadmap'>('overview')
  const [viewMode, setViewMode] = useState<'list' | 'mindmap'>('list')
  const [generatingResume, setGeneratingResume] = useState(false)
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false)

  useEffect(() => {
    loadJobData()
  }, [jobId])

  const loadJobData = async () => {
    try {
      const [jobRes, matchRes] = await Promise.all([
        api.get(`/api/jobs/${jobId}`),
        api.get(`/api/matching/jobs/${jobId}`).catch(() => null),
      ])

      setJob(jobRes.data)
      if (matchRes) {
        setMatch(matchRes.data)
      }
    } catch (error) {
      console.error('Error loading job:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateResume = async () => {
    if (!match?.resume_id) {
      alert('Please upload a resume first')
      return
    }

    setGeneratingResume(true)
    try {
      const response = await api.post('/api/resume/generate', {
        resume_id: match.resume_id,
        job_id: jobId,
        format: 'json',
      })
      setOptimizedResume(response.data)
      setActiveTab('resume')
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to generate resume')
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

  const handleGenerateRoadmap = async () => {
    if (!match?.resume_id) {
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
            onClick={() => router.push('/dashboard')}
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
            onClick={() => router.push('/dashboard')}
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
                  {viewMode === 'list' ? (
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
    </div>
  )
}

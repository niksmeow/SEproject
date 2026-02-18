import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { motion } from 'framer-motion'

export default function ResumeCompare() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const [originalResume, setOriginalResume] = useState<any>(null)
  const [optimizedResume, setOptimizedResume] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (jobId) {
      loadResumes()
    }
  }, [jobId])

  const loadResumes = async () => {
    try {
      // Get job details to find resume and optimized resume
      await api.get(`/api/jobs/${jobId}`)
      
      // Get user's resumes
      const resumesRes = await api.get('/api/resume')
      if (resumesRes.data && resumesRes.data.length > 0) {
        const firstResume = resumesRes.data[0]
        // Get full resume details
        const resumeDetail = await api.get(`/api/resume/${firstResume.id}`)
        setOriginalResume(resumeDetail.data)
      }

      // Get optimized resume for this job
      try {
        const optimizedRes = await api.get(`/api/resume/generate/generated/job/${jobId}`)
        setOptimizedResume(optimizedRes.data)
      } catch (e) {
        // Optimized resume might not exist yet
        console.log('No optimized resume found')
      }
    } catch (error) {
      console.error('Error loading resumes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadOriginal = async () => {
    if (!originalResume?.id) return
    try {
      const response = await api.get(
        `/api/resume/${originalResume.id}/download`,
        { responseType: 'blob' }
      )
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `original_resume.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Error downloading:', error)
    }
  }

  const handleDownloadOptimized = async (format: 'pdf' | 'docx') => {
    if (!optimizedResume?.id) return
    try {
      const response = await api.get(
        `/api/resume/generate/generated/${optimizedResume.id}/download?format=${format}`,
        { responseType: 'blob' }
      )
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `optimized_resume.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Error downloading:', error)
    }
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
      <header className="glass border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Resume Comparison</h1>
              <p className="text-sm text-gray-600">Compare your original and optimized resumes</p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ← Back
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original Resume */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass p-6 rounded-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Original Resume</h2>
              {originalResume && (
                <button
                  onClick={handleDownloadOriginal}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Download Original
                </button>
              )}
            </div>
            {originalResume ? (
              <div className="space-y-4">
                <ResumeDisplay content={originalResume.parsed_data || {}} isOriginal={true} />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No original resume found
              </div>
            )}
          </motion.div>

          {/* Optimized Resume */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass p-6 rounded-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Optimized Resume</h2>
              {optimizedResume && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadOptimized('pdf')}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Download PDF
                  </button>
                  <button
                    onClick={() => handleDownloadOptimized('docx')}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    Download DOCX
                  </button>
                </div>
              )}
            </div>
            {optimizedResume ? (
              <div className="space-y-4">
                <ResumeDisplay content={optimizedResume.content || ''} isOriginal={false} />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No optimized resume found. Generate one from the job detail page.
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}

// Component to display resume (handles both JSON and parsed data)
function ResumeDisplay({ content, isOriginal: _isOriginal }: { content: any; isOriginal: boolean }) {
  let resume: any = {}

  try {
    if (typeof content === 'string') {
      resume = JSON.parse(content)
    } else {
      resume = content
    }
  } catch (e) {
    return (
      <div className="text-sm text-gray-500">
        Unable to parse resume data
      </div>
    )
  }

  return (
    <div className="resume-display bg-white p-6 rounded-lg shadow-sm">
      {/* Header */}
      <div className="text-center mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {resume.name?.toUpperCase() || 'Not specified'}
        </h1>
        <div className="flex justify-center gap-4 text-sm text-gray-600">
          {resume.email && <span>{resume.email}</span>}
          {resume.phone && <span>{resume.phone}</span>}
        </div>
      </div>

      {/* Professional Summary */}
      {resume.summary && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2 uppercase tracking-wide">
            Professional Summary
          </h2>
          <p className="text-gray-700 leading-relaxed">{resume.summary}</p>
        </section>
      )}

      {/* Skills */}
      {resume.skills && resume.skills.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2 uppercase tracking-wide">
            Technical Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {resume.skills.map((skill: string, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Experience */}
      {resume.experience && resume.experience.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 uppercase tracking-wide">
            Professional Experience
          </h2>
          {resume.experience.map((exp: any, idx: number) => (
            <div key={idx} className="mb-4 pb-4 border-b last:border-b-0">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {exp.role || 'Not specified'}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {exp.company || 'Not specified'}
                    {exp.location && ` • ${exp.location}`}
                  </p>
                </div>
                {exp.dates && (
                  <span className="text-sm text-gray-500">{exp.dates}</span>
                )}
              </div>
              {exp.description && (
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                  {exp.description}
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Projects */}
      {resume.projects && resume.projects.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 uppercase tracking-wide">
            Projects
          </h2>
          {resume.projects.map((proj: any, idx: number) => (
            <div key={idx} className="mb-4 pb-4 border-b last:border-b-0">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900">
                  {proj.name || 'Not specified'}
                </h3>
                {proj.url && (
                  <a
                    href={proj.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 text-sm hover:underline"
                  >
                    View Project
                  </a>
                )}
              </div>
              {proj.description && (
                <p className="text-gray-700 text-sm leading-relaxed">
                  {proj.description}
                </p>
              )}
              {proj.technologies && proj.technologies.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {proj.technologies.map((tech: string, techIdx: number) => (
                    <span
                      key={techIdx}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                    >
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
          <h2 className="text-lg font-semibold text-gray-800 mb-3 uppercase tracking-wide">
            Education
          </h2>
          {resume.education.map((edu: any, idx: number) => (
            <div key={idx} className="mb-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {edu.degree || 'Not specified'}
                    {edu.field && ` in ${edu.field}`}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {edu.institution || 'Not specified'}
                  </p>
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
}

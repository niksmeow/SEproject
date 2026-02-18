import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '@/lib/api'
import { motion } from 'framer-motion'

export default function ResumeView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const resumeId = searchParams.get('id')
  const [originalResume, setOriginalResume] = useState<any>(null)
  const [currentResume, setCurrentResume] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadResumes()
  }, [resumeId])

  const loadResumes = async () => {
    try {
      let targetResumeId = resumeId

      // If no ID provided, get the first resume
      if (!targetResumeId) {
        const resumesRes = await api.get('/api/resume')
        if (resumesRes.data && resumesRes.data.length > 0) {
          targetResumeId = resumesRes.data[0].id
        } else {
          setLoading(false)
          return
        }
      }

      // Get full resume details
      const resumeDetail = await api.get(`/api/resume/${targetResumeId}`)
      
      // Set current resume (modified)
      setCurrentResume(resumeDetail.data)
      
      // Set original resume (from original_parsed_data if available, otherwise use current)
      if (resumeDetail.data.original_parsed_data) {
        setOriginalResume({
          ...resumeDetail.data,
          parsed_data: resumeDetail.data.original_parsed_data
        })
      } else {
        // If no original stored, use current as original (first time)
        setOriginalResume(resumeDetail.data)
      }
    } catch (error) {
      console.error('Error loading resumes:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!originalResume || !currentResume) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No resume found</h2>
          <p className="text-gray-600 mb-6">Please upload a resume first</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const hasChanges = JSON.stringify(originalResume.parsed_data) !== JSON.stringify(currentResume.parsed_data)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Resume Comparison</h1>
              <p className="text-sm text-gray-600 mt-1">Original vs Modified Resume</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!hasChanges && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Your resume hasn't been modified yet. Generate an optimized resume from a job detail page to see changes.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original Resume */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass p-6 rounded-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Original Resume</h2>
            </div>
            <div className="space-y-4">
              <ResumeDisplay content={originalResume.parsed_data || {}} isOriginal={true} />
            </div>
          </motion.div>

          {/* Modified Resume */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass p-6 rounded-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Modified Resume</h2>
              {hasChanges && (
                <span className="px-3 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
                  Updated
                </span>
              )}
            </div>
            <div className="space-y-4">
              <ResumeDisplay content={currentResume.parsed_data || {}} isOriginal={false} />
            </div>
          </motion.div>
        </div>

        {/* Changes Summary */}
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 glass p-6 rounded-lg"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary of Changes</h3>
            <ChangesSummary original={originalResume.parsed_data} current={currentResume.parsed_data} />
          </motion.div>
        )}
      </main>
    </div>
  )
}

// Component to display resume (handles both JSON and parsed data)
function ResumeDisplay({ content, isOriginal: _isOriginal }: { content: any; isOriginal: boolean }) {
  if (!content) {
    return <div className="text-center py-8 text-gray-500">No resume data available</div>
  }

  // Handle string content (JSON string)
  let data = content
  if (typeof content === 'string') {
    try {
      data = JSON.parse(content)
    } catch (e) {
      return <div className="text-gray-500">Invalid resume data format</div>
    }
  }

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      {(data.name || data.email || data.phone) && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">CONTACT INFORMATION</h3>
          {data.name && <p className="text-lg font-bold text-gray-900">{data.name}</p>}
          <div className="mt-1 space-y-1">
            {data.email && <p className="text-sm text-gray-600">{data.email}</p>}
            {data.phone && <p className="text-sm text-gray-600">{data.phone}</p>}
          </div>
        </div>
      )}

      {/* Summary */}
      {data.summary && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">PROFESSIONAL SUMMARY</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{data.summary}</p>
        </div>
      )}

      {/* Skills */}
      {data.skills && Array.isArray(data.skills) && data.skills.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">TECHNICAL SKILLS</h3>
          <div className="flex flex-wrap gap-2">
            {data.skills.map((skill: string, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {data.experience && Array.isArray(data.experience) && data.experience.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">PROFESSIONAL EXPERIENCE</h3>
          <div className="space-y-4">
            {data.experience.map((exp: any, idx: number) => (
              <div key={idx} className="border-l-2 border-gray-200 pl-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{exp.role || 'Not specified'}</p>
                    <p className="text-sm text-gray-600">{exp.company || 'Not specified'}</p>
                  </div>
                  {exp.dates && <p className="text-xs text-gray-500">{exp.dates}</p>}
                </div>
                {exp.description && (
                  <p className="mt-2 text-sm text-gray-700 leading-relaxed">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {data.projects && Array.isArray(data.projects) && data.projects.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">PROJECTS</h3>
          <div className="space-y-3">
            {data.projects.map((proj: any, idx: number) => (
              <div key={idx}>
                <p className="font-semibold text-gray-900">{proj.name || 'Not specified'}</p>
                {proj.description && (
                  <p className="mt-1 text-sm text-gray-700 leading-relaxed">{proj.description}</p>
                )}
                {proj.technologies && Array.isArray(proj.technologies) && proj.technologies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {proj.technologies.map((tech: string, techIdx: number) => (
                      <span
                        key={techIdx}
                        className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {data.education && Array.isArray(data.education) && data.education.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">EDUCATION</h3>
          <div className="space-y-2">
            {data.education.map((edu: any, idx: number) => (
              <div key={idx}>
                <p className="font-semibold text-gray-900">
                  {edu.degree || 'Not specified'}
                  {edu.field && ` in ${edu.field}`}
                </p>
                <p className="text-sm text-gray-600">{edu.institution || 'Not specified'}</p>
                {edu.dates && <p className="text-xs text-gray-500">{edu.dates}</p>}
                {edu.gpa && <p className="text-xs text-gray-500">GPA: {edu.gpa}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Component to show changes summary
function ChangesSummary({ original, current }: { original: any; current: any }) {
  const originalSkills = original?.skills || []
  const currentSkills = current?.skills || []
  const newSkills = currentSkills.filter((s: string) => !originalSkills.includes(s))
  const removedSkills = originalSkills.filter((s: string) => !currentSkills.includes(s))

  return (
    <div className="space-y-4">
      {newSkills.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-green-700 mb-2">✓ New Skills Added</h4>
          <div className="flex flex-wrap gap-2">
            {newSkills.map((skill: string, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {removedSkills.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-red-700 mb-2">✗ Skills Removed</h4>
          <div className="flex flex-wrap gap-2">
            {removedSkills.map((skill: string, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {newSkills.length === 0 && removedSkills.length === 0 && (
        <p className="text-sm text-gray-600">No skill changes detected. Descriptions may have been enhanced.</p>
      )}
    </div>
  )
}

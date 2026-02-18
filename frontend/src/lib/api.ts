// Mock API client - returns mock data instead of making real API calls

// Mock data
const mockResumes = [
  {
    id: '1',
    filename: 'resume.pdf',
    uploaded_at: new Date().toISOString(),
    user_id: 'mock-user',
  },
]

const mockJobs = [
  {
    id: '1',
    title: 'Software Engineer',
    company: 'Tech Corp',
    location: 'San Francisco, CA',
    url: 'https://example.com/job/1',
    description: 'We are looking for a talented software engineer...',
    classification: 'green' as const,
    match_score: 85,
  },
  {
    id: '2',
    title: 'Frontend Developer',
    company: 'Web Inc',
    location: 'Remote',
    url: 'https://example.com/job/2',
    description: 'Join our team as a frontend developer...',
    classification: 'yellow' as const,
    match_score: 65,
  },
]

// Mock API client that mimics axios interface
const api = {
  get: async (url: string, config?: any) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    if (url.includes('/api/resume')) {
      if (url.includes('/api/resume/') && !url.includes('/download') && !url.includes('/generate')) {
        // Get single resume
        return { data: mockResumes[0] }
      }
      if (url.includes('/download')) {
        // Return blob for download
        return { data: new Blob(['mock pdf content'], { type: 'application/pdf' }) }
      }
      return { data: mockResumes }
    }
    
    if (url.includes('/api/jobs')) {
      if (url.includes('/api/jobs/') && !url.includes('/application-status')) {
        // Get single job
        const jobId = url.split('/api/jobs/')[1]?.split('/')[0]
        return { data: mockJobs.find(j => j.id === jobId) || mockJobs[0] }
      }
      return { data: mockJobs }
    }
    
    if (url.includes('/api/matching')) {
      return {
        data: {
          matches: mockJobs.map(job => ({
            job_id: job.id,
            match_score: job.match_score,
            classification: job.classification,
          })),
        },
      }
    }
    
    if (url.includes('/application-status')) {
      return { data: { status: 'not_applied' } }
    }
    
    return { data: [] }
  },
  
  post: async (url: string, data?: any, config?: any) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    if (url.includes('/api/resume/upload')) {
      return { data: { id: 'new-resume-id', ...mockResumes[0] } }
    }
    
    if (url.includes('/api/jobs')) {
      if (url.includes('/discover')) {
        return { data: mockJobs }
      }
      return { data: { id: 'new-job-id', ...mockJobs[0] } }
    }
    
    if (url.includes('/api/matching/match')) {
      return {
        data: {
          matches: (data?.job_ids || []).map((jobId: string) => ({
            job_id: jobId,
            match_score: Math.floor(Math.random() * 100),
            classification: ['green', 'yellow', 'red'][Math.floor(Math.random() * 3)] as 'green' | 'yellow' | 'red',
          })),
        },
      }
    }
    
    if (url.includes('/api/resume/generate')) {
      return {
        data: {
          content: 'Mock optimized resume content...',
          format: data?.format || 'json',
        },
      }
    }
    
    if (url.includes('/api/roadmap/generate')) {
      return {
        data: {
          roadmap: {
            steps: [
              { id: '1', title: 'Learn React', completed: false },
              { id: '2', title: 'Build Projects', completed: false },
            ],
          },
        },
      }
    }
    
    if (url.includes('/api/applications')) {
      return { data: { success: true, external_url: 'https://example.com/apply' } }
    }
    
    return { data: { success: true } }
  },
  
  delete: async (url: string, config?: any) => {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { data: { success: true } }
  },
  
  put: async (url: string, data?: any, config?: any) => {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { data: { success: true } }
  },
}

export default api

import { motion } from 'framer-motion'

interface Skill {
  name: string
  priority: string
  resources: Array<{
    title: string
    url: string
    type: string
  }>
  time_estimate: string
  impact: string
  description?: string
}

interface RoadmapData {
  skills: Skill[]
  total_estimated_time?: string
  expected_match_improvement?: string
}

interface RoadmapListProps {
  roadmapData: RoadmapData
}

export default function RoadmapList({ roadmapData }: RoadmapListProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {roadmapData.skills.map((skill, index) => (
        <motion.div
          key={skill.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="glass p-6 rounded-lg"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{skill.name}</h3>
              {skill.description && (
                <p className="text-sm text-gray-600 mt-1">{skill.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full border ${getPriorityColor(
                  skill.priority
                )}`}
              >
                {skill.priority} priority
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">Time:</span>
              <span>{skill.time_estimate}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">Impact:</span>
              <span className="text-green-600 font-semibold">{skill.impact}</span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Learning Resources:</h4>
            <div className="space-y-2">
              {skill.resources.map((resource, idx) => (
                <a
                  key={idx}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900">{resource.title}</span>
                    <span className="text-xs text-gray-500 capitalize">{resource.type}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </motion.div>
      ))}

      {roadmapData.total_estimated_time && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass p-6 rounded-lg bg-blue-50/50 border-blue-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Estimated Time</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {roadmapData.total_estimated_time}
              </p>
            </div>
            {roadmapData.expected_match_improvement && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Expected Improvement</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {roadmapData.expected_match_improvement}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

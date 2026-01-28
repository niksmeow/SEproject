import { useState, useEffect } from 'react'
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

interface RoadmapGamifiedProps {
  roadmapData: RoadmapData
}

interface SkillProgress {
  skillName: string
  completed: boolean
  progress: number
  resourcesCompleted: number
  totalResources: number
}

export default function RoadmapGamified({ roadmapData }: RoadmapGamifiedProps) {
  const [skillProgress, setSkillProgress] = useState<Map<string, SkillProgress>>(new Map())
  const [totalProgress, setTotalProgress] = useState(0)
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [achievements, setAchievements] = useState<string[]>([])

  // Initialize progress tracking
  useEffect(() => {
    const progressMap = new Map<string, SkillProgress>()
    roadmapData.skills.forEach(skill => {
      const saved = localStorage.getItem(`skill_${skill.name}`)
      if (saved) {
        progressMap.set(skill.name, JSON.parse(saved))
      } else {
        progressMap.set(skill.name, {
          skillName: skill.name,
          completed: false,
          progress: 0,
          resourcesCompleted: 0,
          totalResources: skill.resources.length
        })
      }
    })
    setSkillProgress(progressMap)
    updateTotalProgress(progressMap)
  }, [roadmapData])

  const updateTotalProgress = (progressMap: Map<string, SkillProgress>) => {
    let total = 0
    let completed = 0
    progressMap.forEach(progress => {
      total += progress.totalResources
      completed += progress.resourcesCompleted
    })
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    setTotalProgress(percentage)
    
    // Calculate XP and level
    const newXp = completed * 10
    setXp(newXp)
    const newLevel = Math.floor(newXp / 100) + 1
    setLevel(newLevel)
    
    // Check achievements
    checkAchievements(completed, progressMap)
  }

  const checkAchievements = (completed: number, progressMap: Map<string, SkillProgress>) => {
    const newAchievements: string[] = []
    
    if (completed >= 1 && !achievements.includes('first_step')) {
      newAchievements.push('first_step')
    }
    if (completed >= 5 && !achievements.includes('learner')) {
      newAchievements.push('learner')
    }
    if (completed >= 10 && !achievements.includes('dedicated')) {
      newAchievements.push('dedicated')
    }
    
    let highPriorityCompleted = 0
    progressMap.forEach(progress => {
      const skill = roadmapData.skills.find(s => s.name === progress.skillName)
      if (skill?.priority === 'high' && progress.completed) {
        highPriorityCompleted++
      }
    })
    if (highPriorityCompleted >= 2 && !achievements.includes('priority_master')) {
      newAchievements.push('priority_master')
    }
    
    if (newAchievements.length > 0) {
      setAchievements([...achievements, ...newAchievements])
    }
  }

  const markResourceComplete = (skillName: string, resourceIndex: number) => {
    const progress = skillProgress.get(skillName)
    if (!progress) return

    const newProgress: SkillProgress = {
      ...progress,
      resourcesCompleted: Math.min(progress.resourcesCompleted + 1, progress.totalResources),
      progress: Math.min(
        ((progress.resourcesCompleted + 1) / progress.totalResources) * 100,
        100
      ),
      completed: progress.resourcesCompleted + 1 >= progress.totalResources
    }

    const updated = new Map(skillProgress)
    updated.set(skillName, newProgress)
    setSkillProgress(updated)
    
    // Save to localStorage
    localStorage.setItem(`skill_${skillName}`, JSON.stringify(newProgress))
    
    updateTotalProgress(updated)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return { bg: 'bg-red-500', border: 'border-red-600', text: 'text-red-800', light: 'bg-red-50' }
      case 'medium':
        return { bg: 'bg-yellow-500', border: 'border-yellow-600', text: 'text-yellow-800', light: 'bg-yellow-50' }
      case 'low':
        return { bg: 'bg-green-500', border: 'border-green-600', text: 'text-green-800', light: 'bg-green-50' }
      default:
        return { bg: 'bg-gray-500', border: 'border-gray-600', text: 'text-gray-800', light: 'bg-gray-50' }
    }
  }

  const getAchievementName = (id: string) => {
    const names: Record<string, string> = {
      'first_step': 'First Steps',
      'learner': 'Dedicated Learner',
      'dedicated': 'Knowledge Seeker',
      'priority_master': 'Priority Master'
    }
    return names[id] || id
  }

  return (
    <div className="space-y-6">
      {/* Progress Dashboard */}
      <div className="glass p-6 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">Level {level}</div>
            <div className="text-sm text-gray-600 mt-1">Career Level</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{xp} XP</div>
            <div className="text-sm text-gray-600 mt-1">Experience Points</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{totalProgress}%</div>
            <div className="text-sm text-gray-600 mt-1">Overall Progress</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <motion.div
                className="bg-green-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${totalProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{achievements.length}</div>
            <div className="text-sm text-gray-600 mt-1">Achievements</div>
          </div>
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="text-sm font-semibold text-gray-700 mb-2">🏆 Achievements Unlocked:</div>
            <div className="flex flex-wrap gap-2">
              {achievements.map(achievement => (
                <motion.div
                  key={achievement}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium"
                >
                  {getAchievementName(achievement)}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Skills Roadmap */}
      <div className="space-y-4">
        {roadmapData.skills.map((skill, index) => {
          const progress = skillProgress.get(skill.name) || {
            skillName: skill.name,
            completed: false,
            progress: 0,
            resourcesCompleted: 0,
            totalResources: skill.resources.length
          }
          const colors = getPriorityColor(skill.priority)
          const isCompleted = progress.completed

          return (
            <motion.div
              key={skill.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`glass p-6 rounded-lg border-2 ${isCompleted ? 'border-green-400 bg-green-50/50' : colors.border}`}
            >
              {/* Skill Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center text-white font-bold text-lg`}>
                      {isCompleted ? '✓' : index + 1}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{skill.name}</h3>
                      {skill.description && (
                        <p className="text-sm text-gray-600 mt-1">{skill.description}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full border ${colors.text} ${colors.light}`}>
                    {skill.priority} priority
                  </span>
                  {isCompleted && (
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-300">
                      ✓ Completed
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-semibold text-gray-900">
                    {progress.resourcesCompleted}/{progress.totalResources} resources
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <motion.div
                    className={`h-3 rounded-full ${colors.bg}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">⏱️ Time:</span>
                  <span className="font-medium text-gray-900">{skill.time_estimate}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">📈 Impact:</span>
                  <span className="font-semibold text-green-600">{skill.impact}</span>
                </div>
              </div>

              {/* Learning Resources */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Learning Resources:</h4>
                <div className="space-y-2">
                  {skill.resources.map((resource, idx) => {
                    const isResourceCompleted = progress.resourcesCompleted > idx
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`p-3 rounded-md border-2 transition-all ${
                          isResourceCompleted
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <button
                              onClick={() => markResourceComplete(skill.name, idx)}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                isResourceCompleted
                                  ? 'bg-green-500 border-green-600 text-white'
                                  : 'border-gray-300 hover:border-green-500'
                              }`}
                            >
                              {isResourceCompleted && '✓'}
                            </button>
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-sm text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              {resource.title}
                            </a>
                          </div>
                          <span className="text-xs text-gray-500 capitalize px-2 py-1 bg-white rounded">
                            {resource.type}
                          </span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Summary Card */}
      {roadmapData.total_estimated_time && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass p-6 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200"
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

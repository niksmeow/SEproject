'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

interface JobCardProps {
  job: {
    id: string
    title: string
    company: string
    match_score?: number
    classification: 'green' | 'yellow' | 'red'
  }
}

export default function JobCard({ job }: JobCardProps) {
  const getClassificationColor = () => {
    switch (job.classification) {
      case 'green':
        return 'border-green-200 bg-green-50/50'
      case 'yellow':
        return 'border-yellow-200 bg-yellow-50/50'
      case 'red':
        return 'border-red-200 bg-red-50/50'
      default:
        return 'border-gray-200 bg-white/50'
    }
  }

  const getMatchPercentage = () => {
    if (job.match_score !== undefined) {
      return Math.round(job.match_score * 100)
    }
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link href={`/jobs/${job.id}`}>
        <div className={`glass p-4 rounded-lg cursor-pointer hover:shadow-lg transition-all duration-300 ${getClassificationColor()}`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{job.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{job.company}</p>
            </div>
            {getMatchPercentage() !== null && (
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {getMatchPercentage()}%
                </div>
                <div className="text-xs text-gray-500">match</div>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center text-xs text-gray-500">
            <span className="capitalize">{job.classification}</span>
            <span className="mx-2">•</span>
            <span>View details →</span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

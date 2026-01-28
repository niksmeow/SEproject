'use client'

import { motion } from 'framer-motion'
import JobCard from './JobCard'

interface Job {
  id: string
  title: string
  company: string
  match_score?: number
  classification: 'green' | 'yellow' | 'red'
}

interface JobColumnsProps {
  eligibleJobs: Job[]
  closeJobs: Job[]
  lockedJobs: Job[]
}

export default function JobColumns({ eligibleJobs, closeJobs, lockedJobs }: JobColumnsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      {/* Eligible Jobs */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Eligible</h2>
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            {eligibleJobs.length}
          </span>
        </div>
        <div className="space-y-3 min-h-[400px]">
          {eligibleJobs.length > 0 ? (
            eligibleJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))
          ) : (
            <div className="glass p-8 rounded-lg text-center text-gray-500">
              <p>No eligible jobs yet</p>
              <p className="text-sm mt-2">Upload a resume and add jobs to get started</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Close Jobs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Close</h2>
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            {closeJobs.length}
          </span>
        </div>
        <div className="space-y-3 min-h-[400px]">
          {closeJobs.length > 0 ? (
            closeJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))
          ) : (
            <div className="glass p-8 rounded-lg text-center text-gray-500">
              <p>No close matches yet</p>
              <p className="text-sm mt-2">These jobs need some skill development</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Locked Jobs */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Locked</h2>
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            {lockedJobs.length}
          </span>
        </div>
        <div className="space-y-3 min-h-[400px]">
          {lockedJobs.length > 0 ? (
            lockedJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))
          ) : (
            <div className="glass p-8 rounded-lg text-center text-gray-500">
              <p>No locked jobs yet</p>
              <p className="text-sm mt-2">These jobs require significant upskilling</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
